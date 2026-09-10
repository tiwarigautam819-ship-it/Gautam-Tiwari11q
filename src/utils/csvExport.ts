import { Student, AttendanceStatus } from '../types';

/**
 * Downloads data as a Microsoft Excel-compatible .csv file.
 * Adds UTF-8 Byte Order Mark (\uFEFF) and CRLF line breaks so Excel opens
 * special characters, accents, and student names properly without column distortion.
 */
export function downloadExcelCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  // \uFEFF is the UTF-8 BOM that signals Microsoft Excel to parse as UTF-8
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanFilename = filename.toLowerCase().endsWith('.csv')
    ? filename
    : `${filename}.csv`;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Day-Wise Attendance into an Excel-compatible CSV file.
 */
export function exportDayWiseCSV(
  dateStr: string,
  students: Student[],
  attendance: Record<string, AttendanceStatus>
): void {
  const headers = [
    'Roll Number',
    'Student Name',
    "Father's Name",
    'Mobile Number',
    'Date',
    'Attendance Status',
  ];

  const sortedStudents = [...students].sort((a, b) =>
    a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
  );

  const rows = sortedStudents.map((st) => {
    const status = attendance[st.id] || 'Not Marked';
    return [
      st.rollNumber,
      st.name,
      st.fatherName || '',
      st.mobileNumber || '',
      dateStr,
      status,
    ];
  });

  downloadExcelCSV(`SGI_Attendance_DayWise_${dateStr}.csv`, headers, rows);
}

/**
 * Exports Weekly Attendance (Monday to Saturday 6 days) into an Excel-compatible CSV file.
 */
export function exportWeeklyCSV(
  weekStartDate: string,
  daysOfWeek: Array<{ name: string; display: string; dateStr: string }>,
  students: Student[],
  attendanceMap: Record<string, Record<string, AttendanceStatus>>
): void {
  const headers = [
    'Roll Number',
    'Student Name',
    "Father's Name",
    'Mobile Number',
    ...daysOfWeek.map((d) => `${d.name} (${d.display})`),
    'Total Present',
    'Total Days',
    'Attendance %',
  ];

  const totalDays = daysOfWeek.length; // 6 days (Mon-Sat)
  const sortedStudents = [...students].sort((a, b) =>
    a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
  );

  const rows = sortedStudents.map((st) => {
    let presentCount = 0;
    const dayCols = daysOfWeek.map((d) => {
      const dayData = attendanceMap[d.dateStr] || {};
      const status = dayData[st.id];
      if (status === 'Present') {
        presentCount++;
        return 'Present (P)';
      }
      if (status === 'Absent') {
        return 'Absent (A)';
      }
      return 'Not Marked (-)';
    });

    const pct = totalDays > 0 ? Math.round((presentCount / totalDays) * 1000) / 10 : 0;

    return [
      st.rollNumber,
      st.name,
      st.fatherName || '',
      st.mobileNumber || '',
      ...dayCols,
      presentCount,
      totalDays,
      `${pct}%`,
    ];
  });

  downloadExcelCSV(
    `SGI_Attendance_Weekly_MonToSat_${weekStartDate}.csv`,
    headers,
    rows
  );
}

/**
 * Exports Master Student Sheet with overall attendance statistics into Excel-compatible CSV.
 */
export function exportMasterAttendanceCSV(
  students: Student[],
  allDates: string[],
  allAttendance: Record<string, Record<string, AttendanceStatus>>
): void {
  const headers = [
    'Roll Number',
    'Student Name',
    "Father's Name",
    'Mobile Number',
    'Total Classes Held',
    'Classes Attended',
    'Classes Absent',
    'Overall Attendance %',
  ];

  const sortedStudents = [...students].sort((a, b) =>
    a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
  );

  const totalDates = allDates.length;

  const rows = sortedStudents.map((st) => {
    let attended = 0;
    let absent = 0;

    allDates.forEach((d) => {
      const status = allAttendance[d]?.[st.id];
      if (status === 'Present') attended++;
      else if (status === 'Absent') absent++;
    });

    const totalEvaluated = attended + absent;
    const pct =
      totalEvaluated > 0
        ? Math.round((attended / totalEvaluated) * 1000) / 10
        : totalDates > 0
        ? Math.round((attended / totalDates) * 1000) / 10
        : 0;

    return [
      st.rollNumber,
      st.name,
      st.fatherName || '',
      st.mobileNumber || '',
      totalDates,
      attended,
      absent,
      `${pct}%`,
    ];
  });

  downloadExcelCSV(
    `SGI_Attendance_Master_Report_AllDays.csv`,
    headers,
    rows
  );
}
