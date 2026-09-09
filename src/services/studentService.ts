import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError } from './firebase';
import { Student, OperationType } from '../types';

const STUDENTS_COLLECTION = 'students';

/**
 * Fetch all students from Firestore, ordered by rollNumber
 */
export async function getStudents(): Promise<Student[]> {
  try {
    const q = query(collection(db, STUDENTS_COLLECTION), orderBy('rollNumber', 'asc'));
    const snapshot = await getDocs(q);
    const students: Student[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      students.push({
        id: docSnap.id,
        rollNumber: data.rollNumber || '',
        name: data.name || '',
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

    // Sort naturally by roll number in case string formatting differs (e.g. "01", "2", "10")
    return students.sort((a, b) => {
      const numA = parseInt(a.rollNumber, 10);
      const numB = parseInt(b.rollNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.rollNumber.localeCompare(b.rollNumber);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, STUDENTS_COLLECTION);
  }
}

/**
 * Add a new student
 */
export async function addStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const newDocRef = doc(collection(db, STUDENTS_COLLECTION));
    const now = new Date().toISOString();
    const newStudent: Student = {
      ...studentData,
      id: newDocRef.id,
      rollNumber: studentData.rollNumber.trim(),
      name: studentData.name.trim(),
      enrollmentNumber: studentData.enrollmentNumber.trim().toUpperCase(),
      class: 'B.Tech',
      branch: 'Computer Science & Engineering',
      section: 'A',
      active: studentData.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDocRef, newStudent);
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, STUDENTS_COLLECTION);
  }
}

/**
 * Update an existing student's details
 */
export async function updateStudent(id: string, updates: Partial<Student>): Promise<void> {
  const path = `${STUDENTS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, id);
    const cleanedUpdates = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (cleanedUpdates.rollNumber) cleanedUpdates.rollNumber = cleanedUpdates.rollNumber.trim();
    if (cleanedUpdates.name) cleanedUpdates.name = cleanedUpdates.name.trim();
    if (cleanedUpdates.enrollmentNumber) {
      cleanedUpdates.enrollmentNumber = cleanedUpdates.enrollmentNumber.trim().toUpperCase();
    }
    await updateDoc(docRef, cleanedUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete a student from Firestore
 */
export async function deleteStudent(id: string): Promise<void> {
  const path = `${STUDENTS_COLLECTION}/${id}`;
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Batch import students (for CSV/Excel data import)
 */
export async function batchImportStudents(
  students: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<number> {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    for (const s of students) {
      const docRef = doc(collection(db, STUDENTS_COLLECTION));
      const newStudent: Student = {
        id: docRef.id,
        rollNumber: s.rollNumber.trim(),
        name: s.name.trim(),
        enrollmentNumber: s.enrollmentNumber.trim().toUpperCase(),
        class: 'B.Tech',
        branch: 'Computer Science & Engineering',
        semester: s.semester || '1st Semester',
        section: 'A',
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(docRef, newStudent);
    }

    await batch.commit();
    return students.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, STUDENTS_COLLECTION);
  }
}
