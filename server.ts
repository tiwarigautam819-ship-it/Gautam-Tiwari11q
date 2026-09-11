import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const ADMIN_EMAILS = [
  'tiwarigautam819@gmail.com',
  'rk89experiment@gmail.com',
];
const ADMIN_EMAIL = ADMIN_EMAILS[0];

// Express body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load Firebase configuration
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Failed to read firebase-applet-config.json:', err);
  }
}
const API_KEY = firebaseConfig.apiKey || '';

// Data directory for teachers metadata and persistent students
const DATA_DIR = path.join(process.cwd(), 'data');
const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const DELETED_STUDENTS_FILE = path.join(DATA_DIR, 'deleted_students.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEACHERS_FILE)) {
    fs.writeFileSync(TEACHERS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(STUDENTS_FILE)) {
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(DELETED_STUDENTS_FILE)) {
    fs.writeFileSync(DELETED_STUDENTS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(ATTENDANCE_FILE)) {
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

function getStoredAttendance(): Record<string, any> {
  try {
    ensureDataDir();
    const data = fs.readFileSync(ATTENDANCE_FILE, 'utf8');
    return JSON.parse(data) || {};
  } catch {
    return {};
  }
}

function saveStoredAttendance(attendanceMap: Record<string, any>) {
  try {
    ensureDataDir();
    fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(attendanceMap, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save attendance file:', err);
  }
}

function getStoredTeachers(): any[] {
  try {
    ensureDataDir();
    const data = fs.readFileSync(TEACHERS_FILE, 'utf8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

function getStoredStudents(): any[] {
  try {
    ensureDataDir();
    const data = fs.readFileSync(STUDENTS_FILE, 'utf8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

function getDeletedStudentIds(): string[] {
  try {
    ensureDataDir();
    const data = fs.readFileSync(DELETED_STUDENTS_FILE, 'utf8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

function saveStoredStudents(students: any[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save students to file:', err);
  }
}

function recordDeletedStudentId(id: string) {
  try {
    ensureDataDir();
    const current = getDeletedStudentIds();
    if (!current.includes(id)) {
      current.push(id);
      fs.writeFileSync(DELETED_STUDENTS_FILE, JSON.stringify(current, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Failed to record deleted student id:', err);
  }
}

function removeDeletedStudentId(id: string) {
  try {
    ensureDataDir();
    const current = getDeletedStudentIds().filter((d) => d !== id);
    fs.writeFileSync(DELETED_STUDENTS_FILE, JSON.stringify(current, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to update deleted student list:', err);
  }
}

function saveTeacherRecord(teacher: { uid: string; name: string; email: string; createdAt: string; createdBy: string }) {
  try {
    ensureDataDir();
    const list = getStoredTeachers();
    // Check if already exists in list
    const existingIdx = list.findIndex((t: any) => t.email.toLowerCase() === teacher.email.toLowerCase());
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...teacher };
    } else {
      list.push(teacher);
    }
    fs.writeFileSync(TEACHERS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist teacher metadata:', err);
  }
}

/**
 * Server-side Admin Authorization Verification.
 * Cryptographically verifies caller's Firebase ID token with Google Identity Toolkit,
 * and strictly ensures caller is tiwarigautam819@gmail.com.
 */
async function verifyAdminCaller(req: express.Request): Promise<{
  valid: boolean;
  email?: string;
  uid?: string;
  error?: string;
  status?: number;
}> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Authentication required. Authorization Bearer token is missing.',
      status: 401,
    };
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    return {
      valid: false,
      error: 'Authentication failed. Empty session token.',
      status: 401,
    };
  }

  if (!API_KEY) {
    return {
      valid: false,
      error: 'Server configuration error: Firebase API Key not found.',
      status: 500,
    };
  }

  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!lookupRes.ok) {
      const errData = (await lookupRes.json().catch(() => ({}))) as any;
      const message = errData?.error?.message || 'Token verification failed';
      return {
        valid: false,
        error: `Authentication failed: ${message}`,
        status: 401,
      };
    }

    const lookupData = (await lookupRes.json()) as any;
    const callerUser = lookupData.users?.[0];

    if (!callerUser || !callerUser.email) {
      return {
        valid: false,
        error: 'Unable to identify the authenticated user.',
        status: 401,
      };
    }

    const callerEmail = callerUser.email.toLowerCase().trim();

    // STRICT SERVER-SIDE AUTHORIZATION CHECK
    if (!ADMIN_EMAILS.some((adm) => adm.toLowerCase() === callerEmail)) {
      console.warn(`[SECURITY ALERT] Unauthorized teacher creation attempt by non-admin: ${callerEmail}`);
      return {
        valid: false,
        error: `Forbidden: Only the Administrator (${ADMIN_EMAILS.join(' or ')}) has permission to create teacher accounts.`,
        status: 403,
      };
    }

    return {
      valid: true,
      email: callerEmail,
      uid: callerUser.localId,
    };
  } catch (err: any) {
    console.error('Server error during token verification:', err);
    return {
      valid: false,
      error: 'Server error while verifying user credentials.',
      status: 500,
    };
  }
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SGI Attendance Full-Stack API',
    adminEmail: ADMIN_EMAIL,
    timestamp: new Date().toISOString(),
  });
});

// =============================================================
// PERSISTENT STUDENT REPOSITORY API
// Guarantees students survive browser refreshes & cache clears!
// =============================================================

// Get all persistent students and deleted student records
app.get('/api/students', (req, res) => {
  const students = getStoredStudents();
  const deletedIds = getDeletedStudentIds();
  res.json({ students, deletedIds });
});

// Upsert a student or array of students permanently
app.post('/api/students', (req, res) => {
  const { student, students } = req.body;
  const toUpsert = students || (student ? [student] : []);

  if (!Array.isArray(toUpsert) || toUpsert.length === 0) {
    return res.status(400).json({ error: 'No student data provided.' });
  }

  const existingList = getStoredStudents();

  for (const item of toUpsert) {
    if (!item || !item.id) continue;
    // If student was previously marked deleted, unmark it
    removeDeletedStudentId(item.id);

    const idx = existingList.findIndex(
      (s: any) => s.id === item.id || (s.rollNumber && s.rollNumber.toLowerCase() === String(item.rollNumber).toLowerCase())
    );

    if (idx >= 0) {
      existingList[idx] = {
        ...existingList[idx],
        ...item,
        updatedAt: item.updatedAt || new Date().toISOString(),
      };
    } else {
      existingList.push({
        ...item,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
    }
  }

  saveStoredStudents(existingList);
  res.json({ success: true, count: existingList.length, students: existingList });
});

// Delete a student permanently
app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Student ID is required.' });
  }

  const existingList = getStoredStudents();
  const filtered = existingList.filter((s: any) => s.id !== id);
  saveStoredStudents(filtered);
  recordDeletedStudentId(id);

  res.json({ success: true, message: 'Student deleted successfully.' });
});

// -------------------------------------------------------------
// ATTENDANCE SERVER-SIDE PERSISTENCE ENDPOINTS
// -------------------------------------------------------------

// Fetch all recorded attendance records grouped by date
app.get('/api/attendance', (req, res) => {
  const attendance = getStoredAttendance();
  res.json(attendance);
});

// Fetch attendance for a specific date (YYYY-MM-DD)
app.get('/api/attendance/:date', (req, res) => {
  const { date } = req.params;
  const attendance = getStoredAttendance();
  res.json(attendance[date] || {});
});

// Save/update attendance records for a specific date
app.post('/api/attendance', (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Date and records array are required.' });
  }

  const allAttendance = getStoredAttendance();
  const currentForDate: Record<string, string> = allAttendance[date] || {};

  for (const item of records) {
    if (item && item.studentId) {
      currentForDate[item.studentId] = item.status || 'Present';
    }
  }

  allAttendance[date] = currentForDate;
  saveStoredAttendance(allAttendance);

  res.json({
    success: true,
    date,
    count: Object.keys(currentForDate).length,
  });
});

// -------------------------------------------------------------
// GOOGLE DRIVE PERSISTENCE & UPLOAD PIPELINE
// -------------------------------------------------------------
let activeGoogleDriveToken: string | null = null;
let googleDriveAdminEmail: string = 'rk89experiment@gmail.com';

async function getOrCreateAttendanceFolder(accessToken: string): Promise<string | null> {
  try {
    const q = "mimeType='application/vnd.google-apps.folder' and name='Sobhasaria Attendance Records' and trashed=false";
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (searchRes.ok) {
      const data: any = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Create the folder if it doesn't exist
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Sobhasaria Attendance Records',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Auto-synced daily attendance sheets from Sobhasaria Attendance App',
      }),
    });
    if (createRes.ok) {
      const folderData: any = await createRes.json();
      return folderData.id;
    }
  } catch (err) {
    console.warn('[Google Drive] Folder lookup notice:', err);
  }
  return null;
}

async function uploadCsvToGoogleDrive(accessToken: string, fileName: string, csvContent: string) {
  const folderId = await getOrCreateAttendanceFolder(accessToken);

  let queryStr = `name='${fileName.replace(/'/g, "\\'")}' and trashed=false`;
  if (folderId) {
    queryStr += ` and '${folderId}' in parents`;
  }

  let existingFileId: string | null = null;
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (searchRes.ok) {
      const searchData: any = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        existingFileId = searchData.files[0].id;
      }
    }
  } catch (err) {
    console.warn('[Google Drive] Search notice:', err);
  }

  if (existingFileId) {
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'text/csv; charset=UTF-8',
        },
        body: csvContent,
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to update existing Drive file: ${errText}`);
    }
    return await updateRes.json();
  }

  const boundary = `-------DriveBoundary${Date.now()}`;
  const metadata: any = {
    name: fileName,
    mimeType: 'text/csv',
    description: 'Daily Attendance Sheet from Sobhasaria Attendance App',
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

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
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Drive upload failed: ${errText}`);
  }

  return await uploadRes.json();
}

// Receive and store active Google Drive token from Admin sign-in
app.post('/api/drive/token', (req, res) => {
  const { token, email } = req.body;
  if (token) {
    activeGoogleDriveToken = token;
    if (email) googleDriveAdminEmail = email;
    console.log(`[Google Drive] Token updated for ${googleDriveAdminEmail}`);
  }
  res.json({
    success: true,
    hasToken: Boolean(activeGoogleDriveToken),
    adminEmail: googleDriveAdminEmail,
  });
});

// Check current Google Drive connection status
app.get('/api/drive/status', (req, res) => {
  res.json({
    connected: Boolean(activeGoogleDriveToken),
    adminEmail: googleDriveAdminEmail,
  });
});

// Upload attendance to Google Drive endpoint (called automatically whenever attendance is saved by any user)
app.post('/api/drive/upload-attendance', async (req, res) => {
  const { date, csvContent, filename, token } = req.body;
  const effectiveToken = token || activeGoogleDriveToken;

  if (!effectiveToken) {
    // Attendance is still saved locally and on the server, gracefully report queued status
    return res.status(200).json({
      success: false,
      queued: true,
      message: 'Drive session token pending. Attendance is safely saved in local and server database.',
    });
  }

  if (!csvContent) {
    return res.status(400).json({ error: 'csvContent is required.' });
  }

  try {
    const fileTitle = filename || `Attendance_${date || new Date().toISOString().split('T')[0]}_CSE_A.csv`;
    const result = await uploadCsvToGoogleDrive(effectiveToken, fileTitle, csvContent);
    return res.json({ success: true, fileId: result.id, name: result.name });
  } catch (err: any) {
    console.error('[Google Drive] Upload failed:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Verify if caller is Admin (Server-enforced check)
app.get('/api/admin/check-admin', async (req, res) => {
  const check = await verifyAdminCaller(req);
  if (!check.valid) {
    return res.status(check.status || 403).json({
      isAdmin: false,
      error: check.error,
    });
  }
  return res.json({
    isAdmin: true,
    email: check.email,
    uid: check.uid,
  });
});

// Fetch list of registered teachers created by Admin
app.get('/api/admin/teachers', async (req, res) => {
  const check = await verifyAdminCaller(req);
  if (!check.valid) {
    return res.status(check.status || 403).json({ error: check.error });
  }

  const teachers = getStoredTeachers();
  res.json({ teachers });
});

// Admin endpoint to create a new Teacher Account
app.post('/api/admin/create-teacher', async (req, res) => {
  // 1. Strictly verify Admin authorization on server
  const check = await verifyAdminCaller(req);
  if (!check.valid) {
    return res.status(check.status || 403).json({ error: check.error });
  }

  const { name, email, password } = req.body;

  // 2. Validate input fields
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter a valid teacher name (at least 2 characters).' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address for the teacher.' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanedEmail = email.trim().toLowerCase();
  const cleanedName = name.trim();

  // Prevent creating account with the admin's exact email through this endpoint
  if (cleanedEmail === ADMIN_EMAIL.toLowerCase()) {
    return res.status(400).json({ error: 'The administrator account already exists and cannot be duplicated.' });
  }

  // 3. Create the Teacher in Firebase Authentication securely
  // We call Firebase Identity Toolkit API directly with returnSecureToken: false
  // so the Admin's session is completely undisturbed!
  try {
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanedEmail,
          password: password,
          displayName: cleanedName,
          returnSecureToken: false,
        }),
      }
    );

    const data = (await signUpRes.json()) as any;

    if (!signUpRes.ok) {
      const errMsg = data?.error?.message;
      if (errMsg === 'EMAIL_EXISTS') {
        return res.status(409).json({
          error: `Teacher account with email "${cleanedEmail}" already exists.`,
        });
      }
      if (errMsg && errMsg.includes('WEAK_PASSWORD')) {
        return res.status(400).json({
          error: 'Password should be at least 6 characters long.',
        });
      }
      if (errMsg === 'OPERATION_NOT_ALLOWED') {
        return res.status(400).json({
          error: 'Email/Password authentication provider is not enabled in Firebase Console.',
        });
      }
      return res.status(400).json({
        error: errMsg || 'Failed to create teacher account in Firebase Authentication.',
      });
    }

    const newUid = data.localId;

    // 4. Save teacher metadata record in server database (WITHOUT PASSWORDS!)
    saveTeacherRecord({
      uid: newUid,
      name: cleanedName,
      email: cleanedEmail,
      createdAt: new Date().toISOString(),
      createdBy: check.email || ADMIN_EMAIL,
    });

    console.log(`[TEACHER CREATED] Admin ${check.email} created teacher account for ${cleanedName} (${cleanedEmail})`);

    return res.status(201).json({
      success: true,
      message: `Teacher account for "${cleanedName}" (${cleanedEmail}) has been created successfully. The teacher can now log in using their email and password.`,
      teacher: {
        uid: newUid,
        name: cleanedName,
        email: cleanedEmail,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Server error creating teacher account:', err);
    return res.status(500).json({
      error: 'An internal error occurred on the server while creating the teacher account.',
    });
  }
});

// -------------------------------------------------------------
// VITE / STATIC SERVING SETUP
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SGI Attendance Server running on port ${PORT}`);
    console.log(`Single App Administrator: ${ADMIN_EMAIL}`);
  });
}

startServer();
