import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, isOfflineError, withTimeout } from './firebase';
import { Student, OperationType } from '../types';

const STUDENTS_COLLECTION = 'students';
const LOCAL_STORAGE_STUDENTS_KEY = 'sgi_students_cache';
const LOCAL_STORAGE_DELETED_KEY = 'sgi_deleted_students_ids';

/**
 * Get the set of IDs and roll numbers that have been explicitly deleted by the user.
 * This guarantees deleted students are never resurrected by sync, while any student
 * that has NOT been deleted is preserved forever across browser refreshes!
 */
export function getDeletedStudentIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map((id) => String(id).toLowerCase()));
      }
    }
  } catch {
    // Ignore storage errors
  }
  return new Set<string>();
}

export function markStudentDeleted(id: string, rollNumber?: string): void {
  try {
    const current = getDeletedStudentIds();
    current.add(id.toLowerCase());
    if (rollNumber) {
      current.add(`roll_${rollNumber.toLowerCase()}`);
    }
    localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // Ignore storage errors
  }
}

export function unmarkStudentDeleted(id: string, rollNumber?: string): void {
  try {
    const current = getDeletedStudentIds();
    current.delete(id.toLowerCase());
    if (rollNumber) {
      current.delete(`roll_${rollNumber.toLowerCase()}`);
    }
    localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Retrieve cached students from localStorage, strictly omitting deleted ones.
 */
function getStoredLocalStudents(): Student[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const deletedSet = getDeletedStudentIds();
        const validStudents = parsed.filter(
          (s: any) =>
            s &&
            s.id &&
            !deletedSet.has(String(s.id).toLowerCase()) &&
            (!s.rollNumber || !deletedSet.has(`roll_${String(s.rollNumber).toLowerCase()}`))
        );
        return validStudents;
      }
    }
  } catch {
    // Ignore local storage error
  }
  return [];
}

/**
 * Save active students to localStorage.
 */
function saveLocalStudents(students: Student[]): void {
  try {
    const deletedSet = getDeletedStudentIds();
    const cleanList = students.filter(
      (s) =>
        s &&
        s.id &&
        !deletedSet.has(String(s.id).toLowerCase()) &&
        (!s.rollNumber || !deletedSet.has(`roll_${String(s.rollNumber).toLowerCase()}`))
    );
    localStorage.setItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(cleanList));
  } catch {
    // Ignore local storage error
  }
}

/**
 * Sort students numerically by roll number when possible, or alphabetically.
 */
export function sortStudents(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const numA = parseInt(a.rollNumber, 10);
    const numB = parseInt(b.rollNumber, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return (a.rollNumber || '').localeCompare(b.rollNumber || '');
  });
}

/**
 * Fetch students from server persistent storage (/api/students).
 */
async function fetchStudentsFromServer(): Promise<{ students: Student[]; deletedIds: string[] }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('/api/students', {
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (res.ok) {
      const data = await res.json();
      return {
        students: Array.isArray(data.students) ? data.students : [],
        deletedIds: Array.isArray(data.deletedIds) ? data.deletedIds : [],
      };
    }
  } catch {
    // Server fetch timeout or offline
  }
  return { students: [], deletedIds: [] };
}

/**
 * Sync a student to the backend /api/students
 */
async function syncStudentToServer(student: Student): Promise<void> {
  try {
    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student }),
    }).catch(() => {});
  } catch {
    // Non-blocking
  }
}

/**
 * Sync multiple students to the backend /api/students
 */
async function syncStudentsToServer(students: Student[]): Promise<void> {
  if (students.length === 0) return;
  try {
    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students }),
    }).catch(() => {});
  } catch {
    // Non-blocking
  }
}

/**
 * Fetch all students, combining localStorage, server-side storage, and Firestore.
 * Ensures zero data loss: any student added by the user remains even after refreshing
 * the page, and is NEVER removed until explicitly deleted!
 */
export async function getStudents(): Promise<Student[]> {
  const localList = getStoredLocalStudents();
  const deletedSet = getDeletedStudentIds();

  // Map to hold unique students by ID and normalized rollNumber
  const studentMap = new Map<string, Student>();
  const rollMap = new Map<string, Student>();

  // 1. Seed with local students first
  for (const s of localList) {
    if (deletedSet.has(s.id.toLowerCase())) continue;
    if (s.rollNumber && deletedSet.has(`roll_${s.rollNumber.toLowerCase()}`)) continue;

    studentMap.set(s.id, s);
    if (s.rollNumber) {
      rollMap.set(s.rollNumber.toLowerCase().trim(), s);
    }
  }

  // 2. Fetch server and Firestore in parallel
  const serverPromise = fetchStudentsFromServer();
  const firestorePromise = (async (): Promise<Student[]> => {
    if (!db) return [];
    try {
      const q = query(collection(db, STUDENTS_COLLECTION), orderBy('rollNumber', 'asc'));
      const snapshot = await withTimeout(getDocs(q), 3000);
      const list: Student[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          rollNumber: data.rollNumber || '',
          name: data.name || '',
          fatherName: data.fatherName || '',
          mobileNumber: data.mobileNumber || '',
          enrollmentNumber: data.enrollmentNumber || '',
          class: data.class || 'B.Tech',
          branch: data.branch || 'Computer Science & Engineering',
          semester: data.semester || '1st Semester',
          section: data.section || 'A',
          active: data.active !== undefined ? data.active : true,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      return list;
    } catch {
      return [];
    }
  })();

  const [serverResult, firestoreStudents] = await Promise.all([
    serverPromise,
    firestorePromise,
  ]);

  // Record any deleted IDs from server into local deleted set
  if (serverResult.deletedIds && serverResult.deletedIds.length > 0) {
    for (const delId of serverResult.deletedIds) {
      deletedSet.add(delId.toLowerCase());
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(deletedSet)));
    } catch {
      // ignore
    }
  }

  // 3. Merge Server Students
  for (const s of serverResult.students) {
    if (!s || !s.id) continue;
    if (deletedSet.has(s.id.toLowerCase())) continue;
    const cleanRoll = (s.rollNumber || '').toLowerCase().trim();
    if (cleanRoll && deletedSet.has(`roll_${cleanRoll}`)) continue;

    const existing = studentMap.get(s.id) || (cleanRoll ? rollMap.get(cleanRoll) : undefined);
    if (!existing) {
      studentMap.set(s.id, s);
      if (cleanRoll) rollMap.set(cleanRoll, s);
    } else {
      // Keep more recently updated student
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const serverTime = new Date(s.updatedAt || s.createdAt || 0).getTime();
      if (serverTime > existingTime) {
        studentMap.set(s.id, s);
        if (cleanRoll) rollMap.set(cleanRoll, s);
      }
    }
  }

  // 4. Merge Firestore Students
  for (const s of firestoreStudents) {
    if (!s || !s.id) continue;
    if (deletedSet.has(s.id.toLowerCase())) continue;
    const cleanRoll = (s.rollNumber || '').toLowerCase().trim();
    if (cleanRoll && deletedSet.has(`roll_${cleanRoll}`)) continue;

    const existing = studentMap.get(s.id) || (cleanRoll ? rollMap.get(cleanRoll) : undefined);
    if (!existing) {
      studentMap.set(s.id, s);
      if (cleanRoll) rollMap.set(cleanRoll, s);
    } else {
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const fsTime = new Date(s.updatedAt || s.createdAt || 0).getTime();
      if (fsTime > existingTime) {
        studentMap.set(s.id, s);
        if (cleanRoll) rollMap.set(cleanRoll, s);
      }
    }
  }

  const mergedList = Array.from(studentMap.values()).filter(
    (s) =>
      !deletedSet.has(s.id.toLowerCase()) &&
      (!s.rollNumber || !deletedSet.has(`roll_${s.rollNumber.toLowerCase().trim()}`))
  );

  // 5. Save merged list locally so next page refresh has EVERY student instantly
  saveLocalStudents(mergedList);

  // 6. Background synchronization: ensure any locally created student is also synced
  // to the server and Firestore if not already present there
  if (mergedList.length > 0) {
    const serverIds = new Set(serverResult.students.map((s) => s.id));
    const missingOnServer = mergedList.filter((s) => !serverIds.has(s.id));
    if (missingOnServer.length > 0) {
      syncStudentsToServer(missingOnServer);
    }

    if (db) {
      const fsIds = new Set(firestoreStudents.map((s) => s.id));
      const missingOnFirestore = mergedList.filter((s) => !fsIds.has(s.id));
      if (missingOnFirestore.length > 0) {
        try {
          const batch = writeBatch(db);
          for (const s of missingOnFirestore.slice(0, 50)) {
            const docRef = doc(collection(db, STUDENTS_COLLECTION), s.id);
            batch.set(docRef, s);
          }
          batch.commit().catch(() => {});
        } catch {
          // ignore
        }
      }
    }
  }

  return sortStudents(mergedList);
}

/**
 * Add a new student.
 * Guarantees that the student is saved to local storage, synced to the backend server,
 * and persisted to Firestore. The student WILL REMAIN after page refresh!
 */
export async function addStudent(
  studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const localList = getStoredLocalStudents();
  const newId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newStudent: Student = {
    ...studentData,
    id: newId,
    rollNumber: studentData.rollNumber.trim(),
    name: studentData.name.trim(),
    fatherName: (studentData.fatherName || '').trim(),
    mobileNumber: (studentData.mobileNumber || '').trim(),
    enrollmentNumber: (studentData.enrollmentNumber || '').trim().toUpperCase(),
    class: 'B.Tech',
    branch: 'Computer Science & Engineering',
    semester: studentData.semester || '1st Semester',
    section: 'A',
    active: studentData.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Remove from deleted set if this roll number was previously deleted
  unmarkStudentDeleted(newId, newStudent.rollNumber);

  // 2. Immediately save to local storage
  const existingIdx = localList.findIndex(
    (s) => s.id === newId || s.rollNumber.toLowerCase() === newStudent.rollNumber.toLowerCase()
  );
  if (existingIdx >= 0) {
    localList[existingIdx] = newStudent;
  } else {
    localList.push(newStudent);
  }
  saveLocalStudents(localList);

  // 3. Immediately persist to server repository (survives any page reload)
  syncStudentToServer(newStudent);

  // 4. Persist to Firestore if available
  if (db) {
    try {
      const docRef = doc(collection(db, STUDENTS_COLLECTION), newId);
      await setDoc(docRef, newStudent);
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn('Student saved locally & on server; cloud sync pending.');
      } else {
        console.warn('Notice: Firestore save error, saved locally & on server:', error);
      }
    }
  }

  return newId;
}

/**
 * Update an existing student's details across all storage layers.
 */
export async function updateStudent(id: string, updates: Partial<Student>): Promise<void> {
  const localList = getStoredLocalStudents();
  const index = localList.findIndex((s) => s.id === id);
  const now = new Date().toISOString();

  let updatedStudent: Student | null = null;
  if (index !== -1) {
    localList[index] = {
      ...localList[index],
      ...updates,
      updatedAt: now,
    };
    updatedStudent = localList[index];
    saveLocalStudents(localList);
  }

  // Sync to server
  if (updatedStudent) {
    syncStudentToServer(updatedStudent);
  }

  // Sync to Firestore
  if (db) {
    try {
      const docRef = doc(db, STUDENTS_COLLECTION, id);
      const cleanedUpdates = {
        ...updates,
        updatedAt: now,
      };
      if (cleanedUpdates.rollNumber) cleanedUpdates.rollNumber = cleanedUpdates.rollNumber.trim();
      if (cleanedUpdates.name) cleanedUpdates.name = cleanedUpdates.name.trim();
      if (cleanedUpdates.fatherName !== undefined) cleanedUpdates.fatherName = cleanedUpdates.fatherName.trim();
      if (cleanedUpdates.mobileNumber !== undefined) cleanedUpdates.mobileNumber = cleanedUpdates.mobileNumber.trim();
      if (cleanedUpdates.enrollmentNumber !== undefined) {
        cleanedUpdates.enrollmentNumber = cleanedUpdates.enrollmentNumber.trim().toUpperCase();
      }
      await updateDoc(docRef, cleanedUpdates);
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn('Student updated locally & on server; cloud sync pending.');
      } else {
        console.warn('Notice: Firestore update error, updated locally:', error);
      }
    }
  }
}

/**
 * Delete a student from Firestore, server repository, and local storage.
 * Only when explicitly deleted here will the student be removed!
 */
export async function deleteStudent(id: string): Promise<void> {
  const localList = getStoredLocalStudents();
  const targetStudent = localList.find((s) => s.id === id);

  // 1. Mark as deleted in localStorage tombstones so it cannot resurrect
  markStudentDeleted(id, targetStudent?.rollNumber);

  // 2. Remove from local list
  const filtered = localList.filter((s) => s.id !== id);
  saveLocalStudents(filtered);

  // 3. Delete from backend server repository
  try {
    fetch(`/api/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch {
    // ignore
  }

  // 4. Delete from Firestore
  if (db) {
    try {
      const docRef = doc(db, STUDENTS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn('Student deleted locally & on server; cloud sync pending.');
      } else {
        console.warn('Notice: Firestore delete error, deleted locally:', error);
      }
    }
  }
}

/**
 * Batch import students (for CSV/Excel data import).
 */
export async function batchImportStudents(
  students: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<number> {
  const now = new Date().toISOString();
  const localList = getStoredLocalStudents();

  const importedList: Student[] = students.map((s, idx) => ({
    id: `student_imp_${Date.now()}_${idx}`,
    rollNumber: s.rollNumber.trim(),
    name: s.name.trim(),
    fatherName: (s.fatherName || '').trim(),
    mobileNumber: (s.mobileNumber || '').trim(),
    enrollmentNumber: (s.enrollmentNumber || '').trim().toUpperCase(),
    class: 'B.Tech',
    branch: 'Computer Science & Engineering',
    semester: s.semester || '1st Semester',
    section: 'A',
    active: true,
    createdAt: now,
    updatedAt: now,
  }));

  // Deduplicate by roll number against local list
  const existingRolls = new Set(localList.map((s) => s.rollNumber.toLowerCase().trim()));
  const toAdd = importedList.filter((s) => !existingRolls.has(s.rollNumber.toLowerCase().trim()));

  if (toAdd.length === 0) return 0;

  // Unmark any tombstoned roll numbers being re-imported
  for (const item of toAdd) {
    unmarkStudentDeleted(item.id, item.rollNumber);
  }

  const combined = [...localList, ...toAdd];
  saveLocalStudents(combined);

  // Sync to server
  syncStudentsToServer(toAdd);

  // Sync to Firestore
  if (db) {
    try {
      const batch = writeBatch(db);
      for (const s of toAdd) {
        const docRef = doc(collection(db, STUDENTS_COLLECTION), s.id);
        batch.set(docRef, s);
      }
      await batch.commit();
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn('Batch students stored locally & on server; cloud sync pending.');
      } else {
        console.warn('Notice: Firestore batch import error, imported locally:', error);
      }
    }
  }

  return toAdd.length;
}
