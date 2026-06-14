
export interface PurchaseRecord {
  purchaseId: string;
  itemId: string; // e.g. exam_bundle_civil_services, test_series_1, mock_test_1, etc.
  itemType: 'exam_bundle' | 'test_series' | 'mock_test' | 'question_bank';
  purchasedAt: string;
  pricePaid: number;
  originalExamId?: string;
  originalSeriesId?: string;
  grantedEntitlements: string[]; // List of IDs granted at purchase time
  revoked?: boolean; // True if administratively refunded/revoked
  paymentId?: string; // Razorpay payment ID
  orderId?: string; // Razorpay order ID
}

export interface Catalog {
  exams: any[];
  mockTests: any[];
  testSeries: any[];
  questionBanks: any[];
}

export const HISTORICAL_BUNDLE_COMPOSITIONS: Record<string, string[]> = {};

export interface EntitlementResolutionResult {
  resolvedIds: Set<string>;
  updatedRecords: PurchaseRecord[];
  updatedSeries: string[];
  needsUpdate: boolean;
}

/**
 * Resolves user entitlements, handles auto-backfilling of purchase records,
 * and synchronizes user metadata.
 */
export function resolveUserEntitlements(
  purchasedSeries: string[] | undefined,
  purchaseRecords: PurchaseRecord[] | undefined,
  catalog: Catalog
): EntitlementResolutionResult {
  const activePurchased = purchasedSeries || [];
  const activeRecords = purchaseRecords || [];
  const resolvedIds = new Set<string>();

  // Helper to parse series config from mock test stringified seriesId
  const getExamIdFromMockTest = (test: any): string | null => {
    if (test.examId) return test.examId;
    let seriesData = test.seriesId;
    if (typeof seriesData === 'string' && seriesData.startsWith('{')) {
      try {
        seriesData = JSON.parse(seriesData);
      } catch (e) {}
    }
    if (seriesData && typeof seriesData === 'object') {
      return seriesData.examId || null;
    }
    return null;
  };

  // 1. Entitlement Auditor: Self-Heal from missing array references.
  // If the user has a valid purchase record (not revoked), but it is missing
  // from purchasedSeries, we auto-restore it to protect ownership.
  const restoredSeries = [...activePurchased];
  let seriesUpdated = false;

  activeRecords.forEach(rec => {
    if (!rec.revoked && !restoredSeries.includes(rec.itemId)) {
      restoredSeries.push(rec.itemId);
      seriesUpdated = true;
    }
  });

  // A record is considered revoked if its itemId is no longer present in restoredSeries or explicitly revoked.
  const purchasedSet = new Set(restoredSeries);
  const activeAndNotRevoked = activeRecords.filter(rec => purchasedSet.has(rec.itemId) && !rec.revoked);

  // De-duplicate purchase records by paymentId and orderId to prevent duplicate transaction entries
  const seenPayments = new Set<string>();
  const seenOrders = new Set<string>();
  const filteredRecords: PurchaseRecord[] = [];

  activeAndNotRevoked.forEach(rec => {
    if (rec.paymentId) {
      if (seenPayments.has(rec.paymentId)) {
        return; // skip duplicate payment ID
      }
      seenPayments.add(rec.paymentId);
    }
    if (rec.orderId) {
      if (seenOrders.has(rec.orderId)) {
        return; // skip duplicate order ID
      }
      seenOrders.add(rec.orderId);
    }
    filteredRecords.push(rec);
  });

  let needsUpdate = filteredRecords.length !== activeRecords.length || seriesUpdated;

  const recordsMap = new Map<string, PurchaseRecord>();
  filteredRecords.forEach(rec => recordsMap.set(rec.itemId, rec));

  const finalRecords = [...filteredRecords];

  // 2. Identify which items in restoredSeries are missing structured purchase records.
  // We will auto-backfill them using the current catalog.
  restoredSeries.forEach(itemId => {
    if (!recordsMap.has(itemId)) {
      // Create a synthetic purchase record
      let itemType: 'exam_bundle' | 'test_series' | 'mock_test' | 'question_bank' = 'mock_test';
      let originalExamId: string | undefined = undefined;
      let originalSeriesId: string | undefined = undefined;
      const grantedEntitlements = [itemId];

      if (itemId.startsWith('exam_bundle_')) {
        itemType = 'exam_bundle';
        const examId = itemId.replace('exam_bundle_', '');
        originalExamId = examId;
        
        // Find all child products currently under this exam
        catalog.mockTests.forEach(t => {
          const testExamId = getExamIdFromMockTest(t);
          if (t.examId === examId || testExamId === examId || (typeof t.seriesId === 'string' && t.seriesId.includes(examId))) {
            grantedEntitlements.push(t.id);
          }
        });
        catalog.questionBanks.forEach(b => {
          if (b.examId === examId) {
            grantedEntitlements.push(b.id);
          }
        });
        catalog.testSeries.forEach(s => {
          if (s.examId === examId) {
            grantedEntitlements.push(s.id);
          }
        });

        // Append historical composition IDs to ensure legacy consistency
        const historical = HISTORICAL_BUNDLE_COMPOSITIONS[examId] || [];
        historical.forEach(hId => {
          if (!grantedEntitlements.includes(hId)) {
            grantedEntitlements.push(hId);
          }
        });
      } else {
        // Find item in questionBanks
        const bank = catalog.questionBanks.find(b => b.id === itemId);
        if (bank) {
          itemType = 'question_bank';
          originalExamId = bank.examId;
        } else {
          // Find item in testSeries
          const series = catalog.testSeries.find(s => s.id === itemId);
          if (series) {
            itemType = 'test_series';
            originalExamId = series.examId;
            catalog.mockTests.forEach(t => {
              if (t.seriesId === itemId) {
                grantedEntitlements.push(t.id);
              }
            });
          } else {
            // Find item in mockTests
            const test = catalog.mockTests.find(t => t.id === itemId);
            if (test) {
              itemType = 'mock_test';
              originalSeriesId = typeof test.seriesId === 'string' ? test.seriesId : undefined;
              originalExamId = getExamIdFromMockTest(test) || undefined;
            }
          }
        }
      }

      const newRecord: PurchaseRecord = {
        purchaseId: `synth_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
        itemId,
        itemType,
        purchasedAt: new Date().toISOString(),
        pricePaid: 0,
        originalExamId,
        originalSeriesId,
        grantedEntitlements
      };

      finalRecords.push(newRecord);
      needsUpdate = true;
    }
  });

  // 3. Resolve active entitlements (both current and historical).
  // Rule A: Directly owned IDs
  restoredSeries.forEach(id => resolvedIds.add(id));

  // Rule B: Entitlements granted by purchase records (historical preservation)
  finalRecords.forEach(rec => {
    resolvedIds.add(rec.itemId);
    rec.grantedEntitlements.forEach(id => resolvedIds.add(id));
  });

  // Rule C: Dynamic Inheritance from the current catalog
  // If user owns an exam bundle, they inherit access to all current child items
  const currentBundles = Array.from(resolvedIds).filter(id => id.startsWith('exam_bundle_'));
  currentBundles.forEach(bundleId => {
    const examId = bundleId.replace('exam_bundle_', '');
    
    // Grant current child mock tests
    catalog.mockTests.forEach(t => {
      const testExamId = getExamIdFromMockTest(t);
      if (t.examId === examId || testExamId === examId || (typeof t.seriesId === 'string' && t.seriesId.includes(examId))) {
        resolvedIds.add(t.id);
      }
    });
    // Grant current child question banks
    catalog.questionBanks.forEach(b => {
      if (b.examId === examId) {
        resolvedIds.add(b.id);
      }
    });
    // Grant current child test series
    catalog.testSeries.forEach(s => {
      if (s.examId === examId) {
        resolvedIds.add(s.id);
      }
    });
  });

  // If user owns a test series, they inherit access to all current mock tests under it
  const currentSeries = Array.from(resolvedIds).filter(id => catalog.testSeries.some(s => s.id === id));
  currentSeries.forEach(seriesId => {
    catalog.mockTests.forEach(t => {
      if (t.seriesId === seriesId) {
        resolvedIds.add(t.id);
      }
    });
  });

  // Rule D: Free products are automatically resolved as accessible for all users
  catalog.mockTests.forEach(t => {
    let isPremium = t.isPremium ?? false;
    let seriesData = t.seriesId;
    if (typeof seriesData === 'string' && seriesData.startsWith('{')) {
      try {
        const parsed = JSON.parse(seriesData);
        isPremium = parsed.isPremium ?? isPremium;
      } catch (e) {}
    }
    if (!isPremium) {
      resolvedIds.add(t.id);
    }
  });
  catalog.questionBanks.forEach(b => {
    if (!b.isPremium) {
      resolvedIds.add(b.id);
    }
  });

  return {
    resolvedIds,
    updatedRecords: finalRecords,
    updatedSeries: restoredSeries,
    needsUpdate
  };
}

/**
 * Validates the database/catalog for entitlement conflicts, e.g. duplicate IDs or mismatched hierarchies.
 */
export function validateCatalogEntitlements(catalog: Catalog): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  // Check for duplicate IDs across different types
  const addAndCheckId = (id: string, type: string) => {
    if (!id) return;
    if (seenIds.has(id)) {
      errors.push(`Conflict: ID "${id}" is used by multiple items in the catalog (detected in ${type}).`);
    }
    seenIds.add(id);
  };

  catalog.exams.forEach(e => addAndCheckId(e.id, 'exams'));
  catalog.testSeries.forEach(s => addAndCheckId(s.id, 'testSeries'));
  catalog.mockTests.forEach(t => addAndCheckId(t.id, 'mockTests'));
  catalog.questionBanks.forEach(b => addAndCheckId(b.id, 'questionBanks'));

  // Check that mock tests have valid seriesId or examId
  catalog.mockTests.forEach(t => {
    let hasValidParent = false;
    if (t.examId && catalog.exams.some(e => e.id === t.examId)) {
      hasValidParent = true;
    }
    if (t.seriesId && typeof t.seriesId === 'string') {
      if (t.seriesId.startsWith('{')) {
        try {
          const parsed = JSON.parse(t.seriesId);
          if (parsed.examId && catalog.exams.some(e => e.id === parsed.examId)) {
            hasValidParent = true;
          }
        } catch (e) {}
      } else if (catalog.testSeries.some(s => s.id === t.seriesId)) {
        hasValidParent = true;
      }
    }
    if (!hasValidParent) {
      errors.push(`Mismatched Parent: Mock Test "${t.title}" (${t.id}) is not linked to any valid active exam or test series.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
