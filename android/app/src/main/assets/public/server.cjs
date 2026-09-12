var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((0, import_cors.default)({ origin: true, credentials: true }));
var ADMIN_EMAILS = [
  "tiwarigautam819@gmail.com",
  "rk89experiment@gmail.com"
];
var ADMIN_EMAIL = ADMIN_EMAILS[0];
app.use(import_express.default.json());
app.use(import_express.default.urlencoded({ extended: true }));
var configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
var firebaseConfig = {};
if (import_fs.default.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.error("Failed to read firebase-applet-config.json:", err);
  }
}
var API_KEY = firebaseConfig.apiKey || "";
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var TEACHERS_FILE = import_path.default.join(DATA_DIR, "teachers.json");
var STUDENTS_FILE = import_path.default.join(DATA_DIR, "students.json");
var DELETED_STUDENTS_FILE = import_path.default.join(DATA_DIR, "deleted_students.json");
var ATTENDANCE_FILE = import_path.default.join(DATA_DIR, "attendance.json");
function ensureDataDir() {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!import_fs.default.existsSync(TEACHERS_FILE)) {
    import_fs.default.writeFileSync(TEACHERS_FILE, JSON.stringify([], null, 2), "utf8");
  }
  if (!import_fs.default.existsSync(STUDENTS_FILE)) {
    import_fs.default.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2), "utf8");
  }
  if (!import_fs.default.existsSync(DELETED_STUDENTS_FILE)) {
    import_fs.default.writeFileSync(DELETED_STUDENTS_FILE, JSON.stringify([], null, 2), "utf8");
  }
  if (!import_fs.default.existsSync(ATTENDANCE_FILE)) {
    import_fs.default.writeFileSync(ATTENDANCE_FILE, JSON.stringify({}, null, 2), "utf8");
  }
}
function getStoredAttendance() {
  try {
    ensureDataDir();
    const data = import_fs.default.readFileSync(ATTENDANCE_FILE, "utf8");
    return JSON.parse(data) || {};
  } catch {
    return {};
  }
}
function saveStoredAttendance(attendanceMap) {
  try {
    ensureDataDir();
    import_fs.default.writeFileSync(ATTENDANCE_FILE, JSON.stringify(attendanceMap, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save attendance file:", err);
  }
}
function getStoredTeachers() {
  try {
    ensureDataDir();
    const data = import_fs.default.readFileSync(TEACHERS_FILE, "utf8");
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}
function getStoredStudents() {
  try {
    ensureDataDir();
    const data = import_fs.default.readFileSync(STUDENTS_FILE, "utf8");
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}
function getDeletedStudentIds() {
  try {
    ensureDataDir();
    const data = import_fs.default.readFileSync(DELETED_STUDENTS_FILE, "utf8");
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}
function saveStoredStudents(students) {
  try {
    ensureDataDir();
    import_fs.default.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save students to file:", err);
  }
}
function recordDeletedStudentId(id) {
  try {
    ensureDataDir();
    const current = getDeletedStudentIds();
    if (!current.includes(id)) {
      current.push(id);
      import_fs.default.writeFileSync(DELETED_STUDENTS_FILE, JSON.stringify(current, null, 2), "utf8");
    }
  } catch (err) {
    console.error("Failed to record deleted student id:", err);
  }
}
function removeDeletedStudentId(id) {
  try {
    ensureDataDir();
    const current = getDeletedStudentIds().filter((d) => d !== id);
    import_fs.default.writeFileSync(DELETED_STUDENTS_FILE, JSON.stringify(current, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to update deleted student list:", err);
  }
}
function saveTeacherRecord(teacher) {
  try {
    ensureDataDir();
    const list = getStoredTeachers();
    const existingIdx = list.findIndex((t) => t.email.toLowerCase() === teacher.email.toLowerCase());
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...teacher };
    } else {
      list.push(teacher);
    }
    import_fs.default.writeFileSync(TEACHERS_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist teacher metadata:", err);
  }
}
async function verifyAdminCaller(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      valid: false,
      error: "Authentication required. Authorization Bearer token is missing.",
      status: 401
    };
  }
  const idToken = authHeader.split("Bearer ")[1].trim();
  if (!idToken) {
    return {
      valid: false,
      error: "Authentication failed. Empty session token.",
      status: 401
    };
  }
  if (!API_KEY) {
    return {
      valid: false,
      error: "Server configuration error: Firebase API Key not found.",
      status: 500
    };
  }
  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      }
    );
    if (!lookupRes.ok) {
      const errData = await lookupRes.json().catch(() => ({}));
      const message = errData?.error?.message || "Token verification failed";
      return {
        valid: false,
        error: `Authentication failed: ${message}`,
        status: 401
      };
    }
    const lookupData = await lookupRes.json();
    const callerUser = lookupData.users?.[0];
    if (!callerUser || !callerUser.email) {
      return {
        valid: false,
        error: "Unable to identify the authenticated user.",
        status: 401
      };
    }
    const callerEmail = callerUser.email.toLowerCase().trim();
    if (!ADMIN_EMAILS.some((adm) => adm.toLowerCase() === callerEmail)) {
      console.warn(`[SECURITY ALERT] Unauthorized teacher creation attempt by non-admin: ${callerEmail}`);
      return {
        valid: false,
        error: `Forbidden: Only the Administrator (${ADMIN_EMAILS.join(" or ")}) has permission to create teacher accounts.`,
        status: 403
      };
    }
    return {
      valid: true,
      email: callerEmail,
      uid: callerUser.localId
    };
  } catch (err) {
    console.error("Server error during token verification:", err);
    return {
      valid: false,
      error: "Server error while verifying user credentials.",
      status: 500
    };
  }
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "SGI Attendance Full-Stack API",
    adminEmail: ADMIN_EMAIL,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/students", (req, res) => {
  const students = getStoredStudents();
  const deletedIds = getDeletedStudentIds();
  res.json({ students, deletedIds });
});
app.post("/api/students", (req, res) => {
  const { student, students } = req.body;
  const toUpsert = students || (student ? [student] : []);
  if (!Array.isArray(toUpsert) || toUpsert.length === 0) {
    return res.status(400).json({ error: "No student data provided." });
  }
  const existingList = getStoredStudents();
  for (const item of toUpsert) {
    if (!item || !item.id) continue;
    removeDeletedStudentId(item.id);
    const idx = existingList.findIndex(
      (s) => s.id === item.id || s.rollNumber && s.rollNumber.toLowerCase() === String(item.rollNumber).toLowerCase()
    );
    if (idx >= 0) {
      existingList[idx] = {
        ...existingList[idx],
        ...item,
        updatedAt: item.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
      };
    } else {
      existingList.push({
        ...item,
        createdAt: item.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: item.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  saveStoredStudents(existingList);
  res.json({ success: true, count: existingList.length, students: existingList });
});
app.delete("/api/students/:id", (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Student ID is required." });
  }
  const existingList = getStoredStudents();
  const filtered = existingList.filter((s) => s.id !== id);
  saveStoredStudents(filtered);
  recordDeletedStudentId(id);
  res.json({ success: true, message: "Student deleted successfully." });
});
app.get("/api/attendance", (req, res) => {
  const attendance = getStoredAttendance();
  res.json(attendance);
});
app.get("/api/attendance/:date", (req, res) => {
  const { date } = req.params;
  const attendance = getStoredAttendance();
  res.json(attendance[date] || {});
});
app.post("/api/attendance", (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records)) {
    return res.status(400).json({ error: "Date and records array are required." });
  }
  const allAttendance = getStoredAttendance();
  const currentForDate = allAttendance[date] || {};
  for (const item of records) {
    if (item && item.studentId) {
      currentForDate[item.studentId] = item.status || "Present";
    }
  }
  allAttendance[date] = currentForDate;
  saveStoredAttendance(allAttendance);
  res.json({
    success: true,
    date,
    count: Object.keys(currentForDate).length
  });
});
var preparedExports = /* @__PURE__ */ new Map();
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1e3;
  for (const [id, exp] of preparedExports.entries()) {
    if (exp.createdAt < cutoff) {
      preparedExports.delete(id);
    }
  }
}, 10 * 60 * 1e3);
app.post("/api/export/prepare", (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "CSV content is required." });
    }
    const id = Math.random().toString(36).substring(2, 8);
    const rawFilename = (filename || "attendance_report.csv").replace(/[^a-zA-Z0-9_.-]/g, "_");
    const finalFilename = rawFilename.toLowerCase().endsWith(".csv") ? rawFilename : `${rawFilename}.csv`;
    preparedExports.set(id, {
      id,
      filename: finalFilename,
      content,
      createdAt: Date.now()
    });
    let host = req.get("host");
    if (!host || host.includes("0.0.0.0") || host === "localhost:3000") {
      if (process.env.APP_URL) {
        try {
          host = new URL(process.env.APP_URL).host;
        } catch {
        }
      }
    }
    const protoHeader = req.headers["x-forwarded-proto"];
    let protocol = typeof protoHeader === "string" ? protoHeader : host && host.includes("localhost") ? "http" : "https";
    const relativeUrl = `/api/export/file/${id}.csv`;
    const downloadUrl = host ? `${protocol}://${host}${relativeUrl}` : relativeUrl;
    return res.json({
      success: true,
      id,
      downloadUrl,
      relativeUrl,
      filename: finalFilename
    });
  } catch (err) {
    console.error("Error preparing CSV export:", err);
    return res.status(500).json({ error: "Failed to prepare CSV download link." });
  }
});
app.get(["/api/export/file/:fileParam", "/api/export/download/:fileParam"], (req, res) => {
  const fileParam = req.params.fileParam || "";
  const id = fileParam.replace(/\.csv$/i, "").trim();
  const exp = preparedExports.get(id);
  if (!exp) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
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
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${exp.filename}"; filename*=UTF-8''${safeFilename}`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const bom = Buffer.from([239, 187, 191]);
  const contentBuffer = Buffer.from(exp.content, "utf8");
  return res.send(Buffer.concat([bom, contentBuffer]));
});
app.get("/api/export/template", (req, res) => {
  const templateCsv = "Roll Number,Student Name,Father Name,Mobile Number,Semester\r\n01,Gautam Tiwari,Shri Manoj Sharma,8955932061,1st Semester\r\n02,Rahul Sharma,Shri R.P. Sharma,9876543210,1st Semester\r\n03,Aman Verma,Shri Suresh Verma,9812345678,1st Semester\r\n";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="sgi_cse_section_a_students_template.csv"');
  res.setHeader("Access-Control-Allow-Origin", "*");
  const bom = Buffer.from([239, 187, 191]);
  return res.send(Buffer.concat([bom, Buffer.from(templateCsv, "utf8")]));
});
var activeGoogleDriveToken = null;
var googleDriveAdminEmail = "rk89experiment@gmail.com";
var DRIVE_TOKEN_FILE = import_path.default.join(DATA_DIR, "drive_token.json");
try {
  if (import_fs.default.existsSync(DRIVE_TOKEN_FILE)) {
    const saved = JSON.parse(import_fs.default.readFileSync(DRIVE_TOKEN_FILE, "utf-8"));
    if (saved?.token) {
      activeGoogleDriveToken = saved.token;
      if (saved.email) googleDriveAdminEmail = saved.email;
      console.log(`[Google Drive] Restored persistent token for ${googleDriveAdminEmail}`);
    }
  }
} catch (e) {
  console.warn("[Google Drive] Notice loading persistent token:", e);
}
async function getOrCreateAttendanceFolder(accessToken) {
  try {
    const q = "mimeType='application/vnd.google-apps.folder' and name='Sobhasaria Attendance Records' and trashed=false";
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Sobhasaria Attendance Records",
        mimeType: "application/vnd.google-apps.folder",
        description: "Auto-synced daily attendance sheets from Sobhasaria Attendance App"
      })
    });
    if (createRes.ok) {
      const folderData = await createRes.json();
      return folderData.id;
    }
  } catch (err) {
    console.warn("[Google Drive] Folder lookup notice:", err);
  }
  return null;
}
async function uploadBinaryFileToGoogleDrive(accessToken, fileName, fileBuffer, mimeType) {
  const folderId = await getOrCreateAttendanceFolder(accessToken);
  let queryStr = `name='${fileName.replace(/'/g, "\\'")}' and trashed=false`;
  if (folderId) {
    queryStr += ` and '${folderId}' in parents`;
  }
  let existingFileId = null;
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        existingFileId = searchData.files[0].id;
      }
    }
  } catch (err) {
    console.warn("[Google Drive] Search notice:", err);
  }
  if (existingFileId) {
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": mimeType
        },
        body: fileBuffer
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to update existing Drive file: ${errText}`);
    }
    return await updateRes.json();
  }
  const boundary = `-------DriveBoundary${Date.now()}`;
  const metadata = {
    name: fileName,
    mimeType,
    description: "Daily Attendance Sheet from Sobhasaria Attendance App"
  };
  if (folderId) {
    metadata.parents = [folderId];
  }
  const metaPart = Buffer.from(
    `--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
\r
${JSON.stringify(metadata)}\r
--${boundary}\r
Content-Type: ${mimeType}\r
\r
`
  );
  const closingPart = Buffer.from(`\r
--${boundary}--`);
  const fullBody = Buffer.concat([metaPart, fileBuffer, closingPart]);
  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: fullBody
    }
  );
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Drive upload failed: ${errText}`);
  }
  return await uploadRes.json();
}
async function uploadCsvToGoogleDrive(accessToken, fileName, csvContent) {
  const folderId = await getOrCreateAttendanceFolder(accessToken);
  let queryStr = `name='${fileName.replace(/'/g, "\\'")}' and trashed=false`;
  if (folderId) {
    queryStr += ` and '${folderId}' in parents`;
  }
  let existingFileId = null;
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        existingFileId = searchData.files[0].id;
      }
    }
  } catch (err) {
    console.warn("[Google Drive] Search notice:", err);
  }
  if (existingFileId) {
    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/csv; charset=UTF-8"
        },
        body: csvContent
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Failed to update existing Drive file: ${errText}`);
    }
    return await updateRes.json();
  }
  const boundary = `-------DriveBoundary${Date.now()}`;
  const metadata = {
    name: fileName,
    mimeType: "text/csv",
    description: "Daily Attendance Sheet from Sobhasaria Attendance App"
  };
  if (folderId) {
    metadata.parents = [folderId];
  }
  const multipartBody = `--${boundary}\r
Content-Type: application/json; charset=UTF-8\r
\r
${JSON.stringify(metadata)}\r
--${boundary}\r
Content-Type: text/csv; charset=UTF-8\r
\r
${csvContent}\r
--${boundary}--`;
  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  );
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Drive upload failed: ${errText}`);
  }
  return await uploadRes.json();
}
app.post("/api/drive/token", (req, res) => {
  const { token, email } = req.body;
  if (token) {
    activeGoogleDriveToken = token;
    if (email) googleDriveAdminEmail = email;
    try {
      import_fs.default.writeFileSync(
        DRIVE_TOKEN_FILE,
        JSON.stringify({ token, email: googleDriveAdminEmail, updatedAt: Date.now() }),
        "utf-8"
      );
    } catch (e) {
      console.warn("Could not save drive_token.json:", e);
    }
    console.log(`[Google Drive] Token updated and persisted for ${googleDriveAdminEmail}`);
  }
  res.json({
    success: true,
    hasToken: Boolean(activeGoogleDriveToken),
    adminEmail: googleDriveAdminEmail
  });
});
app.get("/api/drive/status", (req, res) => {
  res.json({
    connected: Boolean(activeGoogleDriveToken),
    adminEmail: googleDriveAdminEmail
  });
});
app.post("/api/drive/upload-attendance", async (req, res) => {
  const { date, csvContent, excelBase64, filename, token } = req.body;
  const effectiveToken = token || activeGoogleDriveToken;
  if (!effectiveToken) {
    return res.status(200).json({
      success: false,
      queued: true,
      message: "Drive session token pending. Attendance is safely saved in local and server database."
    });
  }
  if (!excelBase64 && !csvContent) {
    return res.status(400).json({ error: "excelBase64 or csvContent is required." });
  }
  try {
    let result = null;
    if (excelBase64) {
      const fileTitle = filename || `Attendance_${date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`;
      const fileBuffer = Buffer.from(excelBase64, "base64");
      result = await uploadBinaryFileToGoogleDrive(
        effectiveToken,
        fileTitle,
        fileBuffer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    } else if (csvContent) {
      const fileTitle = filename || `Attendance_${date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]}_CSE_A.csv`;
      result = await uploadCsvToGoogleDrive(effectiveToken, fileTitle, csvContent);
    }
    return res.json({ success: true, fileId: result?.id, name: result?.name });
  } catch (err) {
    console.error("[Google Drive] Upload failed:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/admin/check-admin", async (req, res) => {
  const check = await verifyAdminCaller(req);
  if (!check.valid) {
    return res.status(check.status || 403).json({
      isAdmin: false,
      error: check.error
    });
  }
  return res.json({
    isAdmin: true,
    email: check.email,
    uid: check.uid
  });
});
app.get("/api/admin/teachers", async (req, res) => {
  const check = await verifyAdminCaller(req);
  if (!check.valid) {
    return res.status(check.status || 403).json({ error: check.error });
  }
  const teachers = getStoredTeachers();
  res.json({ teachers });
});
app.post("/api/admin/create-teacher", async (req, res) => {
  const check = await verifyAdminCaller(req);
  if (!check.valid) {
    return res.status(check.status || 403).json({ error: check.error });
  }
  const { name, email, password } = req.body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Please enter a valid teacher name (at least 2 characters)." });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Please enter a valid email address for the teacher." });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }
  const cleanedEmail = email.trim().toLowerCase();
  const cleanedName = name.trim();
  if (cleanedEmail === ADMIN_EMAIL.toLowerCase()) {
    return res.status(400).json({ error: "The administrator account already exists and cannot be duplicated." });
  }
  try {
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanedEmail,
          password,
          displayName: cleanedName,
          returnSecureToken: false
        })
      }
    );
    const data = await signUpRes.json();
    if (!signUpRes.ok) {
      const errMsg = data?.error?.message;
      if (errMsg === "EMAIL_EXISTS") {
        return res.status(409).json({
          error: `Teacher account with email "${cleanedEmail}" already exists.`
        });
      }
      if (errMsg && errMsg.includes("WEAK_PASSWORD")) {
        return res.status(400).json({
          error: "Password should be at least 6 characters long."
        });
      }
      if (errMsg === "OPERATION_NOT_ALLOWED") {
        return res.status(400).json({
          error: "Email/Password authentication provider is not enabled in Firebase Console."
        });
      }
      return res.status(400).json({
        error: errMsg || "Failed to create teacher account in Firebase Authentication."
      });
    }
    const newUid = data.localId;
    saveTeacherRecord({
      uid: newUid,
      name: cleanedName,
      email: cleanedEmail,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdBy: check.email || ADMIN_EMAIL
    });
    console.log(`[TEACHER CREATED] Admin ${check.email} created teacher account for ${cleanedName} (${cleanedEmail})`);
    return res.status(201).json({
      success: true,
      message: `Teacher account for "${cleanedName}" (${cleanedEmail}) has been created successfully. The teacher can now log in using their email and password.`,
      teacher: {
        uid: newUid,
        name: cleanedName,
        email: cleanedEmail,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (err) {
    console.error("Server error creating teacher account:", err);
    return res.status(500).json({
      error: "An internal error occurred on the server while creating the teacher account."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SGI Attendance Server running on port ${PORT}`);
    console.log(`Single App Administrator: ${ADMIN_EMAIL}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
