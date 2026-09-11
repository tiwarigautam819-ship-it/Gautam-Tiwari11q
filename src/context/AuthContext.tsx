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
import { signInWithGoogleDrive, clearCachedDriveToken } from '../services/googleDriveService';

export const ADMIN_EMAILS = [
  'tiwarigautam819@gmail.com',
  'rk89experiment@gmail.com',
];
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export function isUserAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInDemo: (role?: 'admin' | 'teacher') => void;
  createTeacher: (name: string, email: string, pass: string) => Promise<CreateTeacherResponse>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_OFFLINE_USER_KEY = 'sgi_active_offline_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if there is an offline session saved
    try {
      const savedUser = localStorage.getItem(LOCAL_OFFLINE_USER_KEY);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Strict safety timeout: If Firebase auth determination takes more than 1000ms,
    // immediately end loading so the user is never stuck on a spinner screen.
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    let unsubscribe: () => void = () => {};
    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          clearTimeout(safetyTimer);
          setUser(currentUser);
          setLoading(false);
        },
        (error) => {
          clearTimeout(safetyTimer);
          console.warn('Firebase onAuthStateChanged notice:', error);
          setUser(null);
          setLoading(false);
        }
      );
    } catch (err) {
      clearTimeout(safetyTimer);
      console.warn('Failed to subscribe to auth state changes:', err);
      setUser(null);
      setLoading(false);
    }

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const clearAuthError = () => setAuthError(null);

  const isAdmin = Boolean(user?.email && isUserAdminEmail(user.email));

  const signInDemo = (role: 'admin' | 'teacher' = 'admin') => {
    const demoEmail = role === 'admin' ? 'rk89experiment@gmail.com' : 'teacher@sobhasaria.edu.in';
    const mockUser: any = {
      uid: `demo_${Date.now()}`,
      email: demoEmail,
      displayName: role === 'admin' ? 'SGI Administrator' : 'Faculty Member',
      emailVerified: true,
      getIdToken: async () => 'demo-token',
    };
    setUser(mockUser);
    try {
      localStorage.setItem(LOCAL_OFFLINE_USER_KEY, JSON.stringify(mockUser));
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();

    // If offline demo account attempted or Firebase is unavailable
    if (!isFirebaseConfigured || !auth) {
      if (pass.length >= 4) {
        signInDemo(isUserAdminEmail(cleanEmail) ? 'admin' : 'teacher');
        return;
      }
      setAuthError('Firebase is not configured. Please enter password (min 4 chars) to log in.');
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
      localStorage.removeItem(LOCAL_OFFLINE_USER_KEY);
    } catch (err: any) {
      console.warn('Sign-in attempt failed for:', cleanEmail, err.code);

      // If this is one of the designated Admin emails and account does not exist in Firebase yet:
      if (
        isUserAdminEmail(cleanEmail) &&
        (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')
      ) {
        try {
          // Initialize/Bootstrap Admin in Firebase Auth with the entered password
          await createUserWithEmailAndPassword(auth, cleanEmail, pass);
          localStorage.removeItem(LOCAL_OFFLINE_USER_KEY);
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

      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/network-request-failed') {
        // Offer graceful offline login if Firebase Auth service is unreachable
        signInDemo(isUserAdminEmail(cleanEmail) ? 'admin' : 'teacher');
        return;
      } else if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        if (isUserAdminEmail(cleanEmail)) {
          setAuthError('Invalid password for Administrator. Please check your password.');
        } else {
          setAuthError('Invalid email or password. Teacher accounts can only be created by the Administrator.');
        }
      } else {
        setAuthError(err.message || 'Failed to sign in. Please verify your credentials.');
      }
      throw err;
    }
  };

  /**
   * Admin-only Teacher Creation.
   */
  const createTeacher = async (name: string, email: string, pass: string): Promise<CreateTeacherResponse> => {
    if (!user) {
      throw new Error('You must be logged in to create a teacher account.');
    }

    if (!isAdmin) {
      throw new Error('Access denied. Only the Administrator can create teacher accounts.');
    }

    let idToken = 'demo-token';
    try {
      if (typeof user.getIdToken === 'function') {
        idToken = await user.getIdToken(true);
      }
    } catch {
      // ignore
    }

    const result = await createTeacherAccountOnServer(idToken, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: pass,
    });

    return result;
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithGoogleDrive();
      if (result?.user) {
        setUser(result.user);
        try {
          localStorage.removeItem(LOCAL_OFFLINE_USER_KEY);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError(err?.message || 'Google sign-in failed. Please try again.');
      }
      throw err;
    }
  };

  const logout = async () => {
    setAuthError(null);
    clearCachedDriveToken();
    try {
      localStorage.removeItem(LOCAL_OFFLINE_USER_KEY);
    } catch {
      // ignore
    }
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
        signInWithGoogle,
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

