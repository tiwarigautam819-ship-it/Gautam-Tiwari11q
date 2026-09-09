import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Percent,
  Calendar,
  ClipboardList,
  History,
  GraduationCap,
  BarChart3,
  ChevronDown,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { CollegeEmblem } from '../components/CollegeEmblem';
import { ScreenType, Student, AttendanceStatus } from '../types';
import { getStudents } from '../services/studentService';
import {
  getAttendanceForDate,
  formatFullDayDate,
  toDateString,
} from '../services/attendanceService';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenType) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  selectedDate,
  onSelectDate,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const studentList = await getStudents();
      setStudents(studentList);

      const att = await getAttendanceForDate(selectedDate);
      setAttendanceMap(att);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to fetch live records from Firestore.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Dynamic statistics strictly calculated from real Firestore data
  const totalStudents = students.filter((s) => s.active).length;
  let presentCount = 0;
  let absentCount = 0;

  // Only count attendance for active students
  students.forEach((student) => {
    if (student.active) {
      const status = attendanceMap[student.id];
      if (status === 'Present') presentCount++;
      else if (status === 'Absent') absentCount++;
    }
  });

  const markedTotal = presentCount + absentCount;
  const attendancePercentage =
    markedTotal > 0
      ? Math.round((presentCount / markedTotal) * 1000) / 10
      : totalStudents > 0 && presentCount > 0
      ? Math.round((presentCount / totalStudents) * 1000) / 10
      : 0;

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* College Info Card Matching Screenshot 2 */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center space-x-3 sm:space-x-4">
        <CollegeEmblem size="md" className="w-12 h-12 sm:w-14 sm:h-14 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug truncate">
            Sobhasaria Group of Institutions, Sikar
          </h2>
          <p className="text-xs sm:text-sm text-blue-700 font-medium truncate mt-0.5">
            B.Tech – Computer Science & Engineering
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              Section: A
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Batch: B.Tech CSE
            </span>
          </div>
        </div>
      </div>

      {/* Date Selector Pill */}
      <div className="relative">
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5 text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs sm:text-sm font-semibold">
              {formatFullDayDate(selectedDate)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              id="dashboard-date-input"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 focus:outline-hidden cursor-pointer"
            />
            <button
              onClick={loadData}
              title="Refresh Firestore Data"
              className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards in 2x2 Grid Matching Screenshot 2 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100 flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium truncate">
              Total Students
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : totalStudents}
            </p>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium truncate">
              Present Today
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : presentCount}
            </p>
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-rose-50/60 rounded-2xl p-4 border border-rose-100 flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium truncate">
              Absent Today
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : absentCount}
            </p>
          </div>
        </div>

        {/* Attendance % */}
        <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-100 flex items-center space-x-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium truncate">
              Attendance %
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {loading ? '...' : `${attendancePercentage}%`}
            </p>
          </div>
        </div>
      </div>

      {/* 4 Action Cards in 2x2 Grid Matching Screenshot 2 Colors & Icons */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
        {/* Mark Attendance (Deep Blue) */}
        <button
          id="dashboard-mark-attendance-btn"
          onClick={() => onNavigate('mark-attendance')}
          className="bg-blue-900 hover:bg-blue-950 active:bg-blue-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-md hover:shadow-lg transition-all duration-150 group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            Mark Attendance
          </span>
        </button>

        {/* Attendance History (Teal / Cyan) */}
        <button
          id="dashboard-attendance-history-btn"
          onClick={() => onNavigate('history')}
          className="bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-md hover:shadow-lg transition-all duration-150 group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <History className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            Attendance History
          </span>
        </button>

        {/* Student Management (Indigo / Purple) */}
        <button
          id="dashboard-student-management-btn"
          onClick={() => onNavigate('students')}
          className="bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-md hover:shadow-lg transition-all duration-150 group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            Student Management
          </span>
        </button>

        {/* Weekly Report (Amber / Golden Orange) */}
        <button
          id="dashboard-weekly-report-btn"
          onClick={() => onNavigate('weekly-report')}
          className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-md hover:shadow-lg transition-all duration-150 group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            Weekly Report
          </span>
        </button>
      </div>

      {/* Empty State / Prompt if no students yet */}
      {!loading && totalStudents === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center mt-4">
          <p className="text-sm font-bold text-amber-900">No students added yet</p>
          <p className="text-xs text-amber-700 mt-1">
            Section A currently has 0 students in Cloud Firestore. Add students manually or import a student list CSV.
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => onNavigate('students')}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Student
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
