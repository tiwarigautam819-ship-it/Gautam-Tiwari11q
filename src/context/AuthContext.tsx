import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const clearAuthError = () => setAuthError(null);

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      setAuthError('Firebase is disconnected. Please provide your new Firebase project configuration.');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error('Email sign in error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Email/Password provider is not yet activated in Firebase console.');
      } else if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setAuthError('Invalid email or password. If you do not have an account yet, click "Need a teacher login? Register here" below.');
      } else {
        setAuthError(err.message || 'Failed to sign in.');
      }
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      setAuthError('Firebase is disconnected. Please provide your new Firebase project configuration.');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error('Email register error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Email/Password provider is not activated in Firebase console.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('An account with this email already exists. Please switch to "Already have an account? Log In" and sign in.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('Password should be at least 6 characters.');
      } else {
        setAuthError(err.message || 'Failed to create account.');
      }
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      setAuthError('Firebase is disconnected. Please provide your new Firebase project configuration.');
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setAuthError('Google Sign-In is blocked because this preview domain is not in Authorized Domains. Please use Email & Password above to login or register (no domain setup required).');
      } else {
        setAuthError(err.message || 'Failed to sign in with Google.');
      }
      throw err;
    }
  };

  const logout = async () => {
    setAuthError(null);
    if (auth) {
      await fbSignOut(auth);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isFirebaseConfigured,
        signInWithEmail,
        registerWithEmail,
        signInWithGoogle,
        logout,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
