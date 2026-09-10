import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { createTeacherAccountOnServer, CreateTeacherResponse } from '../services/teacherService';

export const ADMIN_EMAIL = 'tiwarigautam819@gmail.com';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  createTeacher: (name: string, email: string, pass: string) => Promise<CreateTeacherResponse>;
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

  const isAdmin = Boolean(
    user && user.email && user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase()
  );

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    if (!isFirebaseConfigured || !auth) {
      setAuthError('Firebase connection is not configured. Please check your project settings.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
    } catch (err: any) {
      console.warn('Sign-in attempt failed for:', cleanEmail, err.code);

      // If this is the designated single Admin email and account does not exist in Firebase yet:
      if (
        cleanEmail === ADMIN_EMAIL.toLowerCase() &&
        (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')
      ) {
        try {
          // Initialize/Bootstrap Admin in Firebase Auth with the entered password
          await createUserWithEmailAndPassword(auth, cleanEmail, pass);
          return;
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            setAuthError('Invalid password for Administrator account. Please try again.');
            throw err;
          } else if (createErr.code === 'auth/weak-password') {
            setAuthError('Admin password must be at least 6 characters.');
            throw createErr;
          }
        }
      }

      if (err.code === 'auth/operation-not-allowed') {
        setAuthError('Email/Password sign-in provider is not enabled in Firebase Console.');
      } else if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
          setAuthError('Invalid password for Administrator. Please check your password.');
        } else {
          setAuthError('Invalid email or password. Teacher accounts can only be created by the Administrator (tiwarigautam819@gmail.com).');
        }
      } else {
        setAuthError(err.message || 'Failed to sign in. Please verify your credentials.');
      }
      throw err;
    }
  };

  /**
   * Admin-only Teacher Creation.
   * Invokes the server-side API which verifies the Admin's ID token and creates the account.
   */
  const createTeacher = async (name: string, email: string, pass: string): Promise<CreateTeacherResponse> => {
    if (!user) {
      throw new Error('You must be logged in to create a teacher account.');
    }

    if (!isAdmin) {
      throw new Error('Access denied. Only the Administrator (tiwarigautam819@gmail.com) can create teacher accounts.');
    }

    // Force refresh the token to pass a valid, unexpired token to the backend
    const idToken = await user.getIdToken(true);
    const result = await createTeacherAccountOnServer(idToken, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: pass,
    });

    return result;
  };

  const logout = async () => {
    setAuthError(null);
    if (auth) {
      try {
        await fbSignOut(auth);
      } catch {
        // ignore
      }
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isConfigured: isFirebaseConfigured,
        signInWithEmail,
        createTeacher,
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

