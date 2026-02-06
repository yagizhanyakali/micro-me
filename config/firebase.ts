import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase.creds';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase v12 automatically uses the correct persistence for the platform.
// On React Native, the "react-native" export map is resolved, which includes
// AsyncStorage-based persistence out of the box.
const auth = getAuth(app);

const db = getFirestore(app);

export { app, auth, db };
