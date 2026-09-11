import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase';

/**
  * Official Google Drive Scopes configured for Sobhasaria Attendance App
  */
export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
];

// In-memory access token cache (MANDATORY: never stored in localStorage/sessionStorage)
let inMemoryAccessToken: string | null = null;
let inMemoryDriveUser: User | null = null;

export function getCachedDriveAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setCachedDriveAccessToken(token: string | null, user: User | null = null): void {
  inMemoryAccessToken = token;
  inMemoryDriveUser = user;

  // Seamlessly inform the backend server about the active Drive token
  if (token) {
    try {
      fetch('/api/drive/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: user?.email || 'rk89experiment@gmail.com' }),
      }).catch(() => {});
    } catch {
      // non-blocking
    }
  }
}

export function clearCachedDriveToken(): void {
  inMemoryAccessToken = null;
  inMemoryDriveUser = null;
}

/**
 * Initiates official Google Sign-In with Google Drive scopes.
 */
export async function signInWithGoogleDrive(): Promise<{ user: User; accessToken: string } | null> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  const provider = new GoogleAuthProvider();
  SCOPES.forEach((scope) => provider.addScope(scope));

  // Prompt account selection
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;

    if (accessToken) {
      setCachedDriveAccessToken(accessToken, result.user);
      return { user: result.user, accessToken };
    }

    return { user: result.user, accessToken: '' };
  } catch (error: any) {
    console.error('Google Sign-In with Drive error:', error);
    throw error;
  }
}

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  message?: string;
  queued?: boolean;
}

export async function checkDriveConnectionStatus(): Promise<{ connected: boolean; adminEmail: string }> {
  if (inMemoryAccessToken) {
    return { connected: true, adminEmail: inMemoryDriveUser?.email || 'rk89experiment@gmail.com' };
  }
  try {
    const res = await fetch('/api/drive/status');
    if (res.ok) {
      const data = await res.json();
      return { connected: Boolean(data.connected), adminEmail: data.adminEmail || 'rk89experiment@gmail.com' };
    }
  } catch {
    // ignore
  }
  return { connected: false, adminEmail: 'rk89experiment@gmail.com' };
}

/**
 * Uploads an attendance CSV file to Google Drive.
 * Works seamlessly whether called directly by the Admin, by a Teacher, or in Demo mode:
 * 1. Tries direct client-side upload if the client has an active token.
 * 2. Falls back to backend server upload (/api/drive/upload-attendance) using the configured Admin Drive connection.
 * 3. Never throws unhandled exceptions that block or freeze the UI.
 */
export async function uploadAttendanceToDrive(
  dateStr: string,
  csvContent: string,
  fileName?: string
): Promise<DriveUploadResult> {
  const finalFilename = fileName || `Attendance_${dateStr}_CSE_A.csv`;

  // 1. If in-memory client token is available, attempt client-side direct upload
  if (inMemoryAccessToken) {
    try {
      const boundary = `-------DriveBoundary${Date.now()}`;
      const metadata = {
        name: finalFilename,
        mimeType: 'text/csv',
        description: `Daily Attendance for ${dateStr} - Sobhasaria Group of Institutions`,
      };

      const multipartBody =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: text/csv; charset=UTF-8\r\n\r\n` +
        `${csvContent}\r\n` +
        `--${boundary}--`;

      const uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${inMemoryAccessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        }
      );

      if (uploadRes.ok) {
        const data = await uploadRes.json();
        return { success: true, fileId: data.id };
      }
    } catch (clientErr) {
      console.warn('Client-side Drive upload error, trying server-side relay:', clientErr);
    }
  }

  // 2. Delegate to server-side drive backup endpoint
  try {
    const res = await fetch('/api/drive/upload-attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateStr,
        csvContent,
        filename: finalFilename,
        token: inMemoryAccessToken || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: Boolean(data.success),
        fileId: data.fileId,
        message: data.message,
        queued: Boolean(data.queued),
      };
    }
  } catch (serverErr) {
    console.warn('Server Drive upload error:', serverErr);
  }

  return {
    success: false,
    queued: true,
    message: 'Attendance stored safely in local database. Drive sync pending.',
  };
}
