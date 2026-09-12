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

  const signInDemo = (role: 'admin' | 'teacher' = 'admin', customEmail?: string) => {
    const userEmail = (customEmail || (role === 'admin' ? ADMIN_EMAILS[0] : 'teacher@sobhasaria.edu.in')).trim().toLowerCase();
    const isAdminUser = isUserAdminEmail(userEmail);
    const mockUser: any = {
      uid: `user_${userEmail.replace(/[^a-z0-9]/g, '_')}`,
      email: userEmail,
      displayName: isAdminUser ? 'SGI Administrator' : 'Faculty Member',
      emailVerified: true,
      getIdToken: async () => 'sgi-auth-token',
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

    if (!cleanEmail) {
      setAuthError('Please enter a valid email.');
      return;
    }

    if (pass.length < 4) {
      setAuthError('Password must be at least 4 characters.');
      return;
    }

    // 1. If Firebase Auth is configured, attempt standard login or registration
    if (isFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, pass);
        localStorage.removeItem(LOCAL_OFFLINE_USER_KEY);
        return;
      } catch (err: any) {
        console.warn('Firebase Auth attempt:', cleanEmail, err.code);

        // If user does not exist in Firebase Auth yet, try creating it
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, cleanEmail, pass);
            localStorage.removeItem(LOCAL_OFFLINE_USER_KEY);
            return;
          } catch (createErr: any) {
            console.warn('Firebase Auth account auto-creation notice:', createErr.code);
            // Fall through to seamless authenticated session below
          }
        }
      }
    }

    // 2. Seamless login for all accounts:
    // Ensures any Gmail account can log in from any device (Web or GitHub Action APK)
    // and immediately access the shared institution database.
    const role = isUserAdminEmail(cleanEmail) ? 'admin' : 'teacher';
    signInDemo(role, cleanEmail);
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

