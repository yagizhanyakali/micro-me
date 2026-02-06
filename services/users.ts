import { doc, setDoc, getDoc } from 'firebase/firestore';
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
