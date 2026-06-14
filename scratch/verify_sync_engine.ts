// Self-contained health check and self-recovery algorithm test

interface CatalogData {
  exams: any[];
  mockTests: any[];
  testSeries: any[];
  questionBanks: Record<string, any[]>;
}

/**
 * The exact Health Check and Self-Recovery logic from syncEngine.ts
 */
function runHealthChecks(raw: { exams: any[]; mockTests: any[]; testSeries: any[]; questionBanks: any[] }): CatalogData {
  const healthReport: string[] = [];
  const cleanExams: any[] = [];
  const cleanTests: any[] = [];
  const cleanSeries: any[] = [];
  const cleanBanks: Record<string, any[]> = {};

  const seenExamIds = new Set<string>();
  const seenTestIds = new Set<string>();
  const seenSeriesIds = new Set<string>();
  const seenBankIds = new Set<string>();

  // Helper: parse virtual fields from MockTest seriesId
  const getExamIdFromMockTest = (test: any): string | null => {
    if (test.examId) return test.examId;
    let seriesData = test.seriesId;
    if (typeof seriesData === 'string' && seriesData.startsWith('{')) {
      try { seriesData = JSON.parse(seriesData); } catch (e) {}
    }
    if (seriesData && typeof seriesData === 'object') {
      return seriesData.examId || null;
    }
    return null;
  };

  // A. Clean and Validate Exams (Remove duplicates & system keys)
  raw.exams.forEach((exam) => {
    if (!exam.id) return;
    if (seenExamIds.has(exam.id)) {
      healthReport.push(`[Self-Healing] Removed duplicate exam ID: ${exam.id}`);
      return;
    }
    seenExamIds.add(exam.id);
    cleanExams.push(exam);
  });

  // Provide default fallback exam if catalog is completely empty
  if (cleanExams.length === 0) {
    cleanExams.push({
      id: 'opsc-aio',
      name: 'OPSC AIO',
      description: 'Odisha Public Service Commission All In One',
      icon: '🏛️',
      category: 'upcoming'
    });
    seenExamIds.add('opsc-aio');
    healthReport.push("[Self-Healing] Empty exams list. Generated fallback opsc-aio exam.");
  }

  // B. Clean and Validate Test Series (Parent mapping integrity)
  raw.testSeries.forEach((s) => {
    if (!s.id) return;
    if (seenSeriesIds.has(s.id)) {
      healthReport.push(`[Self-Healing] Removed duplicate test series ID: ${s.id}`);
      return;
    }
    seenSeriesIds.add(s.id);

    // Verify and recover parent exam reference
    let effectiveExamId = s.examId;
    if (!effectiveExamId || !seenExamIds.has(effectiveExamId)) {
      // Auto-assign to first active exam
      effectiveExamId = cleanExams[0].id;
      healthReport.push(`[Self-Healing] Re-routed orphan series "${s.title}" (${s.id}) to parent exam: ${effectiveExamId}`);
    }
    cleanSeries.push({ ...s, examId: effectiveExamId });
  });

  // C. Clean and Validate Mock Tests
  raw.mockTests.forEach((t) => {
    if (!t.id) return;
    if (seenTestIds.has(t.id)) {
      healthReport.push(`[Self-Healing] Removed duplicate mock test ID: ${t.id}`);
      return;
    }
    seenTestIds.add(t.id);

    // Parse and check parent exam
    let examId = getExamIdFromMockTest(t);
    let isPremium = t.isPremium ?? false;

    // If seriesId is a structured config string, unpack it
    let seriesData = t.seriesId;
    if (typeof seriesData === 'string' && seriesData.startsWith('{')) {
      try {
        const parsed = JSON.parse(seriesData);
        isPremium = parsed.isPremium ?? isPremium;
        examId = parsed.examId || examId;
      } catch (e) {}
    }

    // Check if parent exam exists, otherwise assign to first exam to avoid missing tests
    if (!examId || !seenExamIds.has(examId)) {
      examId = cleanExams[0].id;
      healthReport.push(`[Self-Healing] Re-routed orphan test "${t.title}" (${t.id}) to parent exam: ${examId}`);
    }

    cleanTests.push({
      ...t,
      examId,
      isPremium,
      _resolvedExamId: examId
    });
  });

  // D. Clean and Validate Question Banks
  raw.questionBanks.forEach((b) => {
    if (!b.id) return;
    if (seenBankIds.has(b.id)) {
      healthReport.push(`[Self-Healing] Removed duplicate question bank ID: ${b.id}`);
      return;
    }
    seenBankIds.add(b.id);

    let examId = b.examId;
    if (!examId || !seenExamIds.has(examId)) {
      examId = cleanExams[0].id;
      healthReport.push(`[Self-Healing] Re-routed orphan question bank "${b.title}" (${b.id}) to parent exam: ${examId}`);
    }

    // Parse tagline
    let parsedTagline = { text: b.tagline || '', price: 499 };
    try {
      if (b.tagline && b.tagline.includes('{"text"')) {
        parsedTagline = JSON.parse(b.tagline);
      }
    } catch (e) {}

    const cleanBankItem = {
      id: b.id,
      title: b.title,
      questions: b.questionCount,
      tagline: parsedTagline.text,
      price: parsedTagline.price || 499,
      image: b.image,
      isPremium: b.isPremium,
      examId: examId,
      pdfUrl: b.pdfUrl || '',
      pdfLinks: (() => {
        if (!b.pdfUrl) return [];
        try {
          const parsed = JSON.parse(b.pdfUrl);
          if (Array.isArray(parsed)) return parsed;
          return [{ title: 'Download PDF', url: b.pdfUrl }];
        } catch (e) {
          return [{ title: 'Download PDF', url: b.pdfUrl }];
        }
      })(),
      hasPracticeMode: b.hasPracticeMode
    };

    const type = b.type || 'topic-wise';
    if (!cleanBanks[type]) {
      cleanBanks[type] = [];
    }
    cleanBanks[type].push(cleanBankItem);
  });

  // E. Prevent Empty Exam View crash
  // Filter actual exams that contain content OR are marked system
  const examsWithContent = cleanExams.filter(exam => {
    const category = exam.category || '';
    if (category === 'blog' || category === 'system' || (exam.name || '').startsWith('SYSTEM_SETTINGS_')) {
      return true;
    }
    const hasTests = cleanTests.some(t => t.examId === exam.id);
    const hasBanks = Object.values(cleanBanks).flat().some(b => b.examId === exam.id);
    const hasSeries = cleanSeries.some(s => s.examId === exam.id);
    return hasTests || hasBanks || hasSeries;
  });

  const finalExams = examsWithContent.length > 0 ? examsWithContent : cleanExams;

  if (healthReport.length > 0) {
    console.log("[SyncEngine Health Check Log]:\n" + healthReport.map(l => "  " + l).join("\n"));
  }

  return {
    exams: finalExams,
    mockTests: cleanTests,
    testSeries: cleanSeries,
    questionBanks: cleanBanks
  };
}

console.log("=== Starting SyncEngine Health Check & Self-Recovery Tests ===\n");

// Test Case 1: Orphan Content Re-routing (Parent Mapping Integrity)
console.log("Test Case 1: Mock test and series with non-existent parent examId...");
const rawCatalog1 = {
  exams: [
    { id: 'exam_ops', name: 'OPSC OAS' }
  ],
  mockTests: [
    { id: 'test_1', examId: 'invalid_exam_parent', title: 'Orphaned Test', isPremium: false }
  ],
  testSeries: [
    { id: 'series_1', examId: 'another_invalid_parent', title: 'Orphaned Series' }
  ],
  questionBanks: [
    { id: 'bank_1', examId: 'invalid_exam_parent', title: 'Orphaned Bank', type: 'topic-wise', tagline: '{"text":"OAS Bank","price":399}' }
  ]
};

const result1 = runHealthChecks(rawCatalog1);

console.log("Mock test 1 resolved examId:", result1.mockTests[0].examId);
console.log("Series 1 resolved examId:", result1.testSeries[0].examId);
console.log("Bank 1 resolved examId:", result1.questionBanks['topic-wise'][0].examId);

if (
  result1.mockTests[0].examId === 'exam_ops' &&
  result1.testSeries[0].examId === 'exam_ops' &&
  result1.questionBanks['topic-wise'][0].examId === 'exam_ops'
) {
  console.log("✅ Passed: Orphaned items were successfully re-routed to a valid fallback exam parent!");
} else {
  console.log("❌ Failed: Orphan re-routing failed.");
}
console.log("");

// Test Case 2: De-duplication of duplicate database records
console.log("Test Case 2: De-duplication of duplicate records...");
const rawCatalog2 = {
  exams: [
    { id: 'exam_ops', name: 'OPSC OAS' },
    { id: 'exam_ops', name: 'Duplicate OPSC OAS' } // duplicate ID
  ],
  mockTests: [
    { id: 'test_1', examId: 'exam_ops', title: 'Test 1' },
    { id: 'test_1', examId: 'exam_ops', title: 'Duplicate Test 1' } // duplicate ID
  ],
  testSeries: [],
  questionBanks: []
};

const result2 = runHealthChecks(rawCatalog2);
console.log("Clean Exams length (expected 1):", result2.exams.length);
console.log("Clean Mock Tests length (expected 1):", result2.mockTests.length);

if (result2.exams.length === 1 && result2.mockTests.length === 1) {
  console.log("✅ Passed: Duplicate items were successfully filtered out!");
} else {
  console.log("❌ Failed: De-duplication failed.");
}
console.log("");

// Test Case 3: Empty Exam View Protection
console.log("Test Case 3: Empty Exam view protection...");
const rawCatalog3 = {
  exams: [
    { id: 'exam_ops', name: 'OPSC OAS' },
    { id: 'exam_empty', name: 'Empty Exam Category' }
  ],
  mockTests: [
    { id: 'test_1', examId: 'exam_ops', title: 'Test 1' }
  ],
  testSeries: [],
  questionBanks: []
};

const result3 = runHealthChecks(rawCatalog3);
console.log("Exams in catalog output (expected 1 containing content):", result3.exams.length);
console.log("Exams list contains 'exam_empty':", result3.exams.some(e => e.id === 'exam_empty'));

if (result3.exams.length === 1 && !result3.exams.some(e => e.id === 'exam_empty')) {
  console.log("✅ Passed: Empty exam categories are filtered out to prevent empty states!");
} else {
  console.log("❌ Failed: Empty exam filtering failed.");
}
console.log("\n=== SyncEngine Health Check & Self-Recovery Tests Complete ===");
