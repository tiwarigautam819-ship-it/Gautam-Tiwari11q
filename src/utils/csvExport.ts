import { Student, AttendanceStatus } from '../types';
import ExcelJS from 'exceljs';
import {
  exportDayWiseExcel,
  exportWeeklyExcel,
  exportMasterAttendanceExcel,
  generateDayWiseWorkbook,
  generateWeeklyWorkbook,
  generateMasterWorkbook,
  generateDayWiseExcelBuffer,
  saveAndDownloadExcel,
  showDownloadSuccessToast,
} from './excelExport';

export {
  exportDayWiseExcel,
  exportWeeklyExcel,
  exportMasterAttendanceExcel,
  generateDayWiseWorkbook,
  generateWeeklyWorkbook,
  generateMasterWorkbook,
  generateDayWiseExcelBuffer,
  saveAndDownloadExcel,
  showDownloadSuccessToast,
};

/**
 * Checks if running on a mobile device or within an Android APK WebView
 */
export function isMobileOrWebView(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isCustomScheme = window.location.protocol === 'file:' || window.location.protocol === 'capacitor:';
  const hasAppWrapper = Boolean((window as any).Capacitor || (window as any).cordova);
  return isMobileUA || isCustomScheme || hasAppWrapper;
}

/**
 * Downloads data as a professional Microsoft Excel (.xlsx) file.
 * Automatically styles the header row with SGI Royal Blue, auto-fits all column widths
 * according to content, freezes the header row, and saves directly to the Android Download folder
 * (on APK) or triggers browser download (on website).
 */
export async function downloadExcelCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<{ downloadUrl?: string; success: boolean }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sobhasaria Group of Institutions';
  workbook.lastModifiedBy = 'SGI Attendance System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Attendance Report', {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }],
  });

  // 1. Table Headers
  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // SGI Navy Blue
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx === 1 || idx === 2 ? 'left' : 'center',
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // 2. Data Rows
  rows.forEach((rowValues, rIdx) => {
    const row = worksheet.getRow(rIdx + 2);
    row.height = 22;
    rowValues.forEach((val, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = val;
      cell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: cIdx === 1,
        color: { argb: 'FF0F172A' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: cIdx === 1 || cIdx === 2 ? 'left' : 'center',
      };

      const valStr = String(val);
      if (valStr.includes('Present') || valStr === 'P') {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      } else if (valStr.includes('Absent') || valStr === 'A') {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // 3. Auto-fit column widths
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value;
      const text = val !== null && val !== undefined ? String(val) : '';
      if (text.length > maxLen) {
        maxLen = text.length;
      }
    });
    column.width = Math.min(Math.max(maxLen + 4, 12), 42);
  });

  const baseName = filename.replace(/\.(csv|xlsx)$/i, '');
  const xlsxFilename = `${baseName}.xlsx`;

  const saveRes = await saveAndDownloadExcel(workbook, xlsxFilename);
  return {
    success: saveRes.success,
    downloadUrl: saveRes.filePath,
  };
}

/**
 * Generates formatted CSV string for Day-Wise Attendance (kept for backward compatibility & raw text exports).
 */
export function generateDayWiseCSVContent(
  dateStr: string,
  students: Student[],
  attendance: Record<string, AttendanceStatus>
): string {
  const headers = [
    'Roll Number',
    'Student Name',
    "Father's Name",
    'Mobile Number',
    'Date',
    'Attendance Status',
  ];

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

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

  return [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');
}

/**
 * Exports Day-Wise Attendance into a professional Excel (.xlsx) file.
 * Filename format: Attendance_YYYY-MM-DD.xlsx
 * Auto-fits columns, freezes headers, formats Present/Absent, and saves to Android Download folder.
 */
export async function exportDayWiseCSV(
  dateStr: string,
  students: Student[],
  attendance: Record<string, AttendanceStatus>
): Promise<{ downloadUrl?: string; success: boolean }> {
  const res = await exportDayWiseExcel(dateStr, students, attendance);
  return {
    success: res.success,
    downloadUrl: res.filePath,
  };
}

/**
 * Exports Weekly Attendance (Monday to Saturday 6 days) into a professional Excel (.xlsx) file.
 * Filename format: Attendance_Weekly_YYYY-MM-DD_to_YYYY-MM-DD.xlsx
 * Auto-fits columns, freezes headers, formats Present/Absent, and saves to Android Download folder.
 */
export async function exportWeeklyCSV(
  weekStartDate: string,
  daysOfWeek: Array<{ name: string; display: string; dateStr: string }>,
  students: Student[],
  attendanceMap: Record<string, Record<string, AttendanceStatus>>
): Promise<{ downloadUrl?: string; success: boolean }> {
  const res = await exportWeeklyExcel(weekStartDate, daysOfWeek, students, attendanceMap);
  return {
    success: res.success,
    downloadUrl: res.filePath,
  };
}

/**
 * Exports Master Student Sheet with overall attendance statistics into professional Excel (.xlsx).
 * Filename format: Attendance_Master_Report_AllDays.xlsx
 */
export async function exportMasterAttendanceCSV(
  students: Student[],
  allDates: string[],
  allAttendance: Record<string, Record<string, AttendanceStatus>>
): Promise<{ downloadUrl?: string; success: boolean }> {
  const res = await exportMasterAttendanceExcel(students, allDates, allAttendance);
  return {
    success: res.success,
    downloadUrl: res.filePath,
  };
}
