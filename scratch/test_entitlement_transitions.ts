import { hasAccessTo, runEntitlementAudit, CatalogData } from "../src/lib/entitlementEngine";

// --- Mocks ---
const mockSupabaseClient = (mockDbPurchases: { product_id: string }[]): any => {
  return {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (col: string, val: any) => ({
          eq: (col2: string, val2: any) => {
            if (table === 'user_purchases') {
              return Promise.resolve({ data: mockDbPurchases, error: null });
            }
            return Promise.resolve({ data: [], error: null });
          }
        })
      })
    }),
    auth: {
      updateUser: async (payload: any) => {
        console.log('[Mock Supabase Auth] updateUser called with payload:', JSON.stringify(payload));
        return { data: { user: {} }, error: null };
      }
    }
  };
};

async function runTests() {
  console.log('=== STARTING ENTITLEMENT SYSTEM TESTING ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // MOCK CATALOG DATA
  const catalog: CatalogData = {
    exams: [
      { id: 'exam-ops-2026', name: 'OPSC OAS', description: 'OPSC Exam' },
      { id: 'exam-ossc-2026', name: 'OSSC CGL', description: 'OSSC Exam' }
    ],
    mockTests: [
      { id: 'test-m1', seriesId: 'series-s1', title: 'OSSC Math Mock 1', isPremium: true, examId: 'exam-ossc-2026' },
      { id: 'test-m2', seriesId: '{\\"examId\\":\\"exam-ops-2026\\",\\"isPremium\\":true}', title: 'OPSC History Mock 2' },
      { id: 'test-m3', seriesId: 'series-s2', title: 'OPSC Free Mock 3', isPremium: false, examId: 'exam-ops-2026' }
    ],
    questionBanks: [
      { id: 'bank-b1', examId: 'exam-ossc-2026', title: 'OSSC Odia Bank', isPremium: true },
      { id: 'bank-b2', examId: 'exam-ops-2026', title: 'OPSC Polity Bank', isPremium: false }
    ],
    testSeries: [
      { id: 'series-s1', examId: 'exam-ossc-2026', title: 'OSSC CGL Test Series' },
      { id: 'series-s2', examId: 'exam-ops-2026', title: 'OPSC OAS Test Series' }
    ]
  };

  // -------------------------------------------------------------
  // Test Case 1: Paid -> Free Pricing Transition
  // -------------------------------------------------------------
  {
    const profile = { role: 'user', hasFullAccess: false, purchasedSeries: [] };
    const freeMock = { id: 'test-m1', isPremium: false, examId: 'exam-ossc-2026' }; // Changed to free
    assert(
      hasAccessTo(profile, freeMock) === true,
      'Paid -> Free Transition: Free products are accessible to everyone, even without purchase entitlements.'
    );
  }

  // -------------------------------------------------------------
  // Test Case 2: Free -> Paid Transition + Bundle Inheritance
  // -------------------------------------------------------------
  {
    // User purchased OSSC Exam Bundle
    const profile = { role: 'user', hasFullAccess: false, purchasedSeries: ['exam_bundle_exam-ossc-2026'] };
    // A mock test inside OSSC was free, now admin changes it to Paid (isPremium = true)
    const transitionedTest = { id: 'test-m1', isPremium: true, examId: 'exam-ossc-2026' };
    
    assert(
      hasAccessTo(profile, transitionedTest) === true,
      'Bundle Inheritance: User owning parent Exam Bundle retains access to a child product that transitions from Free -> Paid.'
    );
  }

  // -------------------------------------------------------------
  // Test Case 3: Test Series Bundle Access
  // -------------------------------------------------------------
  {
    // User purchased Test Series 'series-s1'
    const profile = { role: 'user', hasFullAccess: false, purchasedSeries: ['series-s1'] };
    const mockTestInSeries = { id: 'test-m1', seriesId: 'series-s1', isPremium: true, examId: 'exam-ossc-2026' };
    const mockTestNotInSeries = { id: 'test-m2', seriesId: 'series-s2', isPremium: true };

    assert(
      hasAccessTo(profile, mockTestInSeries) === true,
      'Test Series Inheritance: User owning Test Series has access to mock tests inside that series.'
    );
    assert(
      hasAccessTo(profile, mockTestNotInSeries) === false,
      'Test Series Inheritance: User does NOT have access to mock tests outside their purchased series.'
    );
  }

  // -------------------------------------------------------------
  // Test Case 4: Explicit Ownership vs Full Access
  // -------------------------------------------------------------
  {
    const profilePaidDirect = { role: 'user', hasFullAccess: false, purchasedSeries: ['test-m1'] };
    const profileFullAccess = { role: 'user', hasFullAccess: true, purchasedSeries: [] };
    const profileAdmin = { role: 'admin', hasFullAccess: false, purchasedSeries: [] };
    const testItem = { id: 'test-m1', isPremium: true };

    assert(hasAccessTo(profilePaidDirect, testItem) === true, 'Explicit direct purchase grants access.');
    assert(hasAccessTo(profileFullAccess, testItem) === true, 'Full access entitlement grants access.');
    assert(hasAccessTo(profileAdmin, testItem) === true, 'Admin role grants access.');
  }

  // -------------------------------------------------------------
  // Test Case 5: Proactive Auditing & Self-Healing (Ledger sync)
  // -------------------------------------------------------------
  {
    const profile = { role: 'user', hasFullAccess: false, purchasedSeries: ['series-s1'] };
    // Ledger has series-s1 and exam_bundle_exam-ops-2026 (cache is missing exam bundle)
    const ledger = [{ product_id: 'series-s1' }, { product_id: 'exam_bundle_exam-ops-2026' }];
    const supabase = mockSupabaseClient(ledger);

    const auditResult = await runEntitlementAudit(supabase, 'user-123', profile, catalog);
    
    assert(
      auditResult?.status === 'HEALED',
      'Audit Ledger Sync: Out-of-sync database ledger triggers metadata self-healing.'
    );
    assert(
      auditResult?.addedFromDb.includes('exam_bundle_exam-ops-2026') === true,
      'Audit Ledger Sync: Missing ledger entitlements are correctly resolved and added.'
    );
  }

  // -------------------------------------------------------------
  // Test Case 6: Proactive Auditing & Self-Healing (Deduplication)
  // -------------------------------------------------------------
  {
    // User metadata has exam bundle OSSC, but also has duplicate individual entitlements for OSSC test and bank.
    // In addition, user metadata has OPSC series which is redundant since they also bought OPSC exam bundle.
    const profile = {
      role: 'user',
      hasFullAccess: false,
      purchasedSeries: [
        'exam_bundle_exam-ossc-2026',
        'test-m1', // redundant (belongs to OSSC CGL exam-ossc-2026)
        'bank-b1', // redundant (belongs to OSSC CGL exam-ossc-2026)
        'exam_bundle_exam-ops-2026',
        'series-s2' // redundant (belongs to OPSC OAS exam-ops-2026)
      ]
    };
    const ledger = profile.purchasedSeries.map(id => ({ product_id: id }));
    const supabase = mockSupabaseClient(ledger);

    const auditResult = await runEntitlementAudit(supabase, 'user-123', profile, catalog);

    assert(
      auditResult?.status === 'HEALED',
      'Audit Deduplication: Redundant duplicate entitlements trigger metadata self-healing.'
    );
    assert(
      auditResult?.deduplicated.includes('test-m1') === true &&
      auditResult?.deduplicated.includes('bank-b1') === true &&
      auditResult?.deduplicated.includes('series-s2') === true,
      'Audit Deduplication: Redundant mock tests, question banks, and test series are successfully resolved.'
    );
    assert(
      auditResult?.finalList.length === 2 &&
      auditResult.finalList.includes('exam_bundle_exam-ossc-2026') &&
      auditResult.finalList.includes('exam_bundle_exam-ops-2026'),
      'Audit Deduplication: Final cleaned list contains only the necessary non-redundant parent bundles.'
    );
  }

  console.log(`\n=== TEST RUN COMPLETED ===`);
  console.log(`PASSED: ${passed} / ${passed + failed}`);
  console.log(`FAILED: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
