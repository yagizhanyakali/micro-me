import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Firebase v12 automatically uses the correct persistence for the platform.
// On React Native, the "react-native" export map is resolved, which includes
// AsyncStorage-based persistence out of the box.
const auth = getAuth(app);

const db = getFirestore(app);

export { app, auth, db };
