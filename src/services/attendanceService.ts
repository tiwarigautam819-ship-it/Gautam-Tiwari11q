import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, auth } from './firebase';
import { AttendanceRecord, AttendanceStatus, DayAttendanceSummary, OperationType } from '../types';

const ATTENDANCE_COLLECTION = 'attendance';

/**
 * Get all attendance records for a specific date (YYYY-MM-DD)
 */
export async function getAttendanceForDate(dateStr: string): Promise<Record<string, AttendanceStatus>> {
  try {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where('date', '==', dateStr)
    );
    const snapshot = await getDocs(q);
    const result: Record<string, AttendanceStatus> = {};

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.studentId && data.status) {
        result[data.studentId] = data.status as AttendanceStatus;
      }
    });

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ATTENDANCE_COLLECTION);
  }
}

/**
 * Save or update attendance records for a specific date.
 * Uses deterministic document IDs: `${date}_${studentId}`
 * This strictly prevents duplicate records for the same student on the same date!
 */
export async function saveAttendanceForDate(
  dateStr: string,
  records: Array<{ studentId: string; status: AttendanceStatus }>
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const markedAt = new Date().toISOString();
    const markedBy = auth.currentUser?.email || auth.currentUser?.uid || 'teacher-admin';

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

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, ATTENDANCE_COLLECTION);
  }
}

/**
 * Fetch all distinct dates where attendance has been recorded in Firestore
 */
export async function getAllAttendanceDates(): Promise<string[]> {
  try {
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    const datesSet = new Set<string>();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.date) {
        datesSet.add(data.date);
      }
    });

    return Array.from(datesSet).sort().reverse();
  } catch (error) {
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
  try {
    if (dates.length === 0) return [];

    const summaries: DayAttendanceSummary[] = [];

    for (const d of dates) {
      const q = query(
        collection(db, ATTENDANCE_COLLECTION),
        where('date', '==', d)
      );
      const snapshot = await getDocs(q);
      let present = 0;
      let absent = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'Present') present++;
        else if (data.status === 'Absent') absent++;
      });

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
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ATTENDANCE_COLLECTION);
  }
}

/**
 * Get attendance across a range of dates (for weekly reports)
 */
export async function getAttendanceForDateRange(
  dateList: string[]
): Promise<Record<string, Record<string, AttendanceStatus>>> {
  // Returns: { [dateStr]: { [studentId]: 'Present' | 'Absent' } }
  try {
    const result: Record<string, Record<string, AttendanceStatus>> = {};

    for (const d of dateList) {
      result[d] = await getAttendanceForDate(d);
    }

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ATTENDANCE_COLLECTION);
  }
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
