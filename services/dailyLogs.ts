import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { DailyLog } from '@/types';

const DAILY_LOGS_COLLECTION = 'daily_logs';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLogDocId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

export async function getDailyLog(
  userId: string,
  date: string
): Promise<DailyLog | null> {
  const docId = getLogDocId(userId, date);
  const docRef = doc(db, DAILY_LOGS_COLLECTION, docId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as DailyLog;
}

export function subscribeToDailyLog(
  userId: string,
  date: string,
  callback: (log: DailyLog | null) => void
): Unsubscribe {
  const docId = getLogDocId(userId, date);
  const docRef = doc(db, DAILY_LOGS_COLLECTION, docId);
  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback({ id: snapshot.id, ...snapshot.data() } as DailyLog);
  });
}

export async function toggleHabitCompletion(
  userId: string,
  date: string,
  habitId: string
): Promise<boolean> {
  const docId = getLogDocId(userId, date);
  const docRef = doc(db, DAILY_LOGS_COLLECTION, docId);
  const existing = await getDoc(docRef);

  let completedHabitIds: string[] = [];
  if (existing.exists()) {
    completedHabitIds = (existing.data() as DailyLog).completedHabitIds || [];
  }

  const isCompleted = completedHabitIds.includes(habitId);
  const updatedIds = isCompleted
    ? completedHabitIds.filter((id) => id !== habitId)
    : [...completedHabitIds, habitId];

  await setDoc(docRef, {
    userId,
    date,
    completedHabitIds: updatedIds,
  });

  return !isCompleted;
}

export async function getDailyLogsForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyLog[]> {
  const q = query(
    collection(db, DAILY_LOGS_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DailyLog));
}
