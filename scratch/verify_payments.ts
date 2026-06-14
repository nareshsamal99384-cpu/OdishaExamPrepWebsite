import { resolveUserEntitlements, HISTORICAL_BUNDLE_COMPOSITIONS } from '../src/lib/entitlementManager.ts';

console.log("=== Starting Payment Integrity & Transaction Reliability Tests ===\n");

// Mock catalog for pricing lookups
const catalog = {
  exams: [
    { id: 'civil-services', name: 'Civil Services Exam', description: 'JSON_METADATA_{"price":299,"originalPrice":599,"description":"State Civil Services"}' },
    { id: 'opsc-aio', name: 'OPSC AIO', description: 'Simple text description (not premium)' }
  ],
  mockTests: [
    { id: 'test_1', examId: 'civil-services', seriesId: '{"isPremium":true,"price":99,"examId":"civil-services"}', title: 'Mock Test 1' },
    { id: 'test_2', examId: 'civil-services', seriesId: 'ts-123', title: 'Mock Test 2' } // linked to test series
  ],
  testSeries: [
    { id: 'ts-123', examId: 'civil-services', price: 199, title: 'CS Series 1' }
  ],
  questionBanks: [
    { id: 'bank_1', examId: 'civil-services', title: 'CS bank 1', tagline: '{"text":"Premium Bank","price":149}' },
    { id: 'bank_2', examId: 'civil-services', title: 'CS bank 2', tagline: 'Simple tagline' }
  ]
};

// 1. Test Price Verification Resolution Mock
console.log("Test Case 1: Simulating server-side price verification helper...");
function mockGetItemPriceSecurely(itemId: string): number {
  if (itemId === 'site_wide_full_access') return 999;
  
  if (itemId.startsWith('exam_bundle_')) {
    const examId = itemId.replace('exam_bundle_', '');
    const exam = catalog.exams.find(e => e.id === examId);
    if (!exam) throw new Error("Not found");
    if (exam.description.startsWith('JSON_METADATA_')) {
      const meta = JSON.parse(exam.description.replace('JSON_METADATA_', ''));
      return meta.price || 499;
    }
    return 499;
  }

  const bank = catalog.questionBanks.find(b => b.id === itemId);
  if (bank) {
    if (bank.tagline.includes('{"text"')) {
      const parsed = JSON.parse(bank.tagline);
      return parsed.price || 499;
    }
    return 499;
  }

  const series = catalog.testSeries.find(s => s.id === itemId);
  if (series) return series.price || 499;

  const test = catalog.mockTests.find(t => t.id === itemId);
  if (test) {
    if (test.seriesId.startsWith('{')) {
      const parsed = JSON.parse(test.seriesId);
      return parsed.price || 499;
    }
    const parentSeries = catalog.testSeries.find(s => s.id === test.seriesId);
    if (parentSeries) return parentSeries.price || 499;
    return 499;
  }
  
  throw new Error("Item not found");
}

const p1 = mockGetItemPriceSecurely('exam_bundle_civil-services');
const p2 = mockGetItemPriceSecurely('bank_1');
const p3 = mockGetItemPriceSecurely('ts-123');
const p4 = mockGetItemPriceSecurely('test_1');
const p5 = mockGetItemPriceSecurely('test_2');

console.log("Exam Bundle Price (expected 299):", p1);
console.log("Question Bank Price (expected 149):", p2);
console.log("Test Series Price (expected 199):", p3);
console.log("Mock Test 1 Price (expected 99):", p4);
console.log("Mock Test 2 Price (expected 199):", p5);

if (p1 === 299 && p2 === 149 && p3 === 199 && p4 === 99 && p5 === 199) {
  console.log("✅ Passed: Server-side pricing lookup correctly parsed database layouts!");
} else {
  console.error("❌ Failed: Server-side pricing lookup simulation failed.");
  process.exit(1);
}
console.log("");

// 2. Test Transaction De-duplication
console.log("Test Case 2: Verifying transaction de-duplication in resolver...");
const duplicateRecords = [
  {
    purchaseId: 'pay_123',
    itemId: 'test_1',
    itemType: 'mock_test' as const,
    purchasedAt: new Date().toISOString(),
    pricePaid: 99,
    paymentId: 'pay_id_abc',
    orderId: 'order_id_xyz',
    grantedEntitlements: ['test_1']
  },
  {
    purchaseId: 'pay_456',
    itemId: 'test_1', // duplicate purchase of same item
    itemType: 'mock_test' as const,
    purchasedAt: new Date().toISOString(),
    pricePaid: 99,
    paymentId: 'pay_id_abc', // duplicate payment ID
    orderId: 'order_id_xyz', // duplicate order ID
    grantedEntitlements: ['test_1']
  }
];

const result = resolveUserEntitlements(['test_1'], duplicateRecords, catalog);
console.log("De-duplicated records count (expected 1):", result.updatedRecords.length);
console.log("Needs Update (expected true):", result.needsUpdate);

if (result.updatedRecords.length === 1 && result.needsUpdate) {
  console.log("✅ Passed: Duplicate payment transaction records successfully filtered out!");
} else {
  console.error("❌ Failed: Duplicate transaction filter failed.");
  process.exit(1);
}

console.log("\n=== All Payment Integrity & Reliability Tests Passed! ===");
