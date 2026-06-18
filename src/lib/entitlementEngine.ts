import { SupabaseClient } from '@supabase/supabase-js';

export interface CatalogData {
  exams: any[];
  mockTests: any[];
  questionBanks: any[];
  testSeries: any[];
}

/**
 * Evaluates whether a user has access to a specific premium digital product.
 * Supports direct purchases, exam bundle inheritance, and test series inheritance.
 * Handles pricing transitions dynamically (free items are always accessible).
 * 
 * @param profile The user profile object containing purchasedSeries and permissions.
 * @param itemOrId The product ID (string) or the item object containing id, isPremium, examId, and seriesId.
 * @param examId Optional backup exam ID.
 * @returns boolean true if user has access, false otherwise.
 */
export const hasAccessTo = (
  profile: any,
  itemOrId: string | { id: string; isPremium?: boolean; examId?: string; seriesId?: string | any },
  examId?: string
): boolean => {
  // 1. Admin or full access bypass
  if (profile?.role === 'admin' || profile?.hasFullAccess === true) {
    return true;
  }

  let itemId = '';
  let itemIsPremium = true; // default to true (secured) if not specified
  let itemExamId = examId;
  let itemSeriesId: string | undefined = undefined;

  // 2. Parse input details
  if (typeof itemOrId === 'string') {
    itemId = itemOrId;
  } else if (itemOrId && typeof itemOrId === 'object') {
    itemId = itemOrId.id;
    itemIsPremium = itemOrId.isPremium ?? true;
    itemExamId = itemOrId.examId || itemExamId;

    // Handle seriesId mapping (uuid vs JSON string)
    if (typeof itemOrId.seriesId === 'string') {
      if (itemOrId.seriesId.startsWith('{')) {
        try {
          const parsed = JSON.parse(itemOrId.seriesId);
          itemIsPremium = parsed.isPremium ?? itemIsPremium;
          itemExamId = parsed.examId || itemExamId;
        } catch (e) {}
      } else {
        itemSeriesId = itemOrId.seriesId;
      }
    } else if (itemOrId.seriesId && typeof itemOrId.seriesId === 'object') {
      itemIsPremium = itemOrId.seriesId.isPremium ?? itemIsPremium;
      itemExamId = itemOrId.seriesId.examId || itemExamId;
    }
  }

  // 3. Paid -> Free transition: Free items are accessible to everyone
  if (!itemIsPremium) {
    return true;
  }

  const purchased = profile?.purchasedSeries || [];

  // 4. Check explicit ownership
  if (purchased.includes(itemId)) {
    return true;
  }

  // 5. Check bundle inheritance rules: Exam Bundle access
  if (itemExamId && purchased.includes(`exam_bundle_${itemExamId}`)) {
    return true;
  }

  // 6. Check bundle inheritance rules: Test Series access
  if (itemSeriesId && purchased.includes(itemSeriesId)) {
    return true;
  }

  return false;
};

/**
 * Audits a user's entitlements, reconciles client metadata cache with the DB ledger,
 * resolves duplicate/redundant purchases, and handles pricing transitions.
 */
export const runEntitlementAudit = async (
  supabase: SupabaseClient,
  userId: string,
  profile: any,
  catalog?: CatalogData
) => {
  if (!userId || !profile) return null;

  try {
    // 1. Fetch DB ledger entitlements
    const { data: dbPurchases, error: dbErr } = await supabase
      .from('user_purchases')
      .select('product_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (dbErr) {
      console.error('[Entitlement Audit] Failed to query user_purchases ledger:', dbErr);
      return null;
    }

    const dbProductIds = (dbPurchases || []).map(p => p.product_id);
    const metaProductIds = profile.purchasedSeries || [];

    // 2. Resolve or fetch catalog data if not supplied
    let activeCatalog: CatalogData;
    if (catalog) {
      activeCatalog = catalog;
    } else {
      const [exRes, mtRes, qbRes, tsRes] = await Promise.all([
        supabase.from('exams').select('id, name, description, category'),
        supabase.from('mockTests').select('id, seriesId'),
        supabase.from('questionBanks').select('id, examId, tagline, isPremium'),
        supabase.from('testSeries').select('id, examId')
      ]);
      activeCatalog = {
        exams: exRes.data || [],
        mockTests: mtRes.data || [],
        questionBanks: qbRes.data || [],
        testSeries: tsRes.data || []
      };
    }

    // 3. Ledger-to-Cache Sync: find items in DB ledger missing from metadata cache
    const missingInMeta = dbProductIds.filter(id => !metaProductIds.includes(id));

    // 4. Compute Redundant Entitlements
    // If a user owns an Exam Bundle or Test Series, they do not need individual item IDs in the metadata cache.
    const resolvedMetadataIds = new Set<string>(metaProductIds);
    const examBundlesOwned = new Set<string>();
    const testSeriesOwned = new Set<string>();

    metaProductIds.forEach((id: string) => {
      if (id.startsWith('exam_bundle_')) {
        examBundlesOwned.add(id.replace('exam_bundle_', ''));
      } else {
        const isSeries = activeCatalog.testSeries?.some(s => s.id === id);
        if (isSeries) {
          testSeriesOwned.add(id);
        }
      }
    });

    const redundantIds: string[] = [];
    const activeCatalogTests = activeCatalog.mockTests || [];
    const activeCatalogBanks = activeCatalog.questionBanks || [];
    const activeCatalogSeries = activeCatalog.testSeries || [];

    metaProductIds.forEach((id: string) => {
      if (id.startsWith('exam_bundle_')) return;
      
      if (testSeriesOwned.has(id)) {
        // Test series is redundant if user owns the parent exam bundle
        const seriesObj = activeCatalogSeries.find(s => s.id === id);
        if (seriesObj && seriesObj.examId && examBundlesOwned.has(seriesObj.examId)) {
          redundantIds.push(id);
        }
        return;
      }

      // Check if mock test is redundant
      const testObj = activeCatalogTests.find(t => t.id === id);
      if (testObj) {
        let testExamId = testObj.examId;
        let testSeriesId = testObj.seriesId;
        if (typeof testSeriesId === 'string' && testSeriesId.startsWith('{')) {
          try {
            const parsed = JSON.parse(testSeriesId);
            testExamId = parsed.examId || testExamId;
            testSeriesId = undefined;
          } catch (e) {}
        }
        
        if (testExamId && examBundlesOwned.has(testExamId)) {
          redundantIds.push(id);
        } else if (testSeriesId && testSeriesOwned.has(testSeriesId)) {
          redundantIds.push(id);
        }
        return;
      }

      // Check if question bank is redundant
      const bankObj = activeCatalogBanks.find(b => b.id === id);
      if (bankObj) {
        if (bankObj.examId && examBundlesOwned.has(bankObj.examId)) {
          redundantIds.push(id);
        }
        return;
      }
    });

    // 5. Form final metadata cache
    const deduplicatedProductIds = metaProductIds.filter(id => !redundantIds.includes(id));
    const finalProductIds = Array.from(new Set([...deduplicatedProductIds, ...missingInMeta]));

    // 6. Apply self-healing sync if out-of-sync
    // Only write to Supabase Auth user metadata if there are actual missing items from the DB ledger.
    // We do not execute updateUser write calls just to remove redundant items, as this can trigger rate limits.
    const needsUpdate = missingInMeta.length > 0;

    if (needsUpdate) {
      console.log(`[Entitlement Audit] Self-Healing User Metadata. Redundant removed: ${redundantIds.length}, DB added: ${missingInMeta.length}`);
      const isFullAccess = profile.hasFullAccess || finalProductIds.includes('full_access');
      
      const { error: syncError } = await supabase.auth.updateUser({
        data: {
          purchasedSeries: finalProductIds,
          hasFullAccess: isFullAccess
        }
      });
      if (syncError) {
        console.error('[Entitlement Audit] Sync failed:', syncError);
      }
      return {
        status: 'HEALED',
        deduplicated: redundantIds,
        addedFromDb: missingInMeta,
        finalList: finalProductIds
      };
    }

    // Console logs in development to proactively monitor integrity
    console.log(
      `%c[Entitlement Audit] Status: HEALTHY · Active Entitlements: ${finalProductIds.length} · Redundant: ${redundantIds.length} · Inherited verified`,
      'color: #059669; font-weight: bold; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;'
    );

    return {
      status: 'HEALTHY',
      deduplicated: [],
      addedFromDb: [],
      finalList: metaProductIds
    };
  } catch (err) {
    console.error('[Entitlement Audit] Error during execution:', err);
    return null;
  }
};

export interface CatalogAnomaly {
  type: 'ORPHANED_PREMIUM' | 'PRICING_MISMATCH' | 'BROKEN_REFERENCE';
  severity: 'high' | 'medium' | 'low';
  itemType: 'mockTest' | 'questionBank' | 'testSeries' | 'exam';
  itemId: string;
  itemTitle: string;
  message: string;
}

/**
 * Scans the database catalog for access anomalies and configuration loops.
 */
export const auditCatalogIntegrity = (catalog: CatalogData): CatalogAnomaly[] => {
  const anomalies: CatalogAnomaly[] = [];
  const examIds = new Set((catalog.exams || []).map(e => e.id));
  const seriesIds = new Set((catalog.testSeries || []).map(s => s.id));

  // 1. Audit Mock Tests
  (catalog.mockTests || []).forEach(test => {
    let testExamId = test.examId || '';
    let testSeriesId = '';
    let isPremium = test.isPremium ?? false;

    if (typeof test.seriesId === 'string') {
      if (test.seriesId.startsWith('{')) {
        try {
          const parsed = JSON.parse(test.seriesId);
          testExamId = parsed.examId || testExamId;
          isPremium = parsed.isPremium ?? isPremium;
        } catch (e) {}
      } else {
        testSeriesId = test.seriesId;
      }
    } else if (test.seriesId && typeof test.seriesId === 'object') {
      testExamId = test.seriesId.examId || testExamId;
      isPremium = test.seriesId.isPremium ?? isPremium;
    }

    // Check broken exam reference
    if (testExamId && !examIds.has(testExamId)) {
      anomalies.push({
        type: 'BROKEN_REFERENCE',
        severity: 'high',
        itemType: 'mockTest',
        itemId: test.id,
        itemTitle: test.title,
        message: `Mock test references non-existent Exam ID "${testExamId}".`
      });
    }

    // Check broken test series reference
    if (testSeriesId && !seriesIds.has(testSeriesId)) {
      anomalies.push({
        type: 'BROKEN_REFERENCE',
        severity: 'high',
        itemType: 'mockTest',
        itemId: test.id,
        itemTitle: test.title,
        message: `Mock test references non-existent Test Series ID "${testSeriesId}".`
      });
    }

    // Check orphaned premium test (premium but not linked to any exam or series)
    if (isPremium && !testExamId && !testSeriesId) {
      anomalies.push({
        type: 'ORPHANED_PREMIUM',
        severity: 'medium',
        itemType: 'mockTest',
        itemId: test.id,
        itemTitle: test.title,
        message: `Premium mock test is orphaned (not linked to any Exam or Test Series). Students cannot purchase this.`
      });
    }

    // Check pricing mismatch: mock test inside series is premium, but the series itself is free (price = 0)
    if (testSeriesId && isPremium) {
      const parentSeries = (catalog.testSeries || []).find(s => s.id === testSeriesId);
      if (parentSeries && (parentSeries.price === undefined || Number(parentSeries.price) === 0)) {
        anomalies.push({
          type: 'PRICING_MISMATCH',
          severity: 'medium',
          itemType: 'mockTest',
          itemId: test.id,
          itemTitle: test.title,
          message: `Premium mock test resides inside a Free Test Series "${parentSeries.title}". Students might access it for free or encounter payment blocks.`
        });
      }
    }
  });

  // 2. Audit Question Banks
  (catalog.questionBanks || []).forEach(bank => {
    // Check broken exam reference
    if (bank.examId && !examIds.has(bank.examId)) {
      anomalies.push({
        type: 'BROKEN_REFERENCE',
        severity: 'high',
        itemType: 'questionBank',
        itemId: bank.id,
        itemTitle: bank.title,
        message: `Question bank references non-existent Exam ID "${bank.examId}".`
      });
    }

    // Check orphaned premium question bank
    if (bank.isPremium && !bank.examId) {
      anomalies.push({
        type: 'ORPHANED_PREMIUM',
        severity: 'medium',
        itemType: 'questionBank',
        itemId: bank.id,
        itemTitle: bank.title,
        message: `Premium question bank is not associated with any Exam, preventing purchase bundles.`
      });
    }
  });

  // 3. Audit Test Series
  (catalog.testSeries || []).forEach(series => {
    if (series.examId && !examIds.has(series.examId)) {
      anomalies.push({
        type: 'BROKEN_REFERENCE',
        severity: 'high',
        itemType: 'testSeries',
        itemId: series.id,
        itemTitle: series.title,
        message: `Test series references non-existent Exam ID "${series.examId}".`
      });
    }
  });

  return anomalies;
};
