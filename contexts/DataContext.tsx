import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, DailyLog } from '@/types';
import { subscribeToHabits, addHabit, editHabit as editHabitService, deleteHabit } from '@/services/habits';
import {
  subscribeToDailyLog,
  toggleHabitCompletion,
  getTodayDateString,
  getDailyLogsForRange,
} from '@/services/dailyLogs';
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelTodayAndKeepFutureReminders,
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
} from '@/services/notifications';
import { useAuth } from './AuthContext';

const REMINDER_TIME_KEY = 'reminder_time';

interface DataContextType {
  habits: Habit[];
  todayLog: DailyLog | null;
  isHabitCompletedToday: (habitId: string) => boolean;
  toggleHabit: (habitId: string) => Promise<boolean>;
  createHabit: (title: string, emoji: string) => Promise<string>;
  editHabit: (habitId: string, title: string, emoji: string) => Promise<void>;
  removeHabit: (habitId: string) => Promise<void>;
  getLogsForRange: (startDate: string, endDate: string) => Promise<DailyLog[]>;
  reminderHour: number;
  reminderMinute: number;
  updateReminderTime: (hour: number, minute: number) => Promise<void>;
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR);
  const [reminderMinute, setReminderMinute] = useState(DEFAULT_REMINDER_MINUTE);
  const reminderTimeLoaded = useRef(false);

  // Load saved reminder time from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(REMINDER_TIME_KEY);
        if (saved) {
          const { hour, minute } = JSON.parse(saved);
          setReminderHour(hour);
          setReminderMinute(minute);
        }
      } catch {
        // Use defaults
      } finally {
        reminderTimeLoaded.current = true;
      }
    })();
  }, []);

  // Request notification permissions and schedule daily reminder on login
  useEffect(() => {
    if (!user || !reminderTimeLoaded.current) return;
    (async () => {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await scheduleDailyReminder(reminderHour, reminderMinute);
      }
    })();
  }, [user, reminderHour, reminderMinute]);

  // Cancel today's reminder if all habits are completed, but keep future days
  useEffect(() => {
    if (habits.length === 0) return;
    const completedIds = todayLog?.completedHabitIds ?? [];
    const allDone = habits.every((h) => completedIds.includes(h.id));
    if (allDone) {
      cancelTodayAndKeepFutureReminders(reminderHour, reminderMinute);
    } else {
      // Re-schedule recurring reminder if user unchecks a habit
      scheduleDailyReminder(reminderHour, reminderMinute);
    }
  }, [habits, todayLog, reminderHour, reminderMinute]);

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

  const editHabitCb = useCallback(
    async (habitId: string, title: string, emoji: string) => {
      await editHabitService(habitId, title, emoji);
    },
    []
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

  const updateReminderTime = useCallback(
    async (hour: number, minute: number) => {
      setReminderHour(hour);
      setReminderMinute(minute);
      await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify({ hour, minute }));
      // The useEffect watching reminderHour/reminderMinute will reschedule automatically
    },
    []
  );

  return (
    <DataContext.Provider
      value={{
        habits,
        todayLog,
        isHabitCompletedToday,
        toggleHabit,
        createHabit,
        editHabit: editHabitCb,
        removeHabit,
        getLogsForRange,
        reminderHour,
        reminderMinute,
        updateReminderTime,
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
