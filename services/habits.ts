import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Habit } from '@/types';

const HABITS_COLLECTION = 'habits';
const MAX_HABITS = 4;

export async function getActiveHabits(userId: string): Promise<Habit[]> {
  const q = query(
    collection(db, HABITS_COLLECTION),
    where('userId', '==', userId),
    where('archived', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Habit));
}

export function subscribeToHabits(
  userId: string,
  callback: (habits: Habit[]) => void
): Unsubscribe {
  const q = query(
    collection(db, HABITS_COLLECTION),
    where('userId', '==', userId),
    where('archived', '==', false)
  );
  return onSnapshot(q, (snapshot) => {
    const habits = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Habit));
    callback(habits);
  });
}

export async function addHabit(
  userId: string,
  title: string,
  emoji: string
): Promise<string> {
  const existing = await getActiveHabits(userId);
  if (existing.length >= MAX_HABITS) {
    throw new Error(`You can only have ${MAX_HABITS} active habits at a time.`);
  }

  const docRef = await addDoc(collection(db, HABITS_COLLECTION), {
    userId,
    title,
    emoji,
    createdAt: new Date().toISOString(),
    archived: false,
  });

  return docRef.id;
}

export async function deleteHabit(habitId: string): Promise<void> {
  await updateDoc(doc(db, HABITS_COLLECTION, habitId), {
    archived: true,
  });
}

export async function permanentlyDeleteHabit(habitId: string): Promise<void> {
  await deleteDoc(doc(db, HABITS_COLLECTION, habitId));
}
