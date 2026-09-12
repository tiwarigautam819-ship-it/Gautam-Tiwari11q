import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import nodemailer, { type Transporter } from 'nodemailer';

const app = express();
const PORT = 3000;

// Enable CORS for Android APKs, PWAs, and external clients
app.use(cors({ origin: true, credentials: true }));
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
const GMAIL_RECORDS_FILE = path.join(DATA_DIR, 'gmail_attendance_records.json');
const EXCEL_REPORTS_DIR = path.join(DATA_DIR, 'excel_reports');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(EXCEL_REPORTS_DIR)) {
    fs.mkdirSync(EXCEL_REPORTS_DIR, { recursive: true });
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
  if (!fs.existsSync(GMAIL_RECORDS_FILE)) {
    fs.writeFileSync(GMAIL_RECORDS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

function getStoredGmailRecords(): any[] {
  try {
    ensureDataDir();
    const data = fs.readFileSync(GMAIL_RECORDS_FILE, 'utf8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

function saveStoredGmailRecord(record: any) {
  try {
    ensureDataDir();
    const records = getStoredGmailRecords();
    records.unshift(record); // newest first
    // keep up to last 500 records
    const trimmed = records.slice(0, 500);
    fs.writeFileSync(GMAIL_RECORDS_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save Gmail attendance record:', err);
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

// =============================================================
// CSV EXPORT API (SHORT URLS FOR ANDROID APKS & BROWSER DOWNLOADS)
// Prevents Android UI freeze/crash caused by large data URIs
// Opens short direct link in browser to trigger native DownloadManager
// =============================================================

interface PreparedExport {
  id: string;
  filename: string;
  content: string;
  createdAt: number;
}

const preparedExports = new Map<string, PreparedExport>();

// Clean up exports older than 2 hours periodically
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, exp] of preparedExports.entries()) {
    if (exp.createdAt < cutoff) {
      preparedExports.delete(id);
    }
  }
}, 10 * 60 * 1000);

// Endpoint to prepare a short-link CSV export
app.post('/api/export/prepare', (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'CSV content is required.' });
    }

    // Generate short 6-char id (e.g. "a9f2x1")
    const id = Math.random().toString(36).substring(2, 8);
    const rawFilename = (filename || 'attendance_report.csv').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const finalFilename = rawFilename.toLowerCase().endsWith('.csv') ? rawFilename : `${rawFilename}.csv`;

    preparedExports.set(id, {
      id,
      filename: finalFilename,
      content,
      createdAt: Date.now(),
    });

    // Determine the public URL dynamically from request, process.env.APP_URL, or headers
    let host = req.get('host');
    if (!host || host.includes('0.0.0.0') || host === 'localhost:3000') {
      if (process.env.APP_URL) {
        try {
          host = new URL(process.env.APP_URL).host;
        } catch {}
      }
    }
    const protoHeader = req.headers['x-forwarded-proto'];
    let protocol = typeof protoHeader === 'string' ? protoHeader : (host && host.includes('localhost') ? 'http' : 'https');
    
    // Relative path is always safe across any domain
    const relativeUrl = `/api/export/file/${id}.csv`;
    const downloadUrl = host ? `${protocol}://${host}${relativeUrl}` : relativeUrl;

    return res.json({
      success: true,
      id,
      downloadUrl,
      relativeUrl,
      filename: finalFilename,
    });
  } catch (err: any) {
    console.error('Error preparing CSV export:', err);
    return res.status(500).json({ error: 'Failed to prepare CSV download link.' });
  }
});

// Endpoint to download the prepared CSV file directly in browser
app.get(['/api/export/file/:fileParam', '/api/export/download/:fileParam'], (req, res) => {
  const fileParam = req.params.fileParam || '';
  const id = fileParam.replace(/\.csv$/i, '').trim();
  const exp = preparedExports.get(id);

  if (!exp) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family:system-ui, sans-serif;padding:32px 16px;text-align:center;background:#f8fafc;color:#1e293b;">
        <div style="max-width:400px;margin:0 auto;background:#fff;padding:24px;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);border:1px solid #e2e8f0;">
          <h3 style="color:#dc2626;margin-top:0;">Download Link Expired</h3>
          <p style="color:#64748b;font-size:14px;line-height:1.5;">The temporary export link has expired. Please go back to the SGI Attendance app and tap "Download CSV" again.</p>
        </div>
      </body>
      </html>
    `);
  }

  const safeFilename = encodeURIComponent(exp.filename).replace(/['()]/g, escape);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${exp.filename}"; filename*=UTF-8''${safeFilename}`);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Excel UTF-8 BOM (\uFEFF)
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const contentBuffer = Buffer.from(exp.content, 'utf8');
  return res.send(Buffer.concat([bom, contentBuffer]));
});

// Direct student template CSV download
app.get('/api/export/template', (req, res) => {
  const templateCsv =
    'Roll Number,Student Name,Father Name,Mobile Number,Semester\r\n' +
    '01,Gautam Tiwari,Shri Manoj Sharma,8955932061,1st Semester\r\n' +
    '02,Rahul Sharma,Shri R.P. Sharma,9876543210,1st Semester\r\n' +
    '03,Aman Verma,Shri Suresh Verma,9812345678,1st Semester\r\n';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="sgi_cse_section_a_students_template.csv"');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  return res.send(Buffer.concat([bom, Buffer.from(templateCsv, 'utf8')]));
});

// -------------------------------------------------------------
// GOOGLE DRIVE PERSISTENT BACKUP ENGINE
// Bound permanently to rk89experiment@gmail.com
// Zero authorization required for teachers: The server uses the stored token.
// -------------------------------------------------------------
const DRIVE_TOKEN_FILE = path.join(DATA_DIR, 'drive_token.json');
let activeGoogleDriveToken: string | null = null;
let googleDriveAdminEmail: string = 'rk89experiment@gmail.com';

function getDriveToken(): string | null {
  if (activeGoogleDriveToken) return activeGoogleDriveToken;
  try {
    if (fs.existsSync(DRIVE_TOKEN_FILE)) {
      const saved = JSON.parse(fs.readFileSync(DRIVE_TOKEN_FILE, 'utf-8'));
      if (saved?.token) {
        activeGoogleDriveToken = saved.token;
        if (saved.email) googleDriveAdminEmail = saved.email;
        return saved.token;
      }
    }
  } catch (e) {
    console.warn('[Google Drive] Error loading token:', e);
  }
  return null;
}

// Initial token load
getDriveToken();

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

    // Create folder if missing
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

async function uploadBinaryFileToGoogleDrive(
  accessToken: string,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string
) {
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

  // Update existing file
  if (existingFileId) {
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': mimeType,
        },
        body: fileBuffer,
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to update existing Drive file: ${errText}`);
    }
    return await updateRes.json();
  }

  // Create new file
  const boundary = `-------DriveBoundary${Date.now()}`;
  const metadata: any = {
    name: fileName,
    mimeType: mimeType,
    description: 'Daily Attendance Sheet from Sobhasaria Attendance App',
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const metaPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const closingPart = Buffer.from(`\r\n--${boundary}--`);
  const fullBody = Buffer.concat([metaPart, fileBuffer, closingPart]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: fullBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Drive upload failed: ${errText}`);
  }

  return await uploadRes.json();
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

// -------------------------------------------------------------
// ZERO-AUTHORIZATION GMAIL ATTENDANCE BACKUP PIPELINE
// Permanently fixed to user: rk89experiment@gmail.com
// Zero authorization required - saves automatically on Save Attendance!
// -------------------------------------------------------------
const GMAIL_TARGET_EMAIL = 'rk89experiment@gmail.com';

let mailTransporter: Transporter | null = null;
function getMailTransporter(): Transporter | null {
  if (mailTransporter) return mailTransporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      return mailTransporter;
    } catch (e) {
      console.warn('[Mailer] Error creating transporter:', e);
    }
  }
  return null;
}

async function dispatchAttendanceToGmail(params: {
  date: string;
  targetEmail?: string;
  totalStudents?: number;
  presentCount?: number;
  absentCount?: number;
  percentage?: number;
  filename?: string;
  excelBase64?: string;
  csvContent?: string;
  details?: Array<{ rollNumber: string; name: string; fatherName?: string; mobileNumber?: string; status: string }>;
}) {
  const targetEmail = params.targetEmail || GMAIL_TARGET_EMAIL;
  const dateStr = params.date || new Date().toISOString().split('T')[0];
  const recordId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const finalFilename = params.filename || `Attendance_${dateStr}.xlsx`;

  // 1. Save Excel file to persistent storage on server
  let filePathOnServer: string | null = null;
  let fileBuffer: Buffer | null = null;

  if (params.excelBase64) {
    try {
      fileBuffer = Buffer.from(params.excelBase64, 'base64');
      const safeFileName = `${dateStr}_${finalFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      filePathOnServer = path.join(EXCEL_REPORTS_DIR, safeFileName);
      fs.writeFileSync(filePathOnServer, fileBuffer);
    } catch (e) {
      console.warn('[Gmail Backup] Could not cache excel file on disk:', e);
    }
  }

  // 2. Prepare HTML Email body
  const details = params.details || [];
  const total = params.totalStudents ?? details.length;
  const present = params.presentCount ?? details.filter((d) => d.status === 'Present').length;
  const absent = params.absentCount ?? details.filter((d) => d.status === 'Absent').length;
  const pct = params.percentage ?? (total > 0 ? Math.round((present / total) * 100) : 0);

  let studentRowsHtml = '';
  details.forEach((st, idx) => {
    const isPresent = st.status === 'Present';
    const badgeColor = isPresent ? '#059669' : '#dc2626';
    const bgColor = isPresent ? '#ecfdf5' : '#fef2f2';
    studentRowsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 8px 10px; font-weight: bold; color: #1e293b;">${st.rollNumber || idx + 1}</td>
        <td style="padding: 8px 10px; color: #0f172a; font-weight: 600;">${st.name}</td>
        <td style="padding: 8px 10px; color: #475569;">${st.fatherName || '-'}</td>
        <td style="padding: 8px 10px; color: #475569;">${st.mobileNumber || '-'}</td>
        <td style="padding: 8px 10px; text-align: center;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; color: ${badgeColor}; background-color: ${bgColor};">
            ${st.status}
          </span>
        </td>
      </tr>
    `;
  });

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">SOBHASARIA GROUP OF INSTITUTIONS, SIKAR</h1>
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #94a3b8;">Department of Computer Science & Engineering</p>
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #38bdf8;">Daily Attendance Record - Class CSE Section A</p>
      </div>
      
      <div style="padding: 20px;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
          <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>Date:</strong> ${dateStr}</p>
          <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;"><strong>Recipient Gmail:</strong> ${targetEmail}</p>
          <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Attendance Summary:</strong> 
            <span style="color: #059669; font-weight: bold;">Present: ${present}</span> | 
            <span style="color: #dc2626; font-weight: bold;">Absent: ${absent}</span> | 
            <span>Total: ${total}</span> | 
            <strong>Percentage: ${pct}%</strong>
          </p>
        </div>

        <h3 style="font-size: 15px; color: #0f172a; margin: 0 0 10px 0; font-weight: 700;">Student Attendance Roster</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 12px; color: #475569; text-transform: uppercase;">
              <th style="padding: 8px 10px;">Roll No</th>
              <th style="padding: 8px 10px;">Student Name</th>
              <th style="padding: 8px 10px;">Father's Name</th>
              <th style="padding: 8px 10px;">Mobile</th>
              <th style="padding: 8px 10px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${studentRowsHtml || '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #64748b;">No individual student rows provided.</td></tr>'}
          </tbody>
        </table>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          <p style="margin: 0 0 4px 0;">This attendance report was automatically saved and dispatched to <strong>${targetEmail}</strong> with zero cloud authorization required.</p>
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">Sobhasaria Group of Institutions Attendance System • NH-52, Gokulpura, Sikar, Rajasthan</p>
        </div>
      </div>
    </div>
  `;

  // 3. Attempt email delivery via nodemailer if transporter configured
  let sentStatus: 'sent' | 'saved_to_archive' = 'saved_to_archive';
  const transporter = getMailTransporter();

  if (transporter) {
    try {
      const attachments: any[] = [];
      if (fileBuffer) {
        attachments.push({
          filename: finalFilename,
          content: fileBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      } else if (params.csvContent) {
        attachments.push({
          filename: finalFilename.replace('.xlsx', '.csv'),
          content: params.csvContent,
          contentType: 'text/csv',
        });
      }

      await transporter.sendMail({
        from: process.env.GMAIL_SENDER || `"SGI Attendance System" <${targetEmail}>`,
        to: targetEmail,
        subject: `SGI Daily Attendance Report - ${dateStr} (CSE Section A)`,
        html: emailHtml,
        attachments,
      });
      sentStatus = 'sent';
      console.log(`[Gmail Service] Successfully emailed attendance report to ${targetEmail} for ${dateStr}`);
    } catch (mailErr: any) {
      console.warn(`[Gmail Service] Mail delivery notice for ${targetEmail}:`, mailErr?.message || mailErr);
    }
  }

  // 4. Save metadata record to persistent server archive
  const record = {
    id: recordId,
    date: dateStr,
    timestamp: Date.now(),
    targetEmail,
    totalStudents: total,
    presentCount: present,
    absentCount: absent,
    percentage: pct,
    filename: finalFilename,
    hasExcelAttachment: Boolean(fileBuffer),
    filePath: filePathOnServer ? path.basename(filePathOnServer) : null,
    status: sentStatus,
    details: details.slice(0, 100),
  };

  saveStoredGmailRecord(record);
  console.log(`[Gmail Backup] Attendance record archived for ${targetEmail} (ID: ${recordId}, Date: ${dateStr})`);

  return {
    success: true,
    recordId,
    targetEmail,
    status: sentStatus,
    message: `Attendance for ${dateStr} saved & recorded for ${targetEmail} without requiring cloud authorization`,
  };
}

// -------------------------------------------------------------
// GMAIL BACKUP API ENDPOINTS (Zero-authorization required)
// -------------------------------------------------------------
app.post('/api/gmail/send-attendance', async (req, res) => {
  try {
    const result = await dispatchAttendanceToGmail(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('[Gmail Backup] Error handling request:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to save attendance record to Gmail archive',
    });
  }
});

app.get('/api/gmail/records', (req, res) => {
  const records = getStoredGmailRecords();
  res.json({
    targetEmail: GMAIL_TARGET_EMAIL,
    totalRecords: records.length,
    records,
  });
});

app.get('/api/gmail/status', (req, res) => {
  const records = getStoredGmailRecords();
  res.json({
    targetEmail: GMAIL_TARGET_EMAIL,
    autoBackupActive: true,
    requiresAuthorization: false,
    smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
    totalSavedRecords: records.length,
    lastBackupDate: records[0]?.date || null,
  });
});

app.post('/api/gmail/test', async (req, res) => {
  try {
    const testResult = await dispatchAttendanceToGmail({
      date: new Date().toISOString().split('T')[0],
      targetEmail: GMAIL_TARGET_EMAIL,
      totalStudents: 1,
      presentCount: 1,
      absentCount: 0,
      percentage: 100,
      filename: `SGI_Test_Verification_${new Date().toISOString().split('T')[0]}.xlsx`,
      details: [
        {
          rollNumber: 'TEST-01',
          name: 'System Verification Test',
          fatherName: 'Sobhasaria SGI',
          mobileNumber: '9999999999',
          status: 'Present',
        },
      ],
    });
    res.json({
      success: true,
      message: `Test attendance notification created and saved for ${GMAIL_TARGET_EMAIL} (Zero authorization required)!`,
      testResult,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/gmail/download/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(EXCEL_REPORTS_DIR, safeFilename);

  if (fs.existsSync(filePath)) {
    return res.download(filePath, safeFilename);
  }
  return res.status(404).json({ error: 'Excel report file not found on server.' });
});

// -------------------------------------------------------------
// GOOGLE DRIVE API ENDPOINTS (Zero Authorization for teachers, permanent sync)
// -------------------------------------------------------------
app.post('/api/drive/token', (req, res) => {
  const { token, email } = req.body;
  if (token) {
    activeGoogleDriveToken = token;
    if (email) googleDriveAdminEmail = email;
    try {
      fs.writeFileSync(
        DRIVE_TOKEN_FILE,
        JSON.stringify({ token, email: googleDriveAdminEmail, updatedAt: Date.now() }),
        'utf-8'
      );
      console.log(`[Google Drive] Token stored and persisted for ${googleDriveAdminEmail}`);
    } catch (e) {
      console.warn('Could not save drive_token.json:', e);
    }
  }
  const effectiveToken = getDriveToken();
  res.json({
    success: true,
    hasToken: Boolean(effectiveToken),
    adminEmail: googleDriveAdminEmail,
  });
});

app.get('/api/drive/status', (req, res) => {
  const token = getDriveToken();
  res.json({
    connected: Boolean(token),
    adminEmail: googleDriveAdminEmail,
    autoBackupActive: Boolean(token),
    folderName: 'Sobhasaria Attendance Records',
    requiresAuthorization: false,
  });
});

app.post('/api/drive/upload-attendance', async (req, res) => {
  const {
    date,
    csvContent,
    excelBase64,
    filename,
    token,
    details,
    totalStudents,
    presentCount,
    absentCount,
    percentage,
  } = req.body;

  const effectiveToken = token || getDriveToken();
  const dateStr = date || new Date().toISOString().split('T')[0];
  const fileTitle = filename || `Attendance_${dateStr}.xlsx`;

  // 1. Parallel save to Gmail archive
  try {
    await dispatchAttendanceToGmail({
      date: dateStr,
      filename: fileTitle,
      excelBase64,
      csvContent,
      details,
      totalStudents,
      presentCount,
      absentCount,
      percentage,
    });
  } catch (mErr) {
    console.warn('[Gmail archive notice]:', mErr);
  }

  // 2. Upload directly to Google Drive
  if (!effectiveToken) {
    return res.status(200).json({
      success: false,
      queued: true,
      message: 'Drive token not found. Attendance saved safely in server & database.',
    });
  }

  if (!excelBase64 && !csvContent) {
    return res.status(400).json({ error: 'excelBase64 or csvContent is required.' });
  }

  try {
    let result: any = null;
    if (excelBase64) {
      const fileBuffer = Buffer.from(excelBase64, 'base64');
      result = await uploadBinaryFileToGoogleDrive(
        effectiveToken,
        fileTitle,
        fileBuffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    } else if (csvContent) {
      result = await uploadCsvToGoogleDrive(effectiveToken, fileTitle, csvContent);
    }

    console.log(`[Google Drive] Upload success: ${fileTitle} (File ID: ${result?.id}) in Sobhasaria Attendance Records`);
    return res.json({
      success: true,
      fileId: result?.id,
      name: result?.name || fileTitle,
      folder: 'Sobhasaria Attendance Records',
      targetEmail: googleDriveAdminEmail,
      viewUrl: result?.id ? `https://drive.google.com/file/d/${result.id}/view` : undefined,
    });
  } catch (err: any) {
    console.error('[Google Drive] Upload failed:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/drive/test-upload', async (req, res) => {
  const token = getDriveToken();
  if (!token) {
    return res.status(400).json({ success: false, error: 'No Google Drive token stored.' });
  }
  try {
    const testDate = new Date().toISOString().split('T')[0];
    const testFilename = `Verification_Test_${testDate}.txt`;
    const folderId = await getOrCreateAttendanceFolder(token);

    const boundary = `-------DriveBoundary${Date.now()}`;
    const metadata: any = {
      name: testFilename,
      mimeType: 'text/plain',
      description: 'System Verification Test from Sobhasaria Attendance App',
    };
    if (folderId) metadata.parents = [folderId];

    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n--${boundary}\r\nContent-Type: text/plain\r\n\r\nSobhasaria Attendance Google Drive auto-sync is fully functional!\r\nVerified at: ${new Date().toISOString()}\r\n--${boundary}--`;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Drive test upload failed: ${errText}`);
    }

    const file = await uploadRes.json();
    return res.json({
      success: true,
      fileId: file.id,
      name: file.name,
      folderId,
      folderName: 'Sobhasaria Attendance Records',
      message: `Successfully uploaded ${file.name} to Google Drive ("Sobhasaria Attendance Records")!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/drive/files', async (req, res) => {
  const token = getDriveToken();
  if (!token) {
    return res.json({ connected: false, files: [] });
  }
  try {
    const folderId = await getOrCreateAttendanceFolder(token);
    let q = 'trashed=false';
    if (folderId) {
      q += ` and '${folderId}' in parents`;
    }
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        q
      )}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=25&orderBy=modifiedTime desc`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!searchRes.ok) {
      return res.json({ connected: false, error: 'Token expired or invalid', files: [] });
    }
    const data = await searchRes.json();
    res.json({
      connected: true,
      folderId,
      folderName: 'Sobhasaria Attendance Records',
      account: googleDriveAdminEmail,
      files: data.files || [],
    });
  } catch (err: any) {
    res.status(500).json({ connected: false, error: err.message, files: [] });
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
