import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { User } from '@/types';

const USERS_COLLECTION = 'users';

export async function createUserDocument(uid: string, email: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const existing = await getDoc(userRef);
  if (!existing.exists()) {
    await setDoc(userRef, {
      uid,
      email,
      createdAt: new Date().toISOString(),
    });
  }
}

export async function getUserDocument(uid: string): Promise<User | null> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) return null;
  return snapshot.data() as User;
}

/**
 * Delete all Firestore data associated with a user:
 * habits (including archived), daily logs, and the user document.
 */
export async function deleteUserData(uid: string): Promise<void> {
  const batch = writeBatch(db);

  // Delete all habits (including archived)
  const habitsSnapshot = await getDocs(
    query(collection(db, 'habits'), where('userId', '==', uid))
  );
  habitsSnapshot.docs.forEach((d) => batch.delete(d.ref));

  // Delete all daily logs
  const logsSnapshot = await getDocs(
    query(collection(db, 'daily_logs'), where('userId', '==', uid))
  );
  logsSnapshot.docs.forEach((d) => batch.delete(d.ref));

  // Delete user document
  batch.delete(doc(db, USERS_COLLECTION, uid));

  await batch.commit();
}
