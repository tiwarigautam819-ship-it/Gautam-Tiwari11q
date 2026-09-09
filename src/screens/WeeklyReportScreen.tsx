import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Printer,
  FileDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Download,
} from 'lucide-react';
import { Student, AttendanceStatus, WeeklyReportRow } from '../types';
import { getStudents } from '../services/studentService';
import {
  getAttendanceForDateRange,
  toDateString,
  formatDisplayDate,
} from '../services/attendanceService';

interface WeeklyReportScreenProps {
  onBack: () => void;
}

export const WeeklyReportScreen: React.FC<WeeklyReportScreenProps> = ({ onBack }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStartDate, setWeekStartDate] = useState<string>(() => {
    // Default to the Monday of the current week (or reference week)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    const monday = new Date(now.setDate(diff));
    return toDateString(monday);
  });

  const [weeklyData, setWeeklyData] = useState<WeeklyReportRow[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<Array<{ name: string; dateStr: string; display: string }>>([]);

  // Calculate Monday to Friday dates based on weekStartDate
  const computeWeekDays = (startStr: string) => {
    const [y, m, d] = startStr.split('-').map(Number);
    const start = new Date(y, m - 1, d);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days.map((dayName, idx) => {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + idx);
      return {
        name: dayName,
        dateStr: toDateString(dayDate),
        display: `${dayDate.getDate()} ${dayDate.toLocaleDateString('en-GB', { month: 'short' })}`,
      };
    });
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const studentList = await getStudents();
      const active = studentList.filter((s) => s.active);
      setStudents(active);

      const days = computeWeekDays(weekStartDate);
      setDaysOfWeek(days);

      const dateStrings = days.map((d) => d.dateStr);
      const attendanceMatrix = await getAttendanceForDateRange(dateStrings);

      const rows: WeeklyReportRow[] = active.map((st) => {
        const statuses: Record<string, AttendanceStatus | 'Unmarked'> = {};
        let present = 0;
        let countedDays = 0;

        dateStrings.forEach((dStr) => {
          const status = attendanceMatrix[dStr]?.[st.id];
          if (status === 'Present') {
            statuses[dStr] = 'Present';
            present++;
            countedDays++;
          } else if (status === 'Absent') {
            statuses[dStr] = 'Absent';
            countedDays++;
          } else {
            statuses[dStr] = 'Unmarked';
          }
        });

        const pct = countedDays > 0 ? Math.round((present / countedDays) * 100) : 0;

        return {
          student: st,
          dayStatuses: statuses,
          totalPresent: present,
          totalDays: 5,
          percentage: pct,
        };
      });

      setWeeklyData(rows);
    } catch (err) {
      console.error('Failed to load weekly report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [weekStartDate]);

  const weekEndDate = daysOfWeek.length > 0 ? daysOfWeek[4].dateStr : '';

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    if (weeklyData.length === 0) return;

    const headers = ['Roll No', 'Student Name', 'Enrollment', ...daysOfWeek.map((d) => `${d.name} (${d.display})`), 'Total Present', 'Total Days', 'Attendance %'];
    const rows = weeklyData.map((row) => [
      row.student.rollNumber,
      `"${row.student.name}"`,
      row.student.enrollmentNumber,
      ...daysOfWeek.map((d) => {
        const s = row.dayStatuses[d.dateStr];
        return s === 'Present' ? 'P' : s === 'Absent' ? 'A' : '-';
      }),
      row.totalPresent,
      row.totalDays,
      `${row.percentage}%`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SGI_Attendance_SectionA_Week_${weekStartDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-28 max-w-5xl mx-auto">
      {/* Header Matching Screenshot 7 */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-3">
          <button
            id="weekly-report-back-btn"
            onClick={onBack}
            className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Weekly Report
          </h1>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={exportCSV}
            title="Download CSV"
            className="p-2 text-slate-600 hover:text-blue-700 rounded-lg hover:bg-slate-100"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={loadReport}
            title="Reload"
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date Range Selector Matching Screenshot 7 */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 text-slate-700">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-slate-900">
            {daysOfWeek.length > 0
              ? `${daysOfWeek[0].display} – ${daysOfWeek[4].display}`
              : 'Weekly Range'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Select Week (Mon):</span>
          <input
            id="weekly-report-start-date"
            type="date"
            value={weekStartDate}
            onChange={(e) => {
              if (e.target.value) setWeekStartDate(e.target.value);
            }}
            className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg focus:outline-hidden cursor-pointer"
          />
        </div>
      </div>

      {/* Printable Header Details (Visible when printing) */}
      <div className="hidden print:block p-4 border-b border-slate-300 text-center mb-4">
        <h2 className="text-xl font-black text-slate-900">
          Sobhasaria Group of Institutions, Sikar
        </h2>
        <p className="text-sm font-bold text-slate-700">
          Department of Computer Science & Engineering — Section A
        </p>
        <p className="text-xs text-slate-600 mt-1">
          Weekly Attendance Register: {daysOfWeek.length > 0 ? `${daysOfWeek[0].display} to ${daysOfWeek[4].display}` : ''}
        </p>
      </div>

      {/* Weekly Matrix Table Matching Screenshot 7 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Compiling weekly records from Firestore...
          </div>
        ) : weeklyData.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs sm:text-sm">
            <p className="font-semibold text-slate-700">No student records found in Section A.</p>
            <p className="text-slate-400 mt-1">
              Add students in Student Management to generate reports.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[580px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-14">Roll No.</th>
                  <th className="py-3 px-3">Name</th>
                  {daysOfWeek.map((d) => (
                    <th key={d.name} className="py-3 px-2 text-center w-12">
                      <div>{d.name}</div>
                      <div className="text-[9px] text-slate-400 font-normal">
                        {d.display.split(' ')[0]}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-16">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {weeklyData.map((row) => (
                  <tr key={row.student.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Roll No */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {row.student.rollNumber}
                    </td>

                    {/* Name */}
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div className="truncate max-w-[150px] sm:max-w-xs">
                        {row.student.name}
                      </div>
                    </td>

                    {/* Mon, Tue, Wed, Thu, Fri Badges matching screenshot 7 */}
                    {daysOfWeek.map((d) => {
                      const status = row.dayStatuses[d.dateStr];
                      return (
                        <td key={d.name} className="py-3 px-2 text-center">
                          {status === 'Present' ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs shadow-2xs">
                              P
                            </span>
                          ) : status === 'Absent' ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-700 font-bold text-xs shadow-2xs">
                              A
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 text-slate-300 font-mono">
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {row.totalPresent}/{row.totalDays}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend Matching Screenshot 7 */}
      <div className="flex items-center justify-center space-x-6 py-2 text-xs font-semibold text-slate-700">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">
            P
          </span>
          <span>= Present</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px]">
            A
          </span>
          <span>= Absent</span>
        </div>
      </div>

      {/* Print / Export Button Matching Screenshot 7 */}
      <div className="pt-2 print:hidden">
        <button
          id="export-print-btn"
          type="button"
          onClick={handlePrint}
          className="w-full py-3.5 px-6 rounded-2xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Export / Print</span>
        </button>
      </div>
    </div>
  );
};
