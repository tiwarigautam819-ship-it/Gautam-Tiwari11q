import React, { useState, useEffect } from 'react';
import {
  X,
  ListOrdered,
  User,
  CreditCard,
  GraduationCap,
  Cpu,
  Calendar,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { Student } from '../types';

interface AddEditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  studentToEdit?: Student | null;
  existingRollNumbers: string[];
  existingEnrollments: string[];
}

export const AddEditStudentModal: React.FC<AddEditStudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  studentToEdit,
  existingRollNumbers,
  existingEnrollments,
}) => {
  const [rollNumber, setRollNumber] = useState('');
  const [name, setName] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [semester, setSemester] = useState('1st Semester');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (studentToEdit) {
      setRollNumber(studentToEdit.rollNumber);
      setName(studentToEdit.name);
      setEnrollmentNumber(studentToEdit.enrollmentNumber);
      setSemester(studentToEdit.semester || '1st Semester');
    } else {
      // Suggest next roll number
      const numbers = existingRollNumbers
        .map((r) => parseInt(r, 10))
        .filter((n) => !isNaN(n));
      const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      const formatted = nextNum < 10 ? `0${nextNum}` : String(nextNum);

      setRollNumber(formatted);
      setName('');
      setEnrollmentNumber('');
      setSemester('1st Semester');
    }
    setError(null);
  }, [studentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanRoll = rollNumber.trim();
    const cleanName = name.trim();
    const cleanEnroll = enrollmentNumber.trim().toUpperCase();

    if (!cleanRoll) {
      setError('Roll number is required.');
      return;
    }
    if (!cleanName) {
      setError('Student name is required.');
      return;
    }
    if (!cleanEnroll) {
      setError('Enrollment number is required.');
      return;
    }

    // Check duplicates if adding new or if changed
    if (
      (!studentToEdit || studentToEdit.rollNumber !== cleanRoll) &&
      existingRollNumbers.includes(cleanRoll)
    ) {
      setError(`Roll number "${cleanRoll}" is already assigned to another student.`);
      return;
    }

    if (
      (!studentToEdit || studentToEdit.enrollmentNumber.toUpperCase() !== cleanEnroll) &&
      existingEnrollments.includes(cleanEnroll)
    ) {
      setError(`Enrollment number "${cleanEnroll}" already exists.`);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        rollNumber: cleanRoll,
        name: cleanName,
        enrollmentNumber: cleanEnroll,
        class: 'B.Tech',
        branch: 'Computer Science & Engineering',
        semester,
        section: 'A',
        active: true,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save student.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header Matching Screenshot 5 */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {studentToEdit ? 'Edit Student' : 'Add Student'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Matching Screenshot 5 */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Roll Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Roll Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <ListOrdered className="w-4 h-4" />
              </div>
              <input
                id="student-roll-input"
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 09"
                required
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Student Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="student-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ritika Sharma"
                required
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Enrollment Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enrollment Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <input
                id="student-enrollment-input"
                type="text"
                value={enrollmentNumber}
                onChange={(e) => setEnrollmentNumber(e.target.value)}
                placeholder="e.g. 238TECH009"
                required
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 uppercase focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>

          {/* Class (Fixed scope) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <select
                disabled
                className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-600 cursor-not-allowed appearance-none"
              >
                <option>B.Tech</option>
              </select>
            </div>
          </div>

          {/* Branch (Fixed scope) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Branch
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Cpu className="w-4 h-4" />
              </div>
              <select
                disabled
                className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-600 cursor-not-allowed appearance-none"
              >
                <option>Computer Science & Engineering</option>
              </select>
            </div>
          </div>

          {/* Semester */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Semester
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <select
                id="student-semester-select"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
                <option value="3rd Semester">3rd Semester</option>
                <option value="4th Semester">4th Semester</option>
                <option value="5th Semester">5th Semester</option>
                <option value="6th Semester">6th Semester</option>
                <option value="7th Semester">7th Semester</option>
                <option value="8th Semester">8th Semester</option>
              </select>
            </div>
          </div>

          {/* Section (Fixed scope) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Section
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Layers className="w-4 h-4" />
              </div>
              <select
                disabled
                className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-600 cursor-not-allowed appearance-none"
              >
                <option>A</option>
              </select>
            </div>
          </div>

          {/* Modal Action Buttons Matching Screenshot 5 */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              id="student-form-cancel-btn"
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="student-form-save-btn"
              disabled={saving}
              className="py-2.5 px-6 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs sm:text-sm shadow-md transition-all duration-150 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
