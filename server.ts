import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const ADMIN_EMAIL = 'tiwarigautam819@gmail.com';

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

// Data directory for teachers metadata (never storing passwords!)
const DATA_DIR = path.join(process.cwd(), 'data');
const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TEACHERS_FILE)) {
    fs.writeFileSync(TEACHERS_FILE, JSON.stringify([], null, 2), 'utf8');
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
    if (callerEmail !== ADMIN_EMAIL.toLowerCase()) {
      console.warn(`[SECURITY ALERT] Unauthorized teacher creation attempt by non-admin: ${callerEmail}`);
      return {
        valid: false,
        error: `Forbidden: Only the Administrator (${ADMIN_EMAIL}) has permission to create teacher accounts.`,
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
