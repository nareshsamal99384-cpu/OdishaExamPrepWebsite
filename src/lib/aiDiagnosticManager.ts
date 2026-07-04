export interface ManagerState {
  scanningPhase: number;
  scanStep: string;
  loadingAi: boolean;
  aiInsight: string;
  actionItems: any[];
  activeCacheKey: string | null;
  scanCount: number;
}

class AiDiagnosticManager {
  private state: ManagerState = {
    scanningPhase: 0,
    scanStep: '',
    loadingAi: false,
    aiInsight: '',
    actionItems: [],
    activeCacheKey: null,
    scanCount: 0,
  };

  private listeners = new Set<() => void>();
  private abortController: AbortController | null = null;

  getState(): ManagerState {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        console.error("Error in AiDiagnosticManager listener:", e);
      }
    });
  }

  private updateState(updates: Partial<ManagerState>) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  reset(cacheKey: string) {
    try {
      localStorage.removeItem(cacheKey);
    } catch (e) {
      console.error("Failed to remove from localStorage:", e);
    }

    // Always reset and notify — regardless of whether the manager started the scan
    // this session (activeCacheKey may be null if data was loaded from localStorage).
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state = {
      scanningPhase: 0,
      scanStep: '',
      loadingAi: false,
      aiInsight: '',
      actionItems: [],
      activeCacheKey: null,
      scanCount: this.state.scanCount,
    };
    this.notify();
  }

  async runAiAnalysis(user: any, stats: any, force = false) {
    if (!stats) return;
    const cacheKey = `oep_ai_insights_${user?.id}_${stats.totalTests}_${stats.avgScore}`;

    // Abort any existing operation
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.updateState({
      scanCount: this.state.scanCount + 1,
      loadingAi: true,
      scanningPhase: 1,
      activeCacheKey: cacheKey,
      aiInsight: '',
      actionItems: [],
    });

    const steps = [
      "Ingesting mock test history...",
      "Correlating accuracy & speed data...",
      "Analyzing subject-wise strengths...",
      "Synthesizing customized action plan..."
    ];

    try {
      for (let i = 0; i < steps.length; i++) {
        if (signal.aborted) return;
        this.updateState({ scanStep: steps[i] });
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(resolve, 800);
          const onAbort = () => {
            clearTimeout(timeout);
            reject(new DOMException('Aborted', 'AbortError'));
          };
          signal.addEventListener('abort', onAbort);
        });
      }

      if (signal.aborted) return;

      const systemPrompt = `You are the OdishaExamPrep AI Performance Laboratory, an elite exam coaching intelligence. You generate performance insights in JSON format.
Your output must be a JSON object with:
{
  "diagnostic": "A detailed executive performance analysis (3-4 sentences) highlighting cognitive strengths, speed/accuracy trade-offs, and critical focus areas in Odisha exams.",
  "actionPlan": [
    { "task": "A highly specific recommendation, e.g., 'Attempt 25 intermediate math questions'", "boost": "+5%", "timeframe": "2 days" },
    ... (exactly 3 items)
  ]
}`;

      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta/llama-3.3-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analyze this student data and return JSON:\n${JSON.stringify(stats, null, 2)}` }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        }),
        signal
      });

      if (signal.aborted) return;
      if (!response.ok) throw new Error('API connection failed');
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      const cleanJson = (str: string) => {
        let cleaned = str.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
        }
        return cleaned;
      };

      const parsed = JSON.parse(cleanJson(content));
      const insight = parsed.diagnostic || '';
      const items = parsed.actionPlan || [];

      if (signal.aborted) return;

      try {
        localStorage.setItem(cacheKey, JSON.stringify(parsed));
      } catch (e) {
        console.error("Failed to save to localStorage:", e);
      }
      
      this.updateState({
        aiInsight: insight,
        actionItems: items,
        scanningPhase: 2,
        loadingAi: false,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return; // ignore abort
      }
      console.error("AI Analysis background scan failed:", err);
      
      // Fallback
      const fallbackData = {
        diagnostic: `Based on your ${stats.totalTests} completed mock tests, you have shown an average accuracy of ${stats.avgAccuracy}%. Your speed is ${stats.avgTimePerQuestion.toFixed(0)}s per question. Focus on reviewing wrong answers and practicing weaker subjects.`,
        actionPlan: [
          { task: "Practice 15 topic-wise tests in your weakest subjects", boost: "+8%", timeframe: "3 days" },
          { task: "Attempt a full-length mock test focusing on speed (under 45s per Q)", boost: "+5%", timeframe: "5 days" },
          { task: "Review all incorrect answers in your test history log", boost: "+10%", timeframe: "1 day" }
        ]
      };

      if (signal.aborted) return;

      try {
        localStorage.setItem(cacheKey, JSON.stringify(fallbackData));
      } catch (e) {
        console.error("Failed to save fallback to localStorage:", e);
      }

      this.updateState({
        aiInsight: fallbackData.diagnostic,
        actionItems: fallbackData.actionPlan,
        scanningPhase: 2,
        loadingAi: false,
      });
    }
  }
}

export const aiDiagnosticManager = new AiDiagnosticManager();
