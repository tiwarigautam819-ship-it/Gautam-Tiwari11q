import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';
import { Student } from '../types';
import {
  getStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  batchImportStudents,
} from '../services/studentService';
import { AddEditStudentModal } from './AddEditStudentModal';
import { DataImportModal } from './DataImportModal';

interface StudentManagementScreenProps {
  onBack: () => void;
}

export const StudentManagementScreen: React.FC<StudentManagementScreenProps> = ({ onBack }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getStudents();
      setStudents(list);
    } catch (err: any) {
      console.error('Error fetching students:', err);
      setError('Unable to fetch students from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setStudentToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setStudentToEdit(student);
    setModalOpen(true);
  };

  const handleSaveStudent = async (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (studentToEdit) {
      await updateStudent(studentToEdit.id, studentData);
      setNotification(`Student "${studentData.name}" updated successfully.`);
    } else {
      await addStudent(studentData);
      setNotification(`Student "${studentData.name}" added to Section A.`);
    }
    setTimeout(() => setNotification(null), 4000);
    await loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    try {
      await deleteStudent(studentToDelete.id);
      setNotification(`Student "${studentToDelete.name}" removed from Section A.`);
      setTimeout(() => setNotification(null), 4000);
      setStudentToDelete(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete student.');
    } finally {
      setDeleting(false);
    }
  };

  const handleBatchImport = async (
    importedStudents: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    const count = await batchImportStudents(importedStudents);
    setNotification(`Successfully imported ${count} students into Section A.`);
    setTimeout(() => setNotification(null), 4000);
    await loadData();
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.enrollmentNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      {/* Header Matching Screenshot 4 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            id="student-mgmt-back-btn"
            onClick={onBack}
            className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Student Management
          </h1>
        </div>
        <button
          onClick={loadData}
          title="Reload"
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Input Matching Screenshot 4 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="student-mgmt-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, roll number, or enrollment..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-2xs"
        />
      </div>

      {/* Actions Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-600">
          Total: <span className="text-blue-700 font-bold">{students.length} Students</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="import-csv-modal-btn"
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
            <span>Import CSV</span>
          </button>

          <button
            id="add-student-btn"
            type="button"
            onClick={handleOpenAdd}
            className="py-2 px-3.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Student List Cards Matching Screenshot 4 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading students from Firestore...
          </div>
        ) : students.length === 0 ? (
          /* Empty State */
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No students added yet.</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You can manually add students one-by-one or import a list via CSV. The application dynamically adjusts to any roll number system.
            </p>
            <div className="flex items-center justify-center gap-2.5 mt-4">
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-950 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Student
              </button>
              <button
                onClick={() => setImportModalOpen(true)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" /> Import CSV
              </button>
            </div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
            No students found matching "{searchQuery}".
          </div>
        ) : (
          filteredStudents.map((student) => (
            <div
              key={student.id}
              id={`student-card-${student.id}`}
              className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              {/* Left: Roll No badge & Info */}
              <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0">
                {/* Roll No badge matching screenshot 4 */}
                <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-800 font-mono font-bold text-sm flex items-center justify-center shrink-0">
                  {student.rollNumber}
                </div>

                {/* Name and Subtitle */}
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {student.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    Enroll. No: {student.enrollmentNumber} | CSE | {student.semester || 'Sem 1'}
                  </p>
                </div>
              </div>

              {/* Right: Actions matching screenshot 4 */}
              <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                {/* Edit Button */}
                <button
                  id={`edit-student-btn-${student.id}`}
                  onClick={() => handleOpenEdit(student)}
                  title="Edit Student"
                  className="p-2 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  id={`delete-student-btn-${student.id}`}
                  onClick={() => setStudentToDelete(student)}
                  title="Delete Student"
                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Student Modal */}
      <AddEditStudentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveStudent}
        studentToEdit={studentToEdit}
        existingRollNumbers={students.map((s) => s.rollNumber)}
        existingEnrollments={students.map((s) => s.enrollmentNumber)}
      />

      {/* CSV Import Modal */}
      <DataImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleBatchImport}
        existingStudents={students}
      />

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Student?</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to remove <strong>{studentToDelete.name}</strong> (Roll No: {studentToDelete.rollNumber}) from B.Tech CSE Section A? This action cannot be undone.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="py-2 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
