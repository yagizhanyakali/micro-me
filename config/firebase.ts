import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-expect-error: getReactNativePersistence exists in the RN bundle resolved by Metro, but the top-level "types" condition in @firebase/auth's exports map shadows the react-native types
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase client config — these are public client-side identifiers, not secrets.
// Security is enforced by Firestore rules and Firebase Auth, not by hiding these keys.
const firebaseConfig = {
  apiKey: 'AIzaSyBFZY1557inxc4C4kXFBL7G0EXdhb7R0kg',
  authDomain: 'micro-me-67a19.firebaseapp.com',
  projectId: 'micro-me-67a19',
  storageBucket: 'micro-me-67a19.firebasestorage.app',
  messagingSenderId: '309753964138',
  appId: '1:309753964138:web:bb4ba50fd0bc1f5ff74c13',
  measurementId: 'G-CBJK65SWZ2',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getApps().length === 1
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app);

const db = getFirestore(app);

export { app, auth, db };
