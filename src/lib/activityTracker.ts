import { supabase } from './supabase';

export interface UserActivity {
  id: string;
  userId: string;
  type: 'mock_test_completed' | 'practice_test_completed' | 'test_incomplete' | 'question_bank_accessed';
  title: string;
  timestamp: string;
  score?: number;
  totalMarks?: number;
  accuracy?: number;
  timeSpent?: number; // in seconds
  metadata?: any;
}

const STORAGE_KEY_PREFIX = 'oep_activities_';

// Maximum activities to keep in localStorage (full data including questions)
const LOCAL_MAX = 500;
// Maximum activities to sync to cloud (lightweight, no questions)
const CLOUD_MAX = 50;

/**
 * Strip ALL heavy session state from an activity before cloud sync.
 * Cloud metadata is ONLY for dashboard display (Continue Practice card, history count).
 * Full data (answers, questions, progress) lives in localStorage for resume functionality.
 *
 * Target: < 200 bytes per activity in cloud.
 */
function toCloudSafe(activity: UserActivity): UserActivity {
  try {
    const m = activity.metadata || {};
    // Only keep fields needed for "Continue Practice" card display
    const lightMeta: any = {
      examName: m.examName,
      testCategory: m.testCategory,
      bankType: m.bankType,
      bankId: m.bankId,
      resumeSessionId: m.resumeSessionId,
    };

    if (activity.type === 'test_incomplete') {
      // Keep minimal progress info for the "Continue" card
      lightMeta.currentQuestionIndex = m.currentQuestionIndex;
      lightMeta.timeLeft = m.timeLeft;
      // Store test identity ONLY (no questions, no answers)
      if (m.test && typeof m.test === 'object') {
        lightMeta.test = {
          id: m.test.id,
          title: m.test.title,
          durationMinutes: m.test.durationMinutes,
          _questionCount:
            m.test._questionCount ||
            (Array.isArray(m.test.questions) ? m.test.questions.length : 0),
        };
      }
      // totalQuestions for progress %
      lightMeta.totalQuestions =
        m.totalQuestions ||
        lightMeta.test?._questionCount ||
        0;
    }
    // Strip: answers, markedForReview, timeSpent, progressState, questions arrays, etc.
    return { ...activity, metadata: lightMeta };
  } catch {
    // On any error return a minimal safe object
    return {
      id: activity.id,
      userId: activity.userId,
      type: activity.type,
      title: activity.title,
      timestamp: activity.timestamp,
      score: activity.score,
      totalMarks: activity.totalMarks,
      accuracy: activity.accuracy,
    };
  }
}

/**
 * Safely parse a JSON string, returning fallback on any error.
 */
function safeParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    return (Array.isArray(fallback) ? (Array.isArray(parsed) ? parsed : fallback) : parsed) as T;
  } catch {
    return fallback;
  }
}

export const activityTracker = {
  getActivities: (userId: string, userMetadata?: any): UserActivity[] => {
    if (!userId) return [];
    try {
      const localKey = `${STORAGE_KEY_PREFIX}${userId}`;
      const localActivities: UserActivity[] = safeParse<UserActivity[]>(
        localStorage.getItem(localKey),
        []
      );

      const cloudActivities: UserActivity[] = (
        userMetadata?.activities && Array.isArray(userMetadata.activities)
      ) ? userMetadata.activities : [];

      // Always prefer local (it has full question data for resuming).
      // Only fall back to cloud if local is completely empty (e.g. new device).
      if (localActivities.length === 0 && cloudActivities.length > 0) {
        // Sync cloud → local so we have data on this device
        try {
          localStorage.setItem(localKey, JSON.stringify(cloudActivities));
        } catch { /* storage full — ignore */ }
        return cloudActivities;
      }

      return localActivities;
    } catch (e) {
      console.error('Failed to load activities', e);
      return [];
    }
  },

  logActivity: async (
    userId: string | undefined | null,
    activity: Omit<UserActivity, 'id' | 'userId' | 'timestamp'>
  ) => {
    if (!userId) return;

    try {
      const localKey = `${STORAGE_KEY_PREFIX}${userId}`;
      const existing: UserActivity[] = safeParse<UserActivity[]>(
        localStorage.getItem(localKey),
        []
      );

      const newActivity: UserActivity = {
        ...activity,
        id: Math.random().toString(36).substring(2, 15),
        userId,
        timestamp: new Date().toISOString(),
      };

      // Keep full data (with questions) in localStorage for resume functionality
      const updated = [newActivity, ...existing].slice(0, LOCAL_MAX);
      try {
        localStorage.setItem(localKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('oep-activity-changed'));
      } catch (storageErr) {
        // If storage is full, try trimming older entries
        try {
          const trimmed = [newActivity, ...existing].slice(0, 100);
          localStorage.setItem(localKey, JSON.stringify(trimmed));
          window.dispatchEvent(new CustomEvent('oep-activity-changed'));
        } catch { /* give up on local storage */ }
      }

      // Sync LIGHTWEIGHT version to cloud (no questions, no large timeSpent maps)
      // Only send the most recent CLOUD_MAX activities to keep metadata small
      const cloudPayload = updated.slice(0, CLOUD_MAX).map(toCloudSafe);

      try {
        await supabase.auth.updateUser({
          data: { activities: cloudPayload },
        });
      } catch (cloudErr) {
        // Cloud sync failure is non-fatal — local data is still intact
        console.warn('Cloud activity sync failed (non-fatal):', cloudErr);
      }
    } catch (e) {
      console.error('Failed to log activity:', e);
    }
  },

  deleteActivity: async (userId: string, activityId: string) => {
    if (!userId || !activityId) return;
    try {
      const localKey = `${STORAGE_KEY_PREFIX}${userId}`;
      const existing: UserActivity[] = safeParse<UserActivity[]>(
        localStorage.getItem(localKey),
        []
      );
      const updated = existing.filter((a) => a.id !== activityId);
      try {
        localStorage.setItem(localKey, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('oep-activity-changed'));
      } catch { /* ignore */ }

      // Sync LIGHTWEIGHT version to cloud (no questions, no large timeSpent maps)
      const cloudPayload = updated.slice(0, CLOUD_MAX).map(toCloudSafe);
      try {
        await supabase.auth.updateUser({
          data: { activities: cloudPayload },
        });
      } catch (cloudErr) {
        console.warn('Cloud activity sync failed (non-fatal):', cloudErr);
      }
    } catch (e) {
      console.error('Failed to delete activity:', e);
    }
  },

  clearActivities: async (userId: string) => {
    if (!userId) return;
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
      window.dispatchEvent(new CustomEvent('oep-activity-changed'));
    } catch { /* ignore */ }
    try {
      await supabase.auth.updateUser({ data: { activities: [] } });
    } catch (e) {
      console.warn('Failed to clear cloud activities:', e);
    }
  },
};
