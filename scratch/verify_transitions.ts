import { resolveUserEntitlements, HISTORICAL_BUNDLE_COMPOSITIONS } from '../src/lib/entitlementManager.ts';

console.log("=== Starting Entitlement Transition & Access Consistency Tests ===\n");

// Setup catalog
const catalog = {
  exams: [
    { id: 'civil-services', name: 'Civil Services Exam' },
    { id: 'opsc-aio', name: 'OPSC AIO' }
  ],
  mockTests: [
    { id: 'test_cs_1', examId: 'civil-services', title: 'CS mock 1', isPremium: false }, // starts free
    { id: 'test_cs_2', examId: 'civil-services', title: 'CS mock 2', isPremium: true },
    { id: 'test_opsc_old', examId: 'other-exam', title: 'Old OPSC mock', isPremium: true }, // moved and premium
    { id: 'test_free_1', examId: 'opsc-aio', title: 'Free Test', isPremium: false }
  ],
  testSeries: [],
  questionBanks: [
    { id: 'bank_free', examId: 'opsc-aio', title: 'Free Bank', isPremium: false, questionCount: 10, tagline: 'Free' },
    { id: 'bank_premium', examId: 'opsc-aio', title: 'Premium Bank', isPremium: true, questionCount: 10, tagline: 'Paid' }
  ]
};

// Register historical composition
HISTORICAL_BUNDLE_COMPOSITIONS['opsc-aio'] = ['test_opsc_old'];

// Test Case 1: Free Product Auto-Resolution (Rule D)
console.log("Test Case 1: Verifying free products are automatically resolved for guests...");
const guestResult = resolveUserEntitlements([], [], catalog);
const guestAccess = guestResult.resolvedIds;

const hasFreeTest = guestAccess.has('test_free_1');
const hasFreeBank = guestAccess.has('bank_free');
const hasPremiumTest = guestAccess.has('test_cs_2');
const hasPremiumBank = guestAccess.has('bank_premium');

console.log("Guest has access to free test:", hasFreeTest);
console.log("Guest has access to free bank:", hasFreeBank);
console.log("Guest has access to premium test (should be false):", hasPremiumTest);
console.log("Guest has access to premium bank (should be false):", hasPremiumBank);

if (hasFreeTest && hasFreeBank && !hasPremiumTest && !hasPremiumBank) {
  console.log("✅ Passed: Guest automatically gets access to free items only.");
} else {
  console.error("❌ Failed: Free product auto-resolution failed.");
  process.exit(1);
}
console.log("");

// Test Case 2: Paid -> Free Transition
console.log("Test Case 2: Verifying Paid -> Free transition preserves purchase records...");
// User A purchased test_cs_2 when it was Paid.
const initialRecords = [
  {
    purchaseId: 'p_1',
    itemId: 'test_cs_2',
    itemType: 'mock_test' as const,
    purchasedAt: new Date().toISOString(),
    pricePaid: 99,
    grantedEntitlements: ['test_cs_2']
  }
];
// Now admin makes test_cs_2 free in catalog
const catalogWithFreeCs2 = {
  ...catalog,
  mockTests: catalog.mockTests.map(t => t.id === 'test_cs_2' ? { ...t, isPremium: false } : t)
};

const userAResult = resolveUserEntitlements(['test_cs_2'], initialRecords, catalogWithFreeCs2);
console.log("Purchase records count after transition (should be 1):", userAResult.updatedRecords.length);
console.log("Purchase record preserved item ID:", userAResult.updatedRecords[0].itemId);
console.log("User retains access to test_cs_2:", userAResult.resolvedIds.has('test_cs_2'));

if (userAResult.updatedRecords.length === 1 && userAResult.updatedRecords[0].itemId === 'test_cs_2' && userAResult.resolvedIds.has('test_cs_2')) {
  console.log("✅ Passed: Paid -> Free transition keeps user purchases intact and active.");
} else {
  console.error("❌ Failed: Paid -> Free transition failed.");
  process.exit(1);
}
console.log("");

// Test Case 3: Free -> Paid Transition (with Bundle Inheritance)
console.log("Test Case 3: Verifying Free -> Paid transition with Bundle Inheritance...");
// User B purchased exam_bundle_civil-services.
// Now, catalog changes test_cs_1 from Free to Paid.
const catalogWithPaidCs1 = {
  ...catalog,
  mockTests: catalog.mockTests.map(t => t.id === 'test_cs_1' ? { ...t, isPremium: true } : t)
};

const userBResult = resolveUserEntitlements(
  ['exam_bundle_civil-services'],
  [],
  catalogWithPaidCs1
);

const userBHasAccessToCs1 = userBResult.resolvedIds.has('test_cs_1');
console.log("User B has access to transitioned test_cs_1:", userBHasAccessToCs1);

if (userBHasAccessToCs1) {
  console.log("✅ Passed: Bundle owner automatically inherits access to transitioned paid child items.");
} else {
  console.error("❌ Failed: Bundle inheritance rule failed.");
  process.exit(1);
}
console.log("");

// Test Case 4: Reorganization and Pricing Change (Historical Composition)
console.log("Test Case 4: Verifying reorganization and pricing transition for legacy users...");
// Legacy User C has only purchasedSeries with 'exam_bundle_opsc-aio' and no purchase records.
// test_opsc_old was moved out of opsc-aio exam and changed from Free to Paid.
// But HISTORICAL_BUNDLE_COMPOSITIONS maps it to opsc-aio.
const userCResult = resolveUserEntitlements(
  ['exam_bundle_opsc-aio'],
  [],
  catalog
);

console.log("Generated synthetic record count:", userCResult.updatedRecords.length);
const synthRecord = userCResult.updatedRecords[0];
console.log("Synthetic record itemId:", synthRecord.itemId);
console.log("Synthetic record grantedEntitlements includes 'test_opsc_old':", synthRecord.grantedEntitlements.includes('test_opsc_old'));
console.log("User C has access to test_opsc_old:", userCResult.resolvedIds.has('test_opsc_old'));

if (
  userCResult.updatedRecords.length === 1 &&
  synthRecord.grantedEntitlements.includes('test_opsc_old') &&
  userCResult.resolvedIds.has('test_opsc_old')
) {
  console.log("✅ Passed: Historical composition mappings and synthetic records resolve reorganized products correctly.");
} else {
  console.error("❌ Failed: Historical composition resolution failed.");
  process.exit(1);
}
console.log("");

// Test Case 5: Entitlement Auditor Self-Healing
console.log("Test Case 5: Verifying Entitlement Auditor self-healing logic...");
// User has purchase record for test_cs_2 but purchasedSeries is empty due to a sync glitch.
const glitchRecords = [
  {
    purchaseId: 'p_2',
    itemId: 'test_cs_2',
    itemType: 'mock_test' as const,
    purchasedAt: new Date().toISOString(),
    pricePaid: 99,
    grantedEntitlements: ['test_cs_2']
  }
];
const healedResult = resolveUserEntitlements([], glitchRecords, catalog);

console.log("Needs Update:", healedResult.needsUpdate);
console.log("Healed purchasedSeries contains 'test_cs_2':", healedResult.updatedSeries.includes('test_cs_2'));
console.log("User has access to test_cs_2:", healedResult.resolvedIds.has('test_cs_2'));

if (healedResult.needsUpdate && healedResult.updatedSeries.includes('test_cs_2') && healedResult.resolvedIds.has('test_cs_2')) {
  console.log("✅ Passed: Entitlement Auditor successfully restored the glitched purchase into active purchasedSeries!");
} else {
  console.error("❌ Failed: Entitlement Auditor self-healing failed.");
  process.exit(1);
}
console.log("");

// Test Case 6: Revoked Purchase Record
console.log("Test Case 6: Verifying revoked purchase records do not grant access or self-heal...");
const revokedRecords = [
  {
    purchaseId: 'p_3',
    itemId: 'test_cs_2',
    itemType: 'mock_test' as const,
    purchasedAt: new Date().toISOString(),
    pricePaid: 99,
    grantedEntitlements: ['test_cs_2'],
    revoked: true // explicitly marked revoked
  }
];
const revokedResult = resolveUserEntitlements([], revokedRecords, catalog);

console.log("Healed purchasedSeries contains 'test_cs_2' (should be false):", revokedResult.updatedSeries.includes('test_cs_2'));
console.log("User has access to test_cs_2 (should be false):", revokedResult.resolvedIds.has('test_cs_2'));

if (!revokedResult.updatedSeries.includes('test_cs_2') && !revokedResult.resolvedIds.has('test_cs_2')) {
  console.log("✅ Passed: Revoked purchase record correctly bypassed and blocked.");
} else {
  console.error("❌ Failed: Revoked purchase safety check failed.");
  process.exit(1);
}

console.log("\n=== All Entitlement Transition & Consistency Tests Passed! ===");
