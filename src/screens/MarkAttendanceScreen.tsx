import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Search,
  Check,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Plus,
  Download,
  Cloud,
} from 'lucide-react';
import { Student, AttendanceStatus, ScreenType } from '../types';
import { getStudents } from '../services/studentService';
import {
  getAttendanceForDate,
  saveAttendanceForDate,
  formatDisplayDate,
} from '../services/attendanceService';
import { exportDayWiseCSV, generateDayWiseCSVContent } from '../utils/csvExport';
import { uploadAttendanceToDrive, signInWithGoogleDrive } from '../services/googleDriveService';

interface MarkAttendanceScreenProps {
  onBack: () => void;
  onNavigate: (screen: ScreenType) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const MarkAttendanceScreen: React.FC<MarkAttendanceScreenProps> = ({
  onBack,
  onNavigate,
  selectedDate,
  onSelectDate,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDriveData, setPendingDriveData] = useState<{ date: string; csvContent: string; fileName: string } | null>(null);
  const [authorizingDrive, setAuthorizingDrive] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const studentList = await getStudents();
      const activeStudents = studentList.filter((s) => s.active);
      setStudents(activeStudents);

      const existingAttendance = await getAttendanceForDate(selectedDate);

      // Initialize attendance: if already in Firestore, use it; otherwise default to 'Present'
      const initial: Record<string, AttendanceStatus> = {};
      activeStudents.forEach((st) => {
        if (existingAttendance[st.id]) {
          initial[st.id] = existingAttendance[st.id];
        } else {
          // Default to Present for swift marking
          initial[st.id] = 'Present';
        }
      });
      setAttendance(initial);
    } catch (err: any) {
      console.error('Error loading attendance sheet:', err);
      setErrorMessage('Failed to load students and attendance from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const toggleStatus = (studentId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present',
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      updated[s.id] = 'Present';
    });
    setAttendance(updated);
  };

  const handleMarkAllAbsent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      updated[s.id] = 'Absent';
    });
    setAttendance(updated);
  };

  const handleSave = async () => {
    if (students.length === 0) return;
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const records = students.map((s) => ({
        studentId: s.id,
        status: attendance[s.id] || 'Present',
      }));

      // 1. Immediately persist attendance across all layers (local, server, Firestore)
      await saveAttendanceForDate(selectedDate, records);

      // 2. Automatically generate and upload attendance CSV to Google Drive in the background
      try {
        const csvContent = generateDayWiseCSVContent(selectedDate, students, attendance);
        const fileName = `SGI_Attendance_${selectedDate}_CSE_A.csv`;
        const driveResult = await uploadAttendanceToDrive(selectedDate, csvContent, fileName);
        if (driveResult.success) {
          setPendingDriveData(null);
          setSuccessMessage(`Attendance for ${formatDisplayDate(selectedDate)} saved & uploaded to Google Drive folder!`);
        } else if (driveResult.queued) {
          // Drive token pending one-time authorization
          setPendingDriveData({ date: selectedDate, csvContent, fileName });
          setSuccessMessage(`Attendance for ${formatDisplayDate(selectedDate)} saved safely in database!`);
        } else {
          setSuccessMessage(`Attendance for ${formatDisplayDate(selectedDate)} saved successfully!`);
        }
      } catch (driveErr) {
        console.warn('Google Drive CSV generation notice:', driveErr);
        setSuccessMessage(`Attendance for ${formatDisplayDate(selectedDate)} saved successfully!`);
      }

      setTimeout(() => setSuccessMessage(null), 8000);
    } catch (err: any) {
      console.error('Failed to save attendance:', err);
      setErrorMessage('Could not complete attendance save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAuthorizeDrive = async () => {
    if (!pendingDriveData) return;
    setAuthorizingDrive(true);
    try {
      const authRes = await signInWithGoogleDrive();
      if (authRes && authRes.accessToken) {
        const uploadRes = await uploadAttendanceToDrive(
          pendingDriveData.date,
          pendingDriveData.csvContent,
          pendingDriveData.fileName
        );
        if (uploadRes.success) {
          setPendingDriveData(null);
          setSuccessMessage(`Successfully uploaded to Google Drive ('Sobhasaria Attendance Records' folder)!`);
        } else {
          setSuccessMessage(`Drive token authorized! File sync is in progress.`);
        }
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(`Drive authorization error: ${err?.message || 'Failed to connect'}`);
      }
    } finally {
      setAuthorizingDrive(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.mobileNumber && s.mobileNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Generate Monday to Saturday days for the current week of selectedDate
  const weekDays = React.useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    const day = curr.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMon = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr);
    monday.setDate(diffToMon);

    const dayNames = [
      { name: 'Mon', full: 'Monday' },
      { name: 'Tue', full: 'Tuesday' },
      { name: 'Wed', full: 'Wednesday' },
      { name: 'Thu', full: 'Thursday' },
      { name: 'Fri', full: 'Friday' },
      { name: 'Sat', full: 'Saturday' },
    ];

    return dayNames.map((item, idx) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + idx);
      const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      return {
        short: item.name,
        full: item.full,
        dateStr,
        dayNum: dt.getDate(),
        isSelected: dateStr === selectedDate,
      };
    });
  }, [selectedDate]);

  return (
    <div className="space-y-4 pb-28 max-w-4xl mx-auto">
      {/* Top Header Matching Screenshot 3 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            id="mark-attendance-back-btn"
            onClick={onBack}
            className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Mark Attendance
            </h1>
            <p className="text-[11px] text-blue-700 font-semibold">
              B.Tech CSE Section A • Monday to Saturday
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => exportDayWiseCSV(selectedDate, students, attendance)}
            title="Export Day-Wise Attendance to Microsoft Excel CSV"
            className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Day CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
          <button
            onClick={loadData}
            title="Reload"
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl p-3 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Google Drive One-Time Authorization Card (when Drive token is pending) */}
      {pendingDriveData && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Google Drive One-Time Authorization
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                Attendance is safely saved! To upload this sheet to Google Drive (<strong>rk89experiment@gmail.com</strong>), please authorize once.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="mark-authorize-drive-btn"
            onClick={handleAuthorizeDrive}
            disabled={authorizingDrive}
            className="w-full sm:w-auto px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 transition-colors"
          >
            {authorizingDrive ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5" />
                <span>Authorize & Upload to Drive</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Date Selector & Monday-to-Saturday Day Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              {formatDisplayDate(selectedDate)}
            </span>
          </div>
          <input
            id="mark-attendance-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) onSelectDate(e.target.value);
            }}
            className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg focus:outline-hidden cursor-pointer"
          />
        </div>

        {/* Monday to Saturday Quick Day Buttons */}
        <div>
          <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center justify-between">
            <span>Gate Attendance (Monday to Saturday):</span>
            <span className="text-blue-700">6 Working Days</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {weekDays.map((wd) => (
              <button
                key={wd.dateStr}
                type="button"
                onClick={() => onSelectDate(wd.dateStr)}
                className={`py-1.5 sm:py-2 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                  wd.isSelected
                    ? 'bg-blue-900 text-white border-blue-900 shadow-xs font-bold'
                    : 'bg-slate-50 hover:bg-blue-50 text-slate-700 border-slate-200 font-semibold'
                }`}
              >
                <div className="text-[10px] sm:text-xs opacity-90 leading-tight">{wd.short}</div>
                <div className="text-xs sm:text-sm leading-tight mt-0.5">{wd.dayNum}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Matching Screenshot 3 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          id="mark-all-present-btn"
          type="button"
          onClick={handleMarkAllPresent}
          disabled={loading || students.length === 0}
          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>Mark All Present</span>
        </button>

        <button
          id="mark-all-absent-btn"
          type="button"
          onClick={handleMarkAllAbsent}
          disabled={loading || students.length === 0}
          className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          <span>Mark All Absent</span>
        </button>
      </div>

      {/* Search Input Matching Screenshot 3 */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="mark-attendance-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, roll number, father's name, or mobile..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent shadow-2xs"
        />
      </div>

      {/* Toast Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Student List Table Matching Screenshot 3 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 tracking-wider">
          <div className="col-span-2 sm:col-span-2">Roll No.</div>
          <div className="col-span-6 sm:col-span-7">Name</div>
          <div className="col-span-4 sm:col-span-3 text-right pr-2">Status</div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading attendance records from Firestore...
          </div>
        ) : students.length === 0 ? (
          /* Empty State */
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">No students added yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Add students in Student Management to begin marking Section A attendance.
            </p>
            <button
              onClick={() => onNavigate('students')}
              className="mt-4 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Go to Student Management
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
            No students match "{searchQuery}".
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredStudents.map((student) => {
              const status = attendance[student.id] || 'Present';
              const isPresent = status === 'Present';

              return (
                <div
                  key={student.id}
                  id={`attendance-row-${student.id}`}
                  onClick={() => toggleStatus(student.id)}
                  className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50/80 transition-colors cursor-pointer select-none"
                >
                  {/* Roll No */}
                  <div className="col-span-2 sm:col-span-2 font-mono text-xs sm:text-sm font-bold text-slate-800">
                    {student.rollNumber}
                  </div>

                  {/* Name & Father Name / Mobile */}
                  <div className="col-span-6 sm:col-span-7 min-w-0 pr-2">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {student.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 truncate mt-0.5">
                      {student.fatherName && (
                        <span className="truncate">
                          <span className="text-slate-400">Father:</span> {student.fatherName}
                        </span>
                      )}
                      {student.mobileNumber && (
                        <span className="text-blue-600 font-mono font-medium">
                          {student.mobileNumber}
                        </span>
                      )}
                      {!student.fatherName && !student.mobileNumber && (
                        <span className="text-slate-400">Section A</span>
                      )}
                    </div>
                  </div>

                  {/* Status Pill Toggle */}
                  <div className="col-span-4 sm:col-span-3 flex items-center justify-end space-x-1">
                    <button
                      type="button"
                      id={`status-btn-${student.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus(student.id);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-2xs flex items-center gap-1 ${
                        isPresent
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-rose-600 text-white hover:bg-rose-700'
                      }`}
                    >
                      {isPresent ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Present</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3 stroke-[3]" />
                          <span>Absent</span>
                        </>
                      )}
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Save Attendance Button Matching Screenshot 3 */}
      {students.length > 0 && (
        <div className="fixed bottom-16 sm:bottom-6 left-0 right-0 max-w-4xl mx-auto px-4 z-30 pointer-events-none">
          <div className="pointer-events-auto">
            <button
              id="save-attendance-main-btn"
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-900 hover:bg-blue-950 active:bg-blue-900 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2.5 transition-all duration-150 cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
