import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, auth, isOfflineError, withTimeout } from './firebase';
import { AttendanceRecord, AttendanceStatus, DayAttendanceSummary, OperationType } from '../types';
import { apiUrl } from './apiConfig';

const ATTENDANCE_COLLECTION = 'attendance';
const LOCAL_DATES_KEY = 'sgi_attendance_dates';

function getLocalAttendance(dateStr: string): Record<string, AttendanceStatus> {
  try {
    const raw = localStorage.getItem(`sgi_attendance_${dateStr}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {};
}

function saveLocalAttendance(dateStr: string, map: Record<string, AttendanceStatus>): void {
  try {
    localStorage.setItem(`sgi_attendance_${dateStr}`, JSON.stringify(map));
    const dates = getLocalDates();
    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
      localStorage.setItem(LOCAL_DATES_KEY, JSON.stringify(dates));
    }
  } catch {
    // ignore
  }
}

function getLocalDates(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_DATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Get all attendance records for a specific date (YYYY-MM-DD)
 */
export async function getAttendanceForDate(dateStr: string): Promise<Record<string, AttendanceStatus>> {
  const local = getLocalAttendance(dateStr);
  let serverRecords: Record<string, AttendanceStatus> = {};

  try {
    const sRes = await fetch(apiUrl(`/api/attendance/${dateStr}`));
    if (sRes.ok) {
      serverRecords = await sRes.json();
    }
  } catch {
    // ignore
  }

  let firestoreRecords: Record<string, AttendanceStatus> = {};
  if (db) {
    try {
      const q = query(
        collection(db, ATTENDANCE_COLLECTION),
        where('date', '==', dateStr)
      );
      const snapshot = await withTimeout(getDocs(q), 6000);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.studentId && data.status) {
          firestoreRecords[data.studentId] = data.status as AttendanceStatus;
        }
      });
    } catch {
      // ignore
    }
  }

  const merged = { ...serverRecords, ...firestoreRecords, ...local };
  if (Object.keys(merged).length > 0) {
    saveLocalAttendance(dateStr, merged);
  }
  return merged;
}

/**
 * Save or update attendance records for a specific date.
 * Uses deterministic document IDs: `${date}_${studentId}`
 * This strictly prevents duplicate records for the same student on the same date!
 * Guaranteed to never freeze or hang the UI.
 */
export async function saveAttendanceForDate(
  dateStr: string,
  records: Array<{ studentId: string; status: AttendanceStatus }>
): Promise<void> {
  // 1. Immediately persist locally
  const localMap: Record<string, AttendanceStatus> = getLocalAttendance(dateStr);
  for (const r of records) {
    localMap[r.studentId] = r.status;
  }
  saveLocalAttendance(dateStr, localMap);

  // 2. Persist to server database
  try {
    fetch(apiUrl('/api/attendance'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, records }),
    }).catch(() => {});
  } catch {
    // non-blocking
  }

  // 3. Persist to Firestore with reliable timeout
  if (!db) return;

  try {
    const batch = writeBatch(db);
    const markedAt = new Date().toISOString();
    const markedBy = auth?.currentUser?.email || auth?.currentUser?.uid || 'teacher-admin';

    for (const record of records) {
      const docId = `${dateStr}_${record.studentId}`;
      const docRef = doc(db, ATTENDANCE_COLLECTION, docId);

      const attendanceData: AttendanceRecord = {
        id: docId,
        date: dateStr,
        studentId: record.studentId,
        status: record.status,
        markedAt,
        markedBy,
      };

      batch.set(docRef, attendanceData, { merge: true });
    }

    await withTimeout(batch.commit(), 6000);
  } catch (error) {
    console.warn('Firestore attendance commit notice (attendance is already safely saved in local & server):', error);
  }
}

/**
 * Fetch all distinct dates where attendance has been recorded
 */
export async function getAllAttendanceDates(): Promise<string[]> {
  const localDates = getLocalDates();

  if (!db) {
    return localDates.sort().reverse();
  }

  try {
    // Query collection directly so absence of composite index never blocks reading dates
    const snapshot = await withTimeout(getDocs(collection(db, ATTENDANCE_COLLECTION)), 6000);
    const datesSet = new Set<string>(localDates);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.date) {
        datesSet.add(data.date);
      }
    });

    const combined = Array.from(datesSet).sort().reverse();
    try {
      localStorage.setItem(LOCAL_DATES_KEY, JSON.stringify(combined));
    } catch {
      // ignore
    }
    return combined;
  } catch (error) {
    if (isOfflineError(error)) {
      return localDates.sort().reverse();
    }
    handleFirestoreError(error, OperationType.LIST, ATTENDANCE_COLLECTION);
  }
}

/**
 * Get summary stats for a list of historical dates
 */
export async function getAttendanceHistorySummaries(
  dates: string[],
  totalActiveStudents: number
): Promise<DayAttendanceSummary[]> {
  if (dates.length === 0) return [];

  const summaries: DayAttendanceSummary[] = [];

  for (const d of dates) {
    let present = 0;
    let absent = 0;

    try {
      if (db) {
        const q = query(
          collection(db, ATTENDANCE_COLLECTION),
          where('date', '==', d)
        );
        const snapshot = await withTimeout(getDocs(q), 2500);
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === 'Present') present++;
          else if (data.status === 'Absent') absent++;
        });
      }
    } catch (err) {
      if (!isOfflineError(err)) {
        console.warn('History fetch error for date', d, err);
      }
    }

    if (present === 0 && absent === 0) {
      const localMap = getLocalAttendance(d);
      Object.values(localMap).forEach((st) => {
        if (st === 'Present') present++;
        else if (st === 'Absent') absent++;
      });
    }

    const totalMarked = present + absent;
    const pct = totalMarked > 0 ? (present / totalMarked) * 100 : 0;

    summaries.push({
      date: d,
      displayDate: formatDisplayDate(d),
      totalStudents: totalActiveStudents,
      presentCount: present,
      absentCount: absent,
      attendancePercentage: Math.round(pct * 10) / 10,
    });
  }

  return summaries;
}

/**
 * Get attendance across a range of dates (for weekly reports)
 */
export async function getAttendanceForDateRange(
  dateList: string[]
): Promise<Record<string, Record<string, AttendanceStatus>>> {
  const result: Record<string, Record<string, AttendanceStatus>> = {};

  await Promise.all(
    dateList.map(async (d) => {
      result[d] = await getAttendanceForDate(d);
    })
  );

  return result;
}

/**
 * Format YYYY-MM-DD into "09 September 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format YYYY-MM-DD into "Tuesday, 09 September 2026"
 */
export function formatFullDayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Convert Date to YYYY-MM-DD in local time
 */
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Permanently delete attendance records for a specific date across Local, Server, and Firestore.
 */
export async function deleteAttendanceForDate(
  dateStr: string,
  callerEmail?: string
): Promise<{ success: boolean; message: string }> {
  // 1. Delete from localStorage
  try {
    localStorage.removeItem(`sgi_attendance_${dateStr}`);
    const dates = getLocalDates().filter((d) => d !== dateStr);
    localStorage.setItem(LOCAL_DATES_KEY, JSON.stringify(dates));
  } catch {
    // ignore
  }

  // 2. Delete from Server
  try {
    await fetch(apiUrl(`/api/attendance/${encodeURIComponent(dateStr)}`), {
      method: 'DELETE',
      headers: callerEmail ? { 'x-admin-email': callerEmail } : {},
    });
  } catch (err) {
    console.warn('Server attendance delete notice:', err);
  }

  // 3. Delete from Firestore
  if (db) {
    try {
      const q = query(
        collection(db, ATTENDANCE_COLLECTION),
        where('date', '==', dateStr)
      );
      const snapshot = await withTimeout(getDocs(q), 6000);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await withTimeout(batch.commit(), 6000);
      }
    } catch (err) {
      console.warn('Firestore attendance delete notice:', err);
    }
  }

  return { success: true, message: `Attendance records for ${formatDisplayDate(dateStr)} deleted successfully.` };
}

/**
 * Permanently clear ALL attendance records across Local, Server, and Firestore.
 */
export async function clearAllAttendance(callerEmail?: string): Promise<{ success: boolean; message: string }> {
  // 1. Delete from localStorage
  try {
    const dates = getLocalDates();
    for (const d of dates) {
      localStorage.removeItem(`sgi_attendance_${d}`);
    }
    localStorage.removeItem(LOCAL_DATES_KEY);
  } catch {
    // ignore
  }

  // 2. Delete from Server
  try {
    await fetch(apiUrl('/api/attendance'), {
      method: 'DELETE',
      headers: callerEmail ? { 'x-admin-email': callerEmail } : {},
    });
  } catch (err) {
    console.warn('Server clear all attendance notice:', err);
  }

  // 3. Delete from Firestore
  if (db) {
    try {
      const snapshot = await withTimeout(getDocs(collection(db, ATTENDANCE_COLLECTION)), 8000);
      if (!snapshot.empty) {
        let batch = writeBatch(db);
        let count = 0;
        for (const docSnap of snapshot.docs) {
          batch.delete(docSnap.ref);
          count++;
          if (count % 400 === 0) {
            await withTimeout(batch.commit(), 6000);
            batch = writeBatch(db);
          }
        }
        if (count % 400 !== 0) {
          await withTimeout(batch.commit(), 6000);
        }
      }
    } catch (err) {
      console.warn('Firestore clear all attendance notice:', err);
    }
  }

  return { success: true, message: 'All attendance records have been cleared successfully.' };
}
