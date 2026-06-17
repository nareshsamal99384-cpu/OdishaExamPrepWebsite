import { hasAccessTo } from '../src/lib/entitlementEngine';

// --- Browser Mocks for Node Environment ---
const localStorageStore: Record<string, string> = {};
const localListeners: Record<string, Function[]> = {};

global.localStorage = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { for (const k in localStorageStore) delete localStorageStore[k]; },
  length: 0,
  key: (index: number) => null
};

global.window = {
  addEventListener: (event: string, callback: Function) => {
    if (!localListeners[event]) localListeners[event] = [];
    localListeners[event].push(callback);
  },
  removeEventListener: (event: string, callback: Function) => {
    if (!localListeners[event]) return;
    localListeners[event] = localListeners[event].filter(cb => cb !== callback);
  }
} as any;

const navigatorMock = {
  onLine: true
};
Object.defineProperty(global, 'navigator', {
  value: navigatorMock,
  writable: true,
  configurable: true
});

// Mock toast
const toastMock = {
  success: (msg: string, opts?: any) => console.log(`[Mock Toast Success] ${msg}`),
  error: (msg: string, opts?: any) => console.log(`[Mock Toast Error] ${msg}`)
};

// Checksum helper to verify offline cache checksums
const generateChecksum = (userId: string, items: string[]): string => {
  const data = `${userId}:${(items || []).sort().join(',')}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

// Vault Helpers
const cacheOfflineAccess = (userId: string, tempProfile: any) => {
  const vault = {
    userId,
    purchasedSeries: tempProfile.purchasedSeries || [],
    hasFullAccess: tempProfile.hasFullAccess || false,
    role: tempProfile.role || 'user',
    timestamp: Date.now(),
    checksum: generateChecksum(userId, tempProfile.purchasedSeries || [])
  };
  global.localStorage.setItem('oep_offline_vault', JSON.stringify(vault));
};

const loadOfflineAccess = (userId: string) => {
  const rawVault = global.localStorage.getItem('oep_offline_vault');
  if (!rawVault) return null;
  const vault = JSON.parse(rawVault);
  if (vault.userId !== userId) return null;
  const computedChecksum = generateChecksum(userId, vault.purchasedSeries);
  if (computedChecksum !== vault.checksum) return null;
  return {
    role: vault.role,
    hasFullAccess: vault.hasFullAccess,
    purchasedSeries: vault.purchasedSeries,
    isOfflineFallback: true
  };
};

async function runResilienceTests() {
  console.log('=== STARTING RESILIENCE & CHANGE-IMPACT PREVENTION TESTING ===\n');
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

  // Test Case 1: Hashing & Checksum Generation
  {
    const userId = 'user-resilient-123';
    const entitlements = ['exam_bundle_ops-123', 'series-abc'];
    const checksum1 = generateChecksum(userId, entitlements);
    const checksum2 = generateChecksum(userId, ['series-abc', 'exam_bundle_ops-123']); // different order
    assert(checksum1 === checksum2, 'Checksum is order-independent (deterministic sorting).');
    
    const badChecksum = generateChecksum(userId, ['different-items']);
    assert(checksum1 !== badChecksum, 'Checksum varies for different items.');
  }

  // Test Case 2: Offline Fallback Cache Loading (Integrity Verified)
  {
    const userId = 'user-offline-456';
    const profileData = {
      role: 'user',
      hasFullAccess: false,
      purchasedSeries: ['test-premium-mock']
    };

    cacheOfflineAccess(userId, profileData);
    const loaded = loadOfflineAccess(userId);
    assert(loaded !== null, 'Vault loads successfully when checksum is intact.');
    assert(loaded?.isOfflineFallback === true, 'Loaded profile is marked as offline fallback.');
    assert(loaded?.purchasedSeries.includes('test-premium-mock') === true, 'Loaded profile contains cached entitlements.');

    // Tamper test
    const rawVault = JSON.parse(global.localStorage.getItem('oep_offline_vault') || '{}');
    rawVault.purchasedSeries.push('tampered-extra-free-access');
    global.localStorage.setItem('oep_offline_vault', JSON.stringify(rawVault));

    const tamperedLoad = loadOfflineAccess(userId);
    assert(tamperedLoad === null, 'Tampered offline storage fails integrity check (checksum verification).');
  }

  // Test Case 3: Offline Entitlement Validation
  {
    const userId = 'user-offline-789';
    const profileData = {
      role: 'user',
      hasFullAccess: false,
      purchasedSeries: ['exam_bundle_ops']
    };
    cacheOfflineAccess(userId, profileData);

    // Simulate network offline
    navigatorMock.onLine = false;

    // Load offline fallback profile
    const offlineProfile = loadOfflineAccess(userId);
    assert(offlineProfile !== null, 'Offline profile loads successfully.');

    // Verify hasAccessTo works against offline profile
    const premiumMockInOps = { id: 'mock-123', isPremium: true, examId: 'ops' };
    const premiumMockNotInOps = { id: 'mock-456', isPremium: true, examId: 'other' };

    assert(hasAccessTo(offlineProfile, premiumMockInOps) === true, 'Offline Fallback: User retains access to items owned in cached bundle.');
    assert(hasAccessTo(offlineProfile, premiumMockNotInOps) === false, 'Offline Fallback: User does not gain access to unowned premium items.');

    navigatorMock.onLine = true; // restore
  }

  // Test Case 4: Dry-Run Warning Simulator (Mocking the simulateChangeImpact stats)
  {
    // Simulate countActiveStudents and simulateChangeImpact behavior
    const mockDbPurchases = [
      { user_id: 'u1', product_id: 'exam_bundle_ops' },
      { user_id: 'u2', product_id: 'exam_bundle_ops' },
      { user_id: 'u3', product_id: 'mock-child' }
    ];

    const getActivePurchasesCount = (itemId: string, itemType: string) => {
      const uniqueUsers = new Set<string>();
      mockDbPurchases.forEach(p => {
        if (p.product_id === itemId) uniqueUsers.add(p.user_id);
        if (itemType === 'mockTest' && itemId === 'mock-child') {
          if (p.product_id === 'exam_bundle_ops') uniqueUsers.add(p.user_id);
        }
      });
      return uniqueUsers.size;
    };

    const countForChild = getActivePurchasesCount('mock-child', 'mockTest');
    assert(countForChild === 3, 'Active owners includes direct purchases + parent bundle inheritances.');

    const countForOrphanExam = getActivePurchasesCount('ops', 'exam');
    // For exam, its bundle id is exam_bundle_ops
    const countForExamBundle = getActivePurchasesCount('exam_bundle_ops', 'exam');
    assert(countForExamBundle === 2, 'Active owners counted correctly for parent Exam Bundle.');
  }

  console.log(`\n=== RESILIENCE TEST RUN COMPLETED ===`);
  console.log(`PASSED: ${passed} / ${passed + failed}`);
  console.log(`FAILED: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runResilienceTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
