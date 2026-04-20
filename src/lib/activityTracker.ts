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

export const activityTracker = {
  getActivities: (userId: string, userMetadata?: any): UserActivity[] => {
    if (!userId) return [];
    try {
      const localData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      const localActivities: UserActivity[] = localData ? JSON.parse(localData) : [];
      const cloudActivities: UserActivity[] = (userMetadata?.activities && Array.isArray(userMetadata.activities)) 
        ? userMetadata.activities 
        : [];

      // If cloud has more activities (meaning we logged in from a new device or restored session),
      // we prefer the cloud state and sync it to local storage.
      if (cloudActivities.length > localActivities.length) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(cloudActivities));
        return cloudActivities;
      }

      return localActivities;
    } catch (e) {
      console.error("Failed to load activities", e);
      return [];
    }
  },

  logActivity: async (userId: string | undefined | null, activity: Omit<UserActivity, 'id' | 'userId' | 'timestamp'>) => {
    if (!userId) return;
    
    try {
      // Read current activities from local storage (or pass in empty array if none)
      let activities: UserActivity[] = [];
      const localData = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      if (localData) {
        activities = JSON.parse(localData);
      }
      
      const newActivity: UserActivity = {
        ...activity,
        id: Math.random().toString(36).substring(2, 15),
        userId,
        timestamp: new Date().toISOString()
      };
      
      const updated = [newActivity, ...activities].slice(0, 500); // keep history bounded to last 500
      
      // Save locally instantly
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));

      // Sync aggressively with Supabase Cloud `user_metadata`
      await supabase.auth.updateUser({
        data: { activities: updated }
      });
      
    } catch (e) {
      console.error("Failed to log activity to cloud", e);
    }
  },
  
  clearActivities: async (userId: string) => {
    if (!userId) return;
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
    await supabase.auth.updateUser({
      data: { activities: [] }
    });
  }
};
