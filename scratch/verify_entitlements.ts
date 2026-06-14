import { resolveUserEntitlements } from '../src/lib/entitlementManager.ts';

// Mock catalog representing active items in the database
const catalog = {
  exams: [
    { id: 'exam_1', name: 'OPSC OAS' },
    { id: 'exam_2', name: 'OSSC CGL' }
  ],
  mockTests: [
    { id: 'test_1', examId: 'exam_1', title: 'OAS Full Test 1', isPremium: true },
    { id: 'test_2', examId: 'exam_1', title: 'OAS Full Test 2', isPremium: true },
    { id: 'test_3', examId: 'exam_2', title: 'CGL Sectional 1', isPremium: true }
  ],
  testSeries: [
    { id: 'series_1', examId: 'exam_1', title: 'OAS Test Series', price: 499 }
  ],
  questionBanks: [
    { id: 'bank_1', examId: 'exam_1', title: 'OAS Question Bank', isPremium: true }
  ]
};

console.log("=== Starting Entitlement Registry Verification ===\n");

// Test Case 1: Existing user with simple purchasedSeries array but no purchaseRecords (Backfilling)
console.log("Test Case 1: Verify auto-backfilling of purchase records for historical users...");
const purchasedSeries1 = ['exam_bundle_exam_1', 'bank_1'];
const purchaseRecords1: any[] = [];

const result1 = resolveUserEntitlements(purchasedSeries1, purchaseRecords1, catalog);

console.log("Generated purchase records count:", result1.updatedRecords.length);
console.log("Needs update:", result1.needsUpdate);
console.log("Resolved Entitlements IDs:", Array.from(result1.resolvedIds));
if (result1.needsUpdate && result1.updatedRecords.length === 2) {
  console.log("✅ Passed: Synthetic purchase records were backfilled successfully!");
} else {
  console.log("❌ Failed: Synthetic purchase records backfilling failed.");
}
console.log("");

// Test Case 2: New premium item added under already purchased exam bundle (Dynamic Inheritance)
console.log("Test Case 2: Verify that adding new premium content automatically grants access to bundle owners...");
// We simulate adding a new mock test 'test_new' to 'exam_1'
const updatedCatalog2 = {
  ...catalog,
  mockTests: [
    ...catalog.mockTests,
    { id: 'test_new', examId: 'exam_1', title: 'OAS Added Test', isPremium: true }
  ]
};

const result2 = resolveUserEntitlements(purchasedSeries1, result1.updatedRecords, updatedCatalog2);
console.log("Resolved Entitlements contains 'test_new':", result2.resolvedIds.has('test_new'));
if (result2.resolvedIds.has('test_new')) {
  console.log("✅ Passed: Bundle owners automatically receive access to newly added content!");
} else {
  console.log("❌ Failed: Dynamic content inheritance failed.");
}
console.log("");

// Test Case 3: Reorganization Protection (Child item moved/reorganized)
console.log("Test Case 3: Verify reorganization protection (child item moved to a different exam/bundle)...");
// We move 'test_1' from 'exam_1' to 'exam_2' in the catalog.
// The user purchased 'exam_bundle_exam_1' when 'test_1' was part of it.
// The user's purchase records contains 'test_1' inside its `grantedEntitlements`.
const updatedCatalog3 = {
  ...catalog,
  mockTests: catalog.mockTests.map(t => t.id === 'test_1' ? { ...t, examId: 'exam_2' } : t)
};

const result3 = resolveUserEntitlements(purchasedSeries1, result1.updatedRecords, updatedCatalog3);
console.log("Resolved Entitlements contains 'test_1' (reorganized):", result3.resolvedIds.has('test_1'));
if (result3.resolvedIds.has('test_1')) {
  console.log("✅ Passed: User retains access to the reorganized item due to historical snapshot!");
} else {
  console.log("❌ Failed: Reorganization protection failed.");
}
console.log("");

// Test Case 4: Administrative Revocation
console.log("Test Case 4: Verify administrative revocation aligns purchase records...");
// User purchased only bank_1
const purchasedSeries4 = ['bank_1'];
const result4_init = resolveUserEntitlements(purchasedSeries4, [], catalog);

// Admin revokes access to 'bank_1' by filtering it out from purchasedSeries
const revokedPurchasedSeries = []; // bank_1 removed
const result4 = resolveUserEntitlements(revokedPurchasedSeries, result4_init.updatedRecords, catalog);

console.log("Needs update after revocation:", result4.needsUpdate);
console.log("Updated records count:", result4.updatedRecords.length);
console.log("Resolved Entitlements contains 'bank_1':", result4.resolvedIds.has('bank_1'));
if (!result4.resolvedIds.has('bank_1') && result4.updatedRecords.length === 0) {
  console.log("✅ Passed: Administrative revocation successfully syncs purchase records and revokes access!");
} else {
  console.log("❌ Failed: Administrative revocation failed.");
}
console.log("\n=== Entitlement Registry Verification Complete ===");
