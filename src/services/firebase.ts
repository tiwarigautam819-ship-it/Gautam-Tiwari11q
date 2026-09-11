import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { FirestoreErrorInfo, OperationType } from '../types';

export const isFirebaseConfigured = Boolean(
  firebaseConfig?.apiKey &&
  firebaseConfig?.projectId &&
  firebaseConfig.apiKey.trim() !== '' &&
  firebaseConfig.projectId.trim() !== ''
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
    try {
      dbInstance = initializeFirestore(
        app,
        { experimentalAutoDetectLongPolling: true },
        dbId
      );
    } catch {
      dbInstance = getFirestore(app, dbId);
    }
    authInstance = getAuth(app);
  } catch (err) {
    console.error('Error initializing Firebase:', err);
  }
}

export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;

export let isFirestoreOnline = false;

export function isOfflineError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('offline') ||
    msg.includes('unavailable') ||
    msg.includes('failed-precondition') ||
    msg.includes('not-found') ||
    msg.includes('5 NOT_FOUND') ||
    msg.includes('Network Error') ||
    msg.includes('timed out') ||
    msg.includes('timeout')
  );
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 3000,
  fallbackValue?: T
): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      if (fallbackValue !== undefined) {
        resolve(fallbackValue);
      } else {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid ?? null,
      email: auth?.currentUser?.email ?? null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId ?? null,
      providerInfo:
        auth?.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot per Firebase skill guidelines
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    isFirestoreOnline = true;
  } catch (error) {
    isFirestoreOnline = false;
    if (error instanceof Error && error.message.includes('the client is offline')) {
      // Diagnostic warning: client is offline or database is not yet provisioned in Firebase console
      console.warn('Firebase connection notice: client is offline or cloud database is not yet provisioned. The app will use local storage persistence seamlessly.');
    }
  }
}

if (isFirebaseConfigured && db) {
  testConnection().catch((err) => {
    console.warn('Initial Firebase ping notice (harmless if rules deny test doc):', err?.message);
  });
}


