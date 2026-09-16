import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { createTeacherAccountOnServer, CreateTeacherResponse } from '../services/teacherService';
import { clearCachedDriveToken } from '../services/googleDriveService';

export const ADMIN_EMAILS = [
  'tiwarigautam819@gmail.com',
  'rk89experiment@gmail.com',
];
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export const AUTHORIZED_DELETE_ADMINS = [
  'tiwarigautam819@gmail.com',
  'rk89experiment@gmail.com',
];

export function isUserAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
}

export function canUserDeleteData(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return AUTHORIZED_DELETE_ADMINS.some((adm) => adm.toLowerCase() === clean);
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  canDeleteData: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
    // Clear any previous mock/offline demo sessions to guarantee strict Firebase auth
    try {
      localStorage.removeItem(LOCAL_OFFLINE_USER_KEY);
    } catch {
      // ignore
    }

    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    let unsubscribe: () => void = () => {};
    try {
      unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        },
        (error) => {
          console.warn('Firebase onAuthStateChanged notice:', error);
          setUser(null);
          setLoading(false);
        }
      );
    } catch (err) {
      console.warn('Failed to subscribe to auth state changes:', err);
      setUser(null);
      setLoading(false);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const clearAuthError = () => setAuthError(null);

  const isAdmin = Boolean(user?.email && isUserAdminEmail(user.email));
  const canDeleteData = Boolean(user?.email && canUserDeleteData(user.email));

  const signInWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      const err = 'Please enter your email.';
      setAuthError(err);
      throw new Error(err);
    }

    if (!pass) {
      const err = 'Please enter your password.';
      setAuthError(err);
      throw new Error(err);
    }

    if (!isFirebaseConfigured || !auth) {
      const err = 'Firebase Authentication is not configured or offline.';
      setAuthError(err);
      throw new Error(err);
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
      // Successful login: onAuthStateChanged will set the authenticated user
    } catch (err: any) {
      console.warn('Firebase Auth sign-in error:', err.code, err.message);

      // If user got invalid-credential or user-not-found:
      // Check if this account needs first-time provisioning
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        try {
          console.log(`Checking first-time setup for ${cleanEmail} in Firebase Auth...`);
          await createUserWithEmailAndPassword(auth, cleanEmail, pass);
          console.log(`Account ${cleanEmail} initialized and signed in successfully.`);
          return;
        } catch (createErr: any) {
          console.warn('First-time setup check result:', createErr?.code, createErr?.message);
          if (createErr?.code === 'auth/email-already-in-use') {
            // Account already registered in Firebase, so password entered was incorrect
            const msg = isUserAdminEmail(cleanEmail)
              ? `Incorrect password for administrator (${cleanEmail}). Please verify your password or use "Forgot password?" to reset it.`
              : `Incorrect password for ${cleanEmail}. Please enter the correct password or click "Forgot password?" to reset it.`;
            setAuthError(msg);
            throw new Error(msg);
          } else if (createErr?.code === 'auth/operation-not-allowed') {
            const msg = 'Email/Password sign-in is not enabled in Firebase Console. Please enable Email/Password provider in Firebase Authentication.';
            setAuthError(msg);
            throw new Error(msg);
          } else if (createErr?.code === 'auth/weak-password') {
            const msg = 'Password must be at least 6 characters long.';
            setAuthError(msg);
            throw new Error(msg);
          }
        }
      }

      let userMsg = 'Invalid email or password. Please verify your credentials.';
      if (err.code === 'auth/user-not-found') {
        userMsg = `No account found with ${cleanEmail}. Please verify your email address.`;
      } else if (err.code === 'auth/wrong-password') {
        userMsg = `Incorrect password for ${cleanEmail}. Please check your password or use "Forgot password?".`;
      } else if (err.code === 'auth/invalid-credential') {
        userMsg = `Invalid credentials for ${cleanEmail}. Please check your password or click "Forgot password?" to reset it.`;
      } else if (err.code === 'auth/invalid-email') {
        userMsg = 'Invalid email address format. Please enter a valid email.';
      } else if (err.code === 'auth/user-disabled') {
        userMsg = 'This account has been disabled in Firebase Authentication.';
      } else if (err.code === 'auth/operation-not-allowed') {
        userMsg = 'Email/Password provider is not enabled in Firebase Console.';
      } else if (err.code === 'auth/too-many-requests') {
        userMsg = 'Access temporarily blocked due to many failed login attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        userMsg = 'Network connection error. Please check your internet connection.';
      } else if (err.message && typeof err.message === 'string') {
        userMsg = err.message;
      }

      setAuthError(userMsg);
      throw new Error(userMsg);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      const err = 'Please enter a valid email address.';
      setAuthError(err);
      throw new Error(err);
    }

    if (!pass || pass.length < 6) {
      const err = 'Password must be at least 6 characters long.';
      setAuthError(err);
      throw new Error(err);
    }

    if (!isFirebaseConfigured || !auth) {
      const err = 'Firebase Authentication is not configured or offline.';
      setAuthError(err);
      throw new Error(err);
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      if (name && userCred.user) {
        try {
          const { updateProfile } = await import('firebase/auth');
          await updateProfile(userCred.user, { displayName: name.trim() });
        } catch {
          // ignore display name update failure
        }
      }
    } catch (err: any) {
      console.error('Sign up error:', err?.code, err?.message);
      let msg = 'Failed to create account.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = `An account with ${cleanEmail} already exists. Please log in with your password or use "Continue with Google".`;
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters long.';
      } else if (err?.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is not enabled in Firebase Console. Please click "Continue with Google" to sign in.';
      } else if (err?.message) {
        msg = err.message;
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Please enter your email address to receive a password reset link.');
    }
    if (!isFirebaseConfigured || !auth) {
      throw new Error('Firebase Authentication is not configured.');
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      console.error('Password reset error:', err?.code, err?.message);
      let msg = 'Failed to send password reset email.';
      if (err?.code === 'auth/user-not-found') {
        msg = `No account found with email "${cleanEmail}".`;
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Invalid email address.';
      } else if (err?.message) {
        msg = err.message;
      }
      setAuthError(msg);
      throw new Error(msg);
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
    if (!isFirebaseConfigured || !auth) {
      const err = 'Firebase Authentication is not configured or offline.';
      setAuthError(err);
      throw new Error(err);
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      try {
        localStorage.removeItem(LOCAL_OFFLINE_USER_KEY);
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.warn('Google sign-in notice:', err?.code, err?.message);
      if (err?.code === 'auth/popup-closed-by-user') {
        return;
      }
      let msg = 'Google sign-in could not be completed.';
      if (err?.code === 'auth/popup-blocked') {
        msg = 'Popup was blocked by your browser. Please allow popups for this window or sign in with your email and password.';
      } else if (err?.code === 'auth/cancelled-popup-request') {
        return;
      } else if (err?.message) {
        msg = err.message;
      }
      setAuthError(msg);
      throw new Error(msg);
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
        canDeleteData,
        isConfigured: isFirebaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
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

