// --- Payment Integrity & Financial Protection Unit Tests ---

// Mock Supabase Admin Client
const mockSupabaseAdmin = {
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (col: string, val: any) => {
        const result: any = {
          single: () => {
            if (table === 'exams' && val === 'exam-ops') {
              return Promise.resolve({ data: { description: 'JSON_METADATA_{"price":499,"originalPrice":999}' }, error: null });
            }
            if (table === 'testSeries' && val === 'series-abc') {
              return Promise.resolve({ data: { price: 299 }, error: null });
            }
            if (table === 'mockTests' && val === 'test-123') {
              return Promise.resolve({ data: { seriesId: '{"isPremium":true,"price":199}' }, error: null });
            }
            if (table === 'questionBanks' && val === 'bank-456') {
              return Promise.resolve({ data: { isPremium: true, tagline: '{"text":"Premium Q-Bank","price":99}' }, error: null });
            }
            return Promise.resolve({ data: null, error: new Error('not found') });
          },
          then: (resolve: any) => {
            if (table === 'user_purchases' && col === 'razorpay_payment_id' && val === 'pay_duplicate') {
              resolve({ data: [{ user_id: 'u1', product_id: 'prod-1' }], error: null });
            } else {
              resolve({ data: [], error: null });
            }
          }
        };
        return result;
      }
    })
  })
} as any;

// Official Price Resolver (extracted from server.ts for isolated verification)
const getProductPrice = async (productId: string, productType: string, supabaseAdmin: any): Promise<number> => {
  if (productId === 'full_access') {
    return 999;
  }

  if (productType === 'exam_bundle' || productType === 'exam' || productId.startsWith('exam_bundle_')) {
    const examId = productId.replace('exam_bundle_', '');
    const { data: exam, error } = await supabaseAdmin
      .from('exams')
      .select('description')
      .eq('id', examId)
      .single();

    if (error || !exam) {
      throw new Error(`Exam bundle not found: ${examId}`);
    }

    if ((exam.description || '').startsWith('JSON_METADATA_')) {
      try {
        const meta = JSON.parse(exam.description.replace('JSON_METADATA_', ''));
        return Number(meta.price) || 499;
      } catch (e) {
        throw new Error('Failed to parse exam metadata');
      }
    }
    throw new Error('Exam is not premium');
  }

  if (productType === 'test_series' || productType === 'series') {
    const { data: series, error } = await supabaseAdmin
      .from('testSeries')
      .select('price')
      .eq('id', productId)
      .single();

    if (error || !series) {
      throw new Error(`Test Series not found: ${productId}`);
    }
    return Number(series.price) || 499;
  }

  if (productType === 'mock_test' || productType === 'mockTest') {
    const { data: test, error } = await supabaseAdmin
      .from('mockTests')
      .select('seriesId')
      .eq('id', productId)
      .single();

    if (error || !test) {
      throw new Error(`Mock Test not found: ${productId}`);
    }

    try {
      if (test.seriesId && test.seriesId.startsWith('{')) {
        const parsed = JSON.parse(test.seriesId);
        if (parsed.isPremium) {
          return Number(parsed.price) || 499;
        }
      }
    } catch (e) {}
    throw new Error('Mock Test is not premium');
  }

  if (productType === 'question_bank' || productType === 'questionBank') {
    const { data: bank, error } = await supabaseAdmin
      .from('questionBanks')
      .select('tagline, isPremium')
      .eq('id', productId)
      .single();

    if (error || !bank) {
      throw new Error(`Question Bank not found: ${productId}`);
    }

    if (!bank.isPremium) {
      throw new Error('Question Bank is not premium');
    }

    try {
      if (bank.tagline && bank.tagline.includes('{"text"')) {
        const parsed = JSON.parse(bank.tagline);
        return Number(parsed.price) || 499;
      }
    } catch (e) {}
    return 499;
  }

  throw new Error(`Unsupported product type: ${productType}`);
};

async function runPaymentIntegrityTests() {
  console.log('=== STARTING PAYMENT INTEGRITY & PROTECTION TESTING ===\n');
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

  // Test Case 1: Resolve Exam Bundle Price
  try {
    const price = await getProductPrice('exam_bundle_exam-ops', 'exam_bundle', mockSupabaseAdmin);
    assert(price === 499, 'Resolves premium exam bundle price successfully (₹499).');
  } catch (err: any) {
    assert(false, `Failed to resolve exam bundle price: ${err.message}`);
  }

  // Test Case 2: Resolve Test Series Price
  try {
    const price = await getProductPrice('series-abc', 'test_series', mockSupabaseAdmin);
    assert(price === 299, 'Resolves premium test series price successfully (₹299).');
  } catch (err: any) {
    assert(false, `Failed to resolve test series price: ${err.message}`);
  }

  // Test Case 3: Resolve Mock Test Price
  try {
    const price = await getProductPrice('test-123', 'mock_test', mockSupabaseAdmin);
    assert(price === 199, 'Resolves premium mock test price successfully (₹199).');
  } catch (err: any) {
    assert(false, `Failed to resolve mock test price: ${err.message}`);
  }

  // Test Case 4: Resolve Question Bank Price
  try {
    const price = await getProductPrice('bank-456', 'question_bank', mockSupabaseAdmin);
    assert(price === 99, 'Resolves premium question bank price successfully (₹99).');
  } catch (err: any) {
    assert(false, `Failed to resolve question bank price: ${err.message}`);
  }

  // Test Case 5: Reject invalid/unsupported product type
  try {
    await getProductPrice('prod-xyz', 'unsupported_type', mockSupabaseAdmin);
    assert(false, 'Should throw an error for unsupported product type.');
  } catch (err: any) {
    assert(err.message.includes('Unsupported product type'), 'Throws validation error for unsupported product type.');
  }

  // Test Case 6: Duplicate payment detection (Replay Attack Check)
  {
    const userId = 'u1';
    const productId = 'prod-1';
    const paymentId = 'pay_duplicate';

    const getDuplicateCheckResult = async (uid: string, pid: string, payId: string, supabase: any) => {
      const { data: existingPurchase, error } = await supabase
        .from("user_purchases")
        .select("user_id, product_id")
        .eq("razorpay_payment_id", payId);

      if (existingPurchase && existingPurchase.length > 0) {
        const isSame = existingPurchase.some((p: any) => p.user_id === uid && p.product_id === pid);
        if (isSame) {
          return 'ALREADY_CREDITED';
        } else {
          return 'DUPLICATE_REPLAY_ATTACK';
        }
      }
      return 'NEW_TRANSACTION';
    };

    // Case 6A: Same user and same product -> Idempotent resolve
    const resSame = await getDuplicateCheckResult(userId, productId, paymentId, mockSupabaseAdmin);
    assert(resSame === 'ALREADY_CREDITED', 'Replay Protection: Same transaction payload resolved idempotently (ALREADY_CREDITED).');

    // Case 6B: Different user / product -> Replay Attack detected and rejected!
    const resDifferent = await getDuplicateCheckResult('u2', 'prod-2', paymentId, mockSupabaseAdmin);
    assert(resDifferent === 'DUPLICATE_REPLAY_ATTACK', 'Replay Protection: Signature reuse across different users/products is flagged as a Replay Attack.');
  }

  console.log(`\n=== PAYMENT INTEGRITY TEST RUN COMPLETED ===`);
  console.log(`PASSED: ${passed} / ${passed + failed}`);
  console.log(`FAILED: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPaymentIntegrityTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
