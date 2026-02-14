import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { Alert } from 'react-native';
import { auth } from '@/config/firebase';
import { createUserDocument, deleteUserData } from '@/services/users';

// Lazy-load Google Sign-In so the app doesn't crash in Expo Go
// (the native module is only available in a development/production build)
let GoogleSignin: any = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch {
  // Native module not available (running in Expo Go)
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  googleSignInAvailable: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const googleSignInAvailable = GoogleSignin != null;

  useEffect(() => {
    // Configure Google Sign-In only if the native module is available
    if (GoogleSignin) {
      GoogleSignin.configure({
        webClientId: '309753964138-aj9nrf2obtkbtg0c8gpium6ec1rbk61f.apps.googleusercontent.com',
      });
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await createUserDocument(credential.user.uid, email);
  };

  const signInWithGoogle = async () => {
    if (!GoogleSignin) {
      Alert.alert(
        'Not Available',
        'Google Sign-In requires a development build. It is not supported in Expo Go.'
      );
      return;
    }

    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult?.data?.idToken;
      if (!idToken) throw new Error('No ID token found');

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, googleCredential);
      await createUserDocument(result.user.uid, result.user.email || '');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const deleteAccount = async () => {
    if (!user) throw new Error('Not authenticated');
    // Delete all Firestore data first, then the auth account
    await deleteUserData(user.uid);
    await user.delete();
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, googleSignInAvailable, signIn, signUp, signInWithGoogle, resetPassword, deleteAccount, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
