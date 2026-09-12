import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Student } from '../types';
import {
  getAllAttendanceDates,
  getAttendanceForDate,
  getAttendanceForDateRange,
  toDateString,
  formatDisplayDate,
} from '../services/attendanceService';
import {
  exportDayWiseCSV,
  exportWeeklyCSV,
  exportMasterAttendanceCSV,
} from '../utils/csvExport';

interface ExportAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  defaultDate?: string;
}

type ExportMode = 'weekly' | 'daywise' | 'master';

export const ExportAttendanceModal: React.FC<ExportAttendanceModalProps> = ({
  isOpen,
  onClose,
  students,
  defaultDate,
}) => {
  const [mode, setMode] = useState<ExportMode>('weekly');
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    return defaultDate || toDateString(new Date());
  });

  // For weekly: Monday of the week
  const [weekMonday, setWeekMonday] = useState<string>(() => {
    const today = defaultDate ? new Date(defaultDate) : new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    return toDateString(monday);
  });

  const [exporting, setExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (defaultDate) {
      setSelectedDay(defaultDate);
      const d = new Date(defaultDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      setWeekMonday(toDateString(monday));
    }
  }, [defaultDate]);

  if (!isOpen) return null;

  // Build the 6 days of the week (Monday to Saturday)
  const getDaysOfWeek = (mondayStr: string) => {
    const [y, m, d] = mondayStr.split('-').map(Number);
    const monday = new Date(y, m - 1, d);

    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayLabels.map((name, index) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + index);
      const dateStr = toDateString(dt);
      const display = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      return { name, display, dateStr };
    });
  };

  const handleExport = async () => {
    if (students.length === 0) {
      alert('No students found to export. Please ensure Section A has student records.');
      return;
    }

    setExporting(true);
    setSuccessMessage(null);
    setDownloadUrl(null);

    try {
      let exportResult: { downloadUrl?: string; success: boolean } | undefined;

      if (mode === 'daywise') {
        const attendance = await getAttendanceForDate(selectedDay);
        exportResult = await exportDayWiseCSV(selectedDay, students, attendance);
        setSuccessMessage(`Day-wise attendance for ${formatDisplayDate(selectedDay)} prepared in Excel CSV!`);
      } else if (mode === 'weekly') {
        const days = getDaysOfWeek(weekMonday);
        const dateStrings = days.map((d) => d.dateStr);
        const attendanceRange = await getAttendanceForDateRange(dateStrings);
        exportResult = await exportWeeklyCSV(weekMonday, days, students, attendanceRange);
        setSuccessMessage(`Weekly report (Mon–Sat) starting ${formatDisplayDate(weekMonday)} prepared in Excel CSV!`);
      } else if (mode === 'master') {
        const allDates = await getAllAttendanceDates();
        const attendanceRange = await getAttendanceForDateRange(allDates);
        exportResult = await exportMasterAttendanceCSV(students, allDates, attendanceRange);
        setSuccessMessage(`Master attendance sheet for all ${allDates.length} recorded dates prepared in Excel CSV!`);
      }

      if (exportResult?.downloadUrl) {
        setDownloadUrl(exportResult.downloadUrl);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Export Attendance to Excel (.CSV)
              </h2>
              <p className="text-xs text-slate-500">
                Microsoft Excel Compatible • UTF-8 Formatted
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Tag */}
        <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
          <Sparkles className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Microsoft Excel Ready:</span> Includes full student records (Roll Number, Full Name, Father's Name, Mobile Number) formatted with UTF-8 BOM so Excel opens cleanly without encoding errors.
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mt-5">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Select Export Type:
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('weekly');
                setSuccessMessage(null);
                setDownloadUrl(null);
              }}
              className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'weekly'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly (6 Days)
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('daywise');
                setSuccessMessage(null);
                setDownloadUrl(null);
              }}
              className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'daywise'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day-Wise
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('master');
                setSuccessMessage(null);
                setDownloadUrl(null);
              }}
              className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'master'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Master All-Time
            </button>
          </div>
        </div>

        {/* Configuration for Selected Mode */}
        <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          {mode === 'weekly' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Select Week (Starts on Monday):
                </span>
                <span className="text-[11px] text-blue-700 font-semibold">
                  Monday to Saturday (6 Days)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <input
                  type="date"
                  value={weekMonday}
                  onChange={(e) => {
                    if (e.target.value) {
                      const d = new Date(e.target.value);
                      const day = d.getDay();
                      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                      const monday = new Date(d);
                      monday.setDate(diff);
                      setWeekMonday(toDateString(monday));
                    }
                  }}
                  className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Exports columns: Roll No, Name, Father's Name, Mobile, Mon, Tue, Wed, Thu, Fri, Sat, Total Present, Total Days, and %.
              </p>
            </div>
          )}

          {mode === 'daywise' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Select Specific Date:
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold">
                  Single Day Attendance
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Exports columns: Roll No, Name, Father's Name, Mobile, Date, and Attendance Status (Present/Absent).
              </p>
            </div>
          )}

          {mode === 'master' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Cumulative Attendance Master Report</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculates aggregate attendance for every registered student in Section A across all dates recorded in Cloud Firestore.
              </p>
              <div className="text-[11px] text-slate-500 font-medium">
                Total Registered Students: <strong className="text-blue-900">{students.length}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2.5 text-xs text-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            {downloadUrl && (
              <div className="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-[11px] text-emerald-800 font-medium">
                  File downloaded automatically!
                </span>
                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Again</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            id="modal-download-excel-csv-btn"
            type="button"
            disabled={exporting}
            onClick={handleExport}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                <span>Generating Excel CSV...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Excel CSV</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
