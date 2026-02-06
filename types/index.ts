export interface User {
  uid: string;
  email: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  emoji: string;
  createdAt: string;
  archived: boolean;
}

export interface DailyLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  completedHabitIds: string[];
}
