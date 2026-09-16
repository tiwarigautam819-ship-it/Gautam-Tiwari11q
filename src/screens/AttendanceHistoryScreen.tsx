import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Edit3,
  RefreshCw,
  Search,
  Download,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { DayAttendanceSummary, ScreenType, Student, AttendanceStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getAllAttendanceDates,
  getAttendanceHistorySummaries,
  getAttendanceForDate,
  formatDisplayDate,
  saveAttendanceForDate,
  deleteAttendanceForDate,
  clearAllAttendance,
} from '../services/attendanceService';
import { getStudents } from '../services/studentService';
import { exportDayWiseCSV } from '../utils/csvExport';

interface AttendanceHistoryScreenProps {
  onBack: () => void;
  onNavigateToMarkDate: (date: string) => void;
}

export const AttendanceHistoryScreen: React.FC<AttendanceHistoryScreenProps> = ({
  onBack,
  onNavigateToMarkDate,
}) => {
  const { user, canDeleteData } = useAuth();
  const [dates, setDates] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<DayAttendanceSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeStudents, setActiveStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Drilldown / day viewer modal
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const [dayAttendance, setDayAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [dayLoading, setDayLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // Delete modals state
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);
  const [deletingDate, setDeletingDate] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const students = await getStudents();
      const active = students.filter((s) => s.active);
      setActiveStudents(active);

      const allDates = await getAllAttendanceDates();
      setDates(allDates);

      if (allDates.length > 0) {
        if (!selectedDate || !allDates.includes(selectedDate)) {
          setSelectedDate(allDates[0]);
        }
        const histSummaries = await getAttendanceHistorySummaries(allDates, active.length);
        setSummaries(histSummaries);
      } else {
        setSelectedDate('');
        setSummaries([]);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const currentSummary = summaries.find((s) => s.date === selectedDate) || {
    date: selectedDate,
    displayDate: formatDisplayDate(selectedDate || new Date().toISOString().split('T')[0]),
    totalStudents: activeStudents.length,
    presentCount: 0,
    absentCount: 0,
    attendancePercentage: 0,
  };

  const handleInspectDate = async (dateStr: string) => {
    setViewingDate(dateStr);
    setDayLoading(true);
    setEditSuccess(false);
    try {
      const att = await getAttendanceForDate(dateStr);
      setDayAttendance(att);
    } catch (err) {
      console.error('Error fetching date attendance:', err);
    } finally {
      setDayLoading(false);
    }
  };

  const handleToggleDayStatus = (studentId: string) => {
    setDayAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present',
    }));
  };

  const handleSaveDayEdit = async () => {
    if (!viewingDate) return;
    setSavingEdit(true);
    try {
      const records = activeStudents.map((s) => ({
        studentId: s.id,
        status: dayAttendance[s.id] || 'Present',
      }));
      await saveAttendanceForDate(viewingDate, records);
      setEditSuccess(true);
      await loadHistory();
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update attendance:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDeleteDate = async () => {
    if (!dateToDelete) return;
    if (!canDeleteData) {
      setDeleteNotice('Permission Denied: Only authorized administrators can delete attendance data.');
      setDateToDelete(null);
      return;
    }
    setDeletingDate(true);
    try {
      const res = await deleteAttendanceForDate(dateToDelete, user?.email || undefined);
      setDeleteNotice(res.message);
      if (viewingDate === dateToDelete) {
        setViewingDate(null);
      }
      if (selectedDate === dateToDelete) {
        setSelectedDate('');
      }
      await loadHistory();
      setTimeout(() => setDeleteNotice(null), 4000);
    } catch (err) {
      console.error('Failed to delete date attendance:', err);
    } finally {
      setDeletingDate(false);
      setDateToDelete(null);
    }
  };

  const handleConfirmClearAll = async () => {
    if (!canDeleteData) {
      setDeleteNotice('Permission Denied: Only authorized administrators can delete attendance data.');
      setShowClearAllModal(false);
      return;
    }
    setClearingAll(true);
    try {
      const res = await clearAllAttendance(user?.email || undefined);
      setDeleteNotice(res.message);
      if (viewingDate) setViewingDate(null);
      setSelectedDate('');
      await loadHistory();
      setTimeout(() => setDeleteNotice(null), 4000);
    } catch (err) {
      console.error('Failed to clear all attendance:', err);
    } finally {
      setClearingAll(false);
      setShowClearAllModal(false);
    }
  };

  const handleExportSelectedDay = async () => {
    if (!selectedDate || activeStudents.length === 0) return;
    try {
      const att = await getAttendanceForDate(selectedDate);
      exportDayWiseCSV(selectedDate, activeStudents, att);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      {/* Header Matching Screenshot 6 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            id="history-back-btn"
            onClick={onBack}
            className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Attendance History
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            id="history-export-excel-btn"
            onClick={handleExportSelectedDay}
            title="Export Selected Date to Microsoft Excel (.xlsx)"
            className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>
          <button
            onClick={loadHistory}
            title="Reload"
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success / Delete Notification */}
      {deleteNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{deleteNotice}</span>
        </div>
      )}

      {/* Select Date Bar Matching Screenshot 6 */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5 text-slate-700">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Select Date
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-900">
            {formatDisplayDate(selectedDate || new Date().toISOString().split('T')[0])}
          </span>
        </div>
        <input
          id="history-date-picker"
          type="date"
          value={selectedDate}
          onChange={(e) => {
            if (e.target.value) {
              setSelectedDate(e.target.value);
            }
          }}
          className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg focus:outline-hidden cursor-pointer"
        />
      </div>

      {/* Summary Stat Boxes for Selected Date Matching Screenshot 6 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Present Box (Green) */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center space-x-3 sm:space-x-4 shadow-2xs">
          <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Present
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              {currentSummary.presentCount}
            </p>
          </div>
        </div>

        {/* Absent Box (Red) */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 flex items-center space-x-3 sm:space-x-4 shadow-2xs">
          <div className="w-11 h-11 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              Absent
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              {currentSummary.absentCount}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Edit and Delete for Currently Selected Date */}
      {selectedDate && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={() => handleInspectDate(selectedDate)}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" /> View / Edit This Day's Sheet
          </button>
          {canDeleteData && (
            <button
              onClick={() => setDateToDelete(selectedDate)}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              title="Delete This Date's Attendance (Admin Only)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Delete This Date's Attendance
            </button>
          )}
        </div>
      )}

      {/* Historical Dates List Matching Screenshot 6 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Recorded Attendance History
          </span>
          {canDeleteData && summaries.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline cursor-pointer"
              title="Clear All History (Admin Only)"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All History
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading history records...
          </div>
        ) : summaries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
            <p className="font-semibold text-slate-700">No attendance records found.</p>
            <p className="text-slate-400 mt-1">
              Mark attendance from the dashboard to start building Section A history.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {summaries.map((item) => (
              <div
                key={item.date}
                id={`history-item-${item.date}`}
                onClick={() => {
                  setSelectedDate(item.date);
                  handleInspectDate(item.date);
                }}
                className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs sm:text-sm font-bold text-slate-800">
                    {item.displayDate}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-xs sm:text-sm">
                  <span className="text-emerald-700 font-bold">
                    {item.presentCount} Present
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-rose-700 font-bold">
                    {item.absentCount} Absent
                  </span>
                  <button
                    type="button"
                    title={`Delete attendance for ${item.displayDate}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateToDelete(item.date);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-0.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drill-down / Edit Modal for Day Attendance */}
      {viewingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold">
                  Attendance Sheet: {formatDisplayDate(viewingDate)}
                </h3>
                <p className="text-[11px] text-blue-200">
                  Tap any status pill to toggle Present / Absent
                </p>
              </div>
              <button
                onClick={() => setViewingDate(null)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Notification */}
            {editSuccess && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-semibold text-center border-b border-emerald-100">
                Attendance modifications saved to Firestore!
              </div>
            )}

            {/* Student list */}
            <div className="p-4 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {dayLoading ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Loading attendance records...
                </div>
              ) : activeStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No active students in Section A.
                </div>
              ) : (
                activeStudents.map((st) => {
                  const status = dayAttendance[st.id] || 'Absent';
                  const isPresent = status === 'Present';

                  return (
                    <div
                      key={st.id}
                      onClick={() => handleToggleDayStatus(st.id)}
                      className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-xs font-bold text-slate-700 w-7">
                          {st.rollNumber}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{st.name}</p>
                          <p className="text-[10px] text-slate-400">{st.enrollmentNumber}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleDayStatus(st.id);
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-2xs ${
                          isPresent
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-rose-600 text-white hover:bg-rose-700'
                        }`}
                      >
                        {status}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDateToDelete(viewingDate)}
                className="py-2 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Sheet</span>
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setViewingDate(null)}
                  className="py-2 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveDayEdit}
                  disabled={savingEdit}
                  className="py-2 px-5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Specific Date */}
      {canDeleteData && dateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Attendance Record?</h3>
              <p className="text-xs text-rose-700 font-bold">
                {formatDisplayDate(dateToDelete)}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kya aap is tarikh ki attendance ko permanently delete karna chahte hain? Yeh Firestore aur server dono se hata di jayegi.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDateToDelete(null)}
                disabled={deletingDate}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDate}
                disabled={deletingDate}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {deletingDate ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear All Attendance */}
      {canDeleteData && showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Clear All Attendance History?</h3>
              <p className="text-xs text-rose-700 font-semibold">
                Permanent Action
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kya aap poori attendance history ko delete karna chahte hain? Sabhi tareekhon ke records hata diye jayenge, par aapke students safe rahenge.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                disabled={clearingAll}
                className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                disabled={clearingAll}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {clearingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clear All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
