import { supabase } from './supabase';
import { examService } from './examService';

export interface CatalogData {
  exams: any[];
  mockTests: any[];
  testSeries: any[];
  questionBanks: Record<string, any[]>;
}

export interface SyncEngineConfig {
  setExams: (exams: any[]) => void;
  setMockTests: (tests: any[]) => void;
  setTestSeries: (series: any[]) => void;
  setDynamicQuestionBanks: (banks: Record<string, any[]>) => void;
  setLoadingExams: (loading: boolean) => void;
  user: any;
}

class SyncEngine {
  private config: SyncEngineConfig;
  private channel: any = null;
  private pollIntervalId: any = null;
  private isFetching = false;
  private activeSyncTime = 0;

  constructor(config: SyncEngineConfig) {
    this.config = config;
  }

  public start() {
    console.log("[SyncEngine] Starting real-time synchronization engine...");
    
    // 1. Initialize Realtime Subscriptions
    this.setupRealtime();

    // 2. Setup Background Polling (Fallback check every 60 seconds)
    this.pollIntervalId = setInterval(() => {
      this.triggerFetch('polling');
    }, 60000);

    // 3. Listen for window visibility/focus to fetch updates immediately when the tab is reopened
    window.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleFocus);

    // Initial fetch on startup
    this.triggerFetch('startup');
  }

  public stop() {
    console.log("[SyncEngine] Stopping synchronization engine...");
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
    }
    window.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleFocus);
  }

  private setupRealtime() {
    try {
      // Subscribe to changes across key catalog tables
      this.channel = (supabase
        .channel('catalog-live-updates') as any)
        .on(
          'postgres_changes',
          { event: '*', scheme: 'public', table: 'exams' },
          () => this.triggerFetch('realtime:exams')
        )
        .on(
          'postgres_changes',
          { event: '*', scheme: 'public', table: 'mockTests' },
          () => this.triggerFetch('realtime:mockTests')
        )
        .on(
          'postgres_changes',
          { event: '*', scheme: 'public', table: 'testSeries' },
          () => this.triggerFetch('realtime:testSeries')
        )
        .on(
          'postgres_changes',
          { event: '*', scheme: 'public', table: 'questionBanks' },
          () => this.triggerFetch('realtime:questionBanks')
        )
        .on(
          'postgres_changes',
          { event: '*', scheme: 'public', table: 'questions' },
          () => this.triggerFetch('realtime:questions')
        )
        .subscribe((status: any) => {
          console.log(`[SyncEngine] Supabase Realtime channel status: ${status}`);
        });
    } catch (e) {
      console.warn("[SyncEngine] Failed to initialize Supabase Realtime channel:", e);
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.triggerFetch('visibility-visible');
    }
  };

  private handleFocus = () => {
    this.triggerFetch('window-focused');
  };

  public async triggerFetch(reason: string) {
    // Throttling: Prevent multiple parallel fetches within 3 seconds
    const now = Date.now();
    if (this.isFetching || now - this.activeSyncTime < 3000) {
      return;
    }
    
    this.isFetching = true;
    this.activeSyncTime = now;
    console.log(`[SyncEngine] Synchronization triggered by [${reason}]`);

    try {
      // 1. Run SWR queries
      const [examsResult, banksResult, seriesResult, testsResult] = await Promise.allSettled([
        examService.getAllExams(),
        examService.getAllQuestionBanks(),
        examService.getAllTestSeries(),
        examService.getAllMockTestsLite()
      ]);

      const fetchedExams = examsResult.status === 'fulfilled' ? examsResult.value : [];
      const fetchedBanks = banksResult.status === 'fulfilled' ? banksResult.value : [];
      const fetchedSeries = seriesResult.status === 'fulfilled' ? seriesResult.value : [];
      const fetchedTests = testsResult.status === 'fulfilled' ? testsResult.value : [];

      // If all tables fail, raise error to trigger rollback-safe cache recovery
      if (
        examsResult.status === 'rejected' &&
        banksResult.status === 'rejected' &&
        seriesResult.status === 'rejected' &&
        testsResult.status === 'rejected'
      ) {
        throw new Error("All database calls failed");
      }

      // 2. Perform Automated Health Checks and Self-Recovery
      const cleanData = this.runHealthChecks({
        exams: fetchedExams,
        mockTests: fetchedTests,
        testSeries: fetchedSeries,
        questionBanks: fetchedBanks
      });

      // 3. Update Global React States and Cache
      this.applyCatalogUpdate(cleanData);

    } catch (err) {
      console.warn("[SyncEngine] Catalog synchronization failed. Rolling back to safe cache...", err);
      this.recoverFromCache();
    } finally {
      this.isFetching = false;
      this.config.setLoadingExams(false);
    }
  }

  /**
   * Health Check and Self-Recovery Routine
   */
  private runHealthChecks(raw: { exams: any[]; mockTests: any[]; testSeries: any[]; questionBanks: any[] }): CatalogData {
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

    // If all exams filtered out, revert to show all cleanExams to avoid empty layout
    const finalExams = examsWithContent.length > 0 ? examsWithContent : cleanExams;

    if (healthReport.length > 0) {
      console.warn("[SyncEngine Health Check Report]:\n" + healthReport.join("\n"));
    }

    return {
      exams: finalExams,
      mockTests: cleanTests,
      testSeries: cleanSeries,
      questionBanks: cleanBanks
    };
  }

  private applyCatalogUpdate(data: CatalogData) {
    // Preserve Active Student session:
    // If user is currently taking a mock test, we do not want to force-change mockTests state
    // in a way that restarts their timer or overrides active items.
    const isMockTestSessionActive = !!(
      sessionStorage.getItem('oep_active_test_session') ||
      document.body.getAttribute('data-test-mode') === 'true'
    );

    if (isMockTestSessionActive) {
      console.log("[SyncEngine] Active test session detected. Postponing full catalog state paint to avoid disrupting student focus.");
      // We still update other states like question banks
      this.config.setDynamicQuestionBanks(data.questionBanks);
      this.config.setExams(data.exams);
      this.config.setTestSeries(data.testSeries);
      return;
    }

    // Apply updates smoothly
    this.config.setExams(data.exams);
    this.config.setMockTests(data.mockTests);
    this.config.setTestSeries(data.testSeries);
    this.config.setDynamicQuestionBanks(data.questionBanks);

    // Save back to local SWR cache for immediate reload recovery
    try {
      const userId = this.config.user?.id || 'guest';
      sessionStorage.setItem('oep_cached_exams', JSON.stringify(data.exams));
      sessionStorage.setItem('oep_cached_testSeries', JSON.stringify(data.testSeries));
      sessionStorage.setItem('oep_cached_mockTests', JSON.stringify(data.mockTests));
      sessionStorage.setItem('oep_cached_dynamicQuestionBanks', JSON.stringify(data.questionBanks));
      sessionStorage.setItem('oep_cached_loadedForUserId', userId);
    } catch (e) {}
  }

  private recoverFromCache() {
    try {
      const cachedExams = sessionStorage.getItem('oep_cached_exams');
      const cachedTests = sessionStorage.getItem('oep_cached_mockTests');
      const cachedSeries = sessionStorage.getItem('oep_cached_testSeries');
      const cachedBanks = sessionStorage.getItem('oep_cached_dynamicQuestionBanks');

      if (cachedExams && cachedTests && cachedSeries && cachedBanks) {
        this.config.setExams(JSON.parse(cachedExams));
        this.config.setMockTests(JSON.parse(cachedTests));
        this.config.setTestSeries(JSON.parse(cachedSeries));
        this.config.setDynamicQuestionBanks(JSON.parse(cachedBanks));
        console.log("[SyncEngine] Successfully recovered previous stable catalog from session storage.");
      }
    } catch (e) {
      console.error("[SyncEngine] Failed to recover from local cache:", e);
    }
  }
}

export function startSyncEngine(config: SyncEngineConfig) {
  const engine = new SyncEngine(config);
  engine.start();
  return engine;
}
