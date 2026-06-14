"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var syncEngine_ts_1 = require("../src/lib/syncEngine.ts");
// We mock the react setters to capture state updates
var examsState = [];
var mockTestsState = [];
var testSeriesState = [];
var dynamicQuestionBanksState = {};
var loadingState = false;
var config = {
    setExams: function (val) { examsState = val; },
    setMockTests: function (val) { mockTestsState = val; },
    setTestSeries: function (val) { testSeriesState = val; },
    setDynamicQuestionBanks: function (val) { dynamicQuestionBanksState = val; },
    setLoadingExams: function (val) { loadingState = val; },
    user: { id: 'test_user_123' }
};
// Access the private health check routine to test it directly
var engine = (0, syncEngine_ts_1.startSyncEngine)(config);
engine.stop(); // stop actual realtime/polling timers for this synchronous unit test
console.log("=== Starting SyncEngine Health Check & Self-Recovery Tests ===\n");
// Test Case 1: Orphan Content Re-routing (Parent Mapping Integrity)
console.log("Test Case 1: Mock test and series with non-existent parent examId...");
var rawCatalog1 = {
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
        { id: 'bank_1', examId: 'invalid_exam_parent', title: 'Orphaned Bank', type: 'topic-wise', tagline: 'Text' }
    ]
};
var result1 = engine.runHealthChecks(rawCatalog1);
console.log("Mock test 1 resolved examId:", result1.mockTests[0].examId);
console.log("Series 1 resolved examId:", result1.testSeries[0].examId);
console.log("Bank 1 resolved examId:", result1.questionBanks['topic-wise'][0].examId);
if (result1.mockTests[0].examId === 'exam_ops' &&
    result1.testSeries[0].examId === 'exam_ops' &&
    result1.questionBanks['topic-wise'][0].examId === 'exam_ops') {
    console.log("✅ Passed: Orphaned items were successfully re-routed to a valid fallback exam parent!");
}
else {
    console.log("❌ Failed: Orphan re-routing failed.");
}
console.log("");
// Test Case 2: De-duplication of duplicate database records
console.log("Test Case 2: De-duplication of duplicate records...");
var rawCatalog2 = {
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
var result2 = engine.runHealthChecks(rawCatalog2);
console.log("Clean Exams length (expected 1):", result2.exams.length);
console.log("Clean Mock Tests length (expected 1):", result2.mockTests.length);
if (result2.exams.length === 1 && result2.mockTests.length === 1) {
    console.log("✅ Passed: Duplicate items were successfully filtered out!");
}
else {
    console.log("❌ Failed: De-duplication failed.");
}
console.log("");
// Test Case 3: Empty Exam View Protection
console.log("Test Case 3: Empty Exam view protection...");
// We define two exams: 'exam_ops' (has content) and 'exam_empty' (has no content)
var rawCatalog3 = {
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
var result3 = engine.runHealthChecks(rawCatalog3);
console.log("Exams in catalog output (expected 1 containing content):", result3.exams.length);
console.log("Exams list contains 'exam_empty':", result3.exams.some(function (e) { return e.id === 'exam_empty'; }));
// Wait, cleanExams returns finalExams. Let's see if it filtered 'exam_empty'
if (result3.exams.length === 1 && !result3.exams.some(function (e) { return e.id === 'exam_empty'; })) {
    console.log("✅ Passed: Empty exam categories are filtered out to prevent empty states!");
}
else {
    console.log("❌ Failed: Empty exam filtering failed.");
}
console.log("");
// Test Case 4: Active Session Preservation
console.log("Test Case 4: Active session preservation...");
// Simulate active test mode
sessionStorage.setItem('oep_active_test_session', 'true');
var freshCatalog = {
    exams: [{ id: 'exam_ops', name: 'OPSC OAS' }],
    mockTests: [{ id: 'test_1', examId: 'exam_ops', title: 'Updated Test Title' }],
    testSeries: [],
    questionBanks: {}
};
mockTestsState = [{ id: 'test_1', examId: 'exam_ops', title: 'Original Test Title' }];
engine.applyCatalogUpdate(freshCatalog);
console.log("Mock tests state title in memory:", mockTestsState[0].title);
if (mockTestsState[0].title === 'Original Test Title') {
    console.log("✅ Passed: Sync engine postponed state updates for mockTests to protect active test session focus!");
}
else {
    console.log("❌ Failed: Active session preservation failed.");
}
sessionStorage.removeItem('oep_active_test_session');
console.log("\n=== SyncEngine Health Check & Self-Recovery Tests Complete ===");
