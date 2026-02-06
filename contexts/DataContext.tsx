import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Habit, DailyLog } from '@/types';
import { subscribeToHabits, addHabit, deleteHabit } from '@/services/habits';
import {
  subscribeToDailyLog,
  toggleHabitCompletion,
  getTodayDateString,
  getDailyLogsForRange,
} from '@/services/dailyLogs';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '@/services/notifications';
import { useAuth } from './AuthContext';

interface DataContextType {
  habits: Habit[];
  todayLog: DailyLog | null;
  isHabitCompletedToday: (habitId: string) => boolean;
  toggleHabit: (habitId: string) => Promise<boolean>;
  createHabit: (title: string, emoji: string) => Promise<string>;
  removeHabit: (habitId: string) => Promise<void>;
  getLogsForRange: (startDate: string, endDate: string) => Promise<DailyLog[]>;
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);

  // Request notification permissions and schedule daily reminder on login
  useEffect(() => {
    if (!user) return;
    (async () => {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await scheduleDailyReminder();
      }
    })();
  }, [user]);

  // Cancel today's reminder if all habits are completed
  useEffect(() => {
    if (habits.length === 0) return;
    const completedIds = todayLog?.completedHabitIds ?? [];
    const allDone = habits.every((h) => completedIds.includes(h.id));
    if (allDone) {
      cancelDailyReminder();
    } else {
      // Re-schedule if user unchecks a habit
      scheduleDailyReminder();
    }
  }, [habits, todayLog]);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setTodayLog(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const today = getTodayDateString();

    const unsubHabits = subscribeToHabits(user.uid, (h) => {
      setHabits(h);
      setLoading(false);
    });

    const unsubLog = subscribeToDailyLog(user.uid, today, (log) => {
      setTodayLog(log);
    });

    return () => {
      unsubHabits();
      unsubLog();
    };
  }, [user]);

  const isHabitCompletedToday = useCallback(
    (habitId: string) => {
      return todayLog?.completedHabitIds?.includes(habitId) ?? false;
    },
    [todayLog]
  );

  const toggleHabit = useCallback(
    async (habitId: string) => {
      if (!user) throw new Error('Not authenticated');
      const today = getTodayDateString();
      return toggleHabitCompletion(user.uid, today, habitId);
    },
    [user]
  );

  const createHabit = useCallback(
    async (title: string, emoji: string) => {
      if (!user) throw new Error('Not authenticated');
      return addHabit(user.uid, title, emoji);
    },
    [user]
  );

  const removeHabit = useCallback(
    async (habitId: string) => {
      await deleteHabit(habitId);
    },
    []
  );

  const getLogsForRange = useCallback(
    async (startDate: string, endDate: string) => {
      if (!user) return [];
      return getDailyLogsForRange(user.uid, startDate, endDate);
    },
    [user]
  );

  return (
    <DataContext.Provider
      value={{
        habits,
        todayLog,
        isHabitCompletedToday,
        toggleHabit,
        createHabit,
        removeHabit,
        getLogsForRange,
        loading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
