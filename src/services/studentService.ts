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
import { db, handleFirestoreError, isOfflineError } from './firebase';
import { Student, OperationType } from '../types';

const STUDENTS_COLLECTION = 'students';
const LOCAL_STORAGE_STUDENTS_KEY = 'sgi_students_cache';

function getStoredLocalStudents(): Student[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any previously seeded fake dummy students (id starts with 'local_student_')
        const realStudents = parsed.filter(
          (s: any) => s && s.id && !String(s.id).startsWith('local_student_')
        );
        if (realStudents.length !== parsed.length) {
          saveLocalStudents(realStudents);
        }
        return realStudents;
      }
    }
  } catch {
    // Ignore local storage error
  }
  return [];
}

function saveLocalStudents(students: Student[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(students));
  } catch {
    // Ignore local storage error
  }
}

function sortStudents(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const numA = parseInt(a.rollNumber, 10);
    const numB = parseInt(b.rollNumber, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.rollNumber.localeCompare(b.rollNumber);
  });
}

/**
 * Fetch all students from Firestore, ordered by rollNumber.
 * Gracefully falls back to local storage if Firestore is offline or unprovisioned.
 */
export async function getStudents(): Promise<Student[]> {
  try {
    if (!db) {
      return sortStudents(getStoredLocalStudents());
    }

    const q = query(collection(db, STUDENTS_COLLECTION), orderBy('rollNumber', 'asc'));
    const snapshot = await getDocs(q);
    const students: Student[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      students.push({
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

    if (students.length > 0) {
      saveLocalStudents(students);
      return sortStudents(students);
    }

    // If Firestore has 0 documents, check local storage (which may be pre-seeded)
    const local = getStoredLocalStudents();
    return sortStudents(local);
  } catch (error) {
    if (isOfflineError(error)) {
      console.warn('Firestore offline: loading student cohort from local cache.');
      return sortStudents(getStoredLocalStudents());
    }
    handleFirestoreError(error, OperationType.LIST, STUDENTS_COLLECTION);
  }
}

/**
 * Add a new student
 */
export async function addStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
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
    section: 'A',
    active: studentData.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  localList.push(newStudent);
  saveLocalStudents(localList);

  if (db) {
    try {
      const docRef = doc(collection(db, STUDENTS_COLLECTION), newId);
      await setDoc(docRef, newStudent);
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn('Student saved locally; cloud sync pending.');
      } else {
        console.warn('Notice: Firestore save error, saved locally:', error);
      }
    }
  }

  return newId;
}

/**
 * Update an existing student's details
 */
export async function updateStudent(id: string, updates: Partial<Student>): Promise<void> {
  const localList = getStoredLocalStudents();
  const index = localList.findIndex((s) => s.id === id);
  if (index !== -1) {
    localList[index] = {
      ...localList[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveLocalStudents(localList);
  }

  if (db) {
    try {
      const docRef = doc(db, STUDENTS_COLLECTION, id);
      const cleanedUpdates = {
        ...updates,
        updatedAt: new Date().toISOString(),
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
        console.warn('Student updated locally; cloud sync pending.');
      } else {
        console.warn('Notice: Firestore update error, updated locally:', error);
      }
    }
  }
}

/**
 * Delete a student from Firestore and local storage
 */
export async function deleteStudent(id: string): Promise<void> {
  const localList = getStoredLocalStudents();
  const filtered = localList.filter((s) => s.id !== id);
  saveLocalStudents(filtered);

  if (db) {
    try {
      const docRef = doc(db, STUDENTS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn('Student deleted locally; cloud sync pending.');
      } else {
        console.warn('Notice: Firestore delete error, deleted locally:', error);
      }
    }
  }
}

/**
 * Batch import students (for CSV/Excel data import)
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
  const existingRolls = new Set(localList.map((s) => s.rollNumber.toLowerCase()));
  const toAdd = importedList.filter((s) => !existingRolls.has(s.rollNumber.toLowerCase()));

  saveLocalStudents([...localList, ...toAdd]);

  if (db && toAdd.length > 0) {
    try {
      const batch = writeBatch(db);
      for (const s of toAdd) {
        const docRef = doc(collection(db, STUDENTS_COLLECTION), s.id);
        batch.set(docRef, s);
      }
      await batch.commit();
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn('Batch students stored locally; cloud sync pending.');
      } else {
        console.warn('Notice: Firestore batch import error, imported locally:', error);
      }
    }
  }

  return toAdd.length;
}

