import ExcelJS from 'exceljs';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Student, AttendanceStatus } from '../types';

/**
 * Calculates auto-fit width for all columns in a worksheet based on cell content.
 * Prevents text from being cut off while avoiding huge empty columns.
 */
function autoFitColumns(worksheet: ExcelJS.Worksheet, minWidth = 12, maxWidth = 42) {
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      // Skip merged institutional banner rows (rows 1-4)
      if (Number(cell.row) <= 4) return;
      const val = cell.value;
      let text = '';
      if (val !== null && val !== undefined) {
        if (typeof val === 'object') {
          if ('richText' in val) {
            text = (val as any).richText.map((r: any) => r.text).join('');
          } else if ('text' in val) {
            text = String((val as any).text);
          } else {
            text = String(val);
          }
        } else {
          text = String(val);
        }
      }
      if (text.length > maxLen) {
        maxLen = text.length;
      }
    });
    // Add 4 characters padding for spacing and readability
    column.width = Math.min(Math.max(maxLen + 4, minWidth), maxWidth);
  });
}

/**
 * Converts a Uint8Array buffer to a Base64 string safely
 */
function uint8ArrayToBase64(uint8: Uint8Array): string {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

/**
 * Displays a non-intrusive floating toast notifying the user that the Excel file was saved
 */
export function showDownloadSuccessToast(filename: string, isAndroidDevice: boolean): void {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('sgi-excel-download-toast');
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'sgi-excel-download-toast';
  toast.setAttribute(
    'style',
    'position:fixed;bottom:24px;left:16px;right:16px;z-index:99999;max-width:440px;margin:0 auto;'
  );
  toast.innerHTML = `
    <div style="background:#0f172a;color:#ffffff;border-radius:18px;padding:14px 18px;box-shadow:0 14px 34px -4px rgba(0,0,0,0.55);border:1px solid #334155;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="min-width:0;flex:1;">
        <div style="font-size:13px;font-weight:700;color:#38bdf8;display:flex;align-items:center;gap:6px;">
          <span>📊 Excel Report Downloaded</span>
        </div>
        <div style="font-size:11px;color:#e2e8f0;margin-top:2px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${filename}
        </div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px;">
          ${isAndroidDevice ? '✓ Saved to your phone’s Download folder (Files app)' : '✓ Saved to your device Download folder'}
        </div>
      </div>
      <button 
        type="button" 
        id="sgi-close-excel-toast-btn"
        style="background:#1e293b;border:1px solid #475569;color:#cbd5e1;font-size:12px;font-weight:600;border-radius:8px;padding:6px 10px;cursor:pointer;"
      >
        Dismiss
      </button>
    </div>
  `;

  document.body.appendChild(toast);

  const closeBtn = toast.querySelector('#sgi-close-excel-toast-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });
  }

  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.remove();
    }
  }, 10000);
}

/**
 * Saves an Excel workbook to the user's device:
 * - On Android APK: Writes directly to the Android public "Download" directory using Capacitor Filesystem.
 * - On Website / Desktop: Triggers native browser download via Blob URL.
 */
export async function saveAndDownloadExcel(
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<{ success: boolean; filePath?: string; message?: string }> {
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const uint8 = new Uint8Array(buffer);
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const isNative = Capacitor.isNativePlatform();

    // 1. Android Native APK Environment
    if (isNative) {
      const base64Data = uint8ArrayToBase64(uint8);
      try {
        const res = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });

        showDownloadSuccessToast(filename, true);

        // Also offer native share sheet on mobile if supported
        if (typeof navigator !== 'undefined' && (navigator as any).canShare) {
          try {
            const file = new File([uint8], filename, { type: mimeType });
            if ((navigator as any).canShare({ files: [file] })) {
              (navigator as any).share({
                files: [file],
                title: filename,
                text: `SGI Attendance Sheet: ${filename}`,
              }).catch(() => {});
            }
          } catch {}
        }

        return {
          success: true,
          filePath: res.uri,
          message: `Saved to Documents folder (${filename})`,
        };
      } catch (downloadErr) {
        console.warn('Documents directory write notice, attempting fallback to External directory:', downloadErr);
        try {
          const resExt = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.External,
            recursive: true,
          });
          showDownloadSuccessToast(filename, true);
          return {
            success: true,
            filePath: resExt.uri,
            message: `Saved to External storage (${filename})`,
          };
        } catch (extErr) {
          console.error('Filesystem write error:', extErr);
        }
      }
    }

    // 2. Standard Web Browser Environment
    if (typeof document !== 'undefined') {
      const blob = new Blob([uint8], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showDownloadSuccessToast(filename, false);

      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }, 60000);

      return { success: true, filePath: url };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to generate or save Excel file:', err);
    return { success: false, message: err?.message || 'Download failed' };
  }
}

/**
 * Generates a clean, professional Day-Wise Attendance Excel Workbook
 */
export async function generateDayWiseWorkbook(
  dateStr: string,
  students: Student[],
  attendance: Record<string, AttendanceStatus>
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sobhasaria Group of Institutions';
  workbook.lastModifiedBy = 'SGI Attendance System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Daily Attendance', {
    views: [{ state: 'frozen', ySplit: 5, xSplit: 0 }],
  });

  const sortedStudents = [...students].sort((a, b) =>
    a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
  );

  let presentCount = 0;
  let absentCount = 0;
  sortedStudents.forEach((st) => {
    const status = attendance[st.id] || 'Not Marked';
    if (status === 'Present') presentCount++;
    else if (status === 'Absent') absentCount++;
  });

  const totalCount = sortedStudents.length;

  // 1. Institution Banner (Row 1)
  worksheet.mergeCells('A1:F1');
  const titleRow = worksheet.getRow(1);
  titleRow.height = 28;
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'SOBHASARIA GROUP OF INSTITUTIONS, SIKAR';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 2. Department & Class Subtitle (Row 2)
  worksheet.mergeCells('A2:F2');
  const subRow = worksheet.getRow(2);
  subRow.height = 20;
  const subCell = worksheet.getCell('A2');
  subCell.value = 'Department of Computer Science & Engineering • Section A';
  subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF334155' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 3. Date & Statistics Summary (Row 3)
  worksheet.mergeCells('A3:F3');
  const statsRow = worksheet.getRow(3);
  statsRow.height = 20;
  const statsCell = worksheet.getCell('A3');
  statsCell.value = `Daily Attendance Sheet • Date: ${dateStr}   |   Total: ${totalCount}   |   Present: ${presentCount}   |   Absent: ${absentCount}`;
  statsCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  statsCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 4. Spacer (Row 4)
  worksheet.getRow(4).height = 8;

  // 5. Table Headers (Row 5)
  const headers = [
    'Roll Number',
    'Student Name',
    "Father's Name",
    'Mobile Number',
    'Date',
    'Attendance Status',
  ];
  const headerRow = worksheet.getRow(5);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Royal Blue
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

  // 6. Data Rows (Rows 6+)
  sortedStudents.forEach((st, idx) => {
    const rowNum = 6 + idx;
    const row = worksheet.getRow(rowNum);
    row.height = 22;

    const status = attendance[st.id] || 'Not Marked';

    const rowValues = [
      st.rollNumber,
      st.name,
      st.fatherName || '—',
      st.mobileNumber || '—',
      dateStr,
      status,
    ];

    rowValues.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: colIdx === 1, // Student name bold
        color: { argb: 'FF0F172A' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIdx === 1 || colIdx === 2 ? 'left' : 'center',
      };

      // Status column highlight
      if (colIdx === 5) {
        if (status === 'Present') {
          cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF15803D' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDCFCE7' }, // Soft green
          };
        } else if (status === 'Absent') {
          cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFB91C1C' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' }, // Soft red
          };
        } else {
          cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF64748B' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // 7. Footer Summary
  const summaryRowNum = 6 + sortedStudents.length;
  worksheet.mergeCells(`A${summaryRowNum}:F${summaryRowNum}`);
  const summaryRow = worksheet.getRow(summaryRowNum);
  summaryRow.height = 24;
  const summaryCell = worksheet.getCell(`A${summaryRowNum}`);
  const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  summaryCell.value = `ATTENDANCE SUMMARY: Total Students: ${totalCount}   |   Present: ${presentCount}   |   Absent: ${absentCount}   |   Turnout: ${rate}%`;
  summaryCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
  summaryCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  summaryCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summaryCell.border = {
    top: { style: 'medium', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
  };

  // Auto-fit column widths based on content
  autoFitColumns(worksheet);

  return workbook;
}

/**
 * Generates a Day-Wise Excel binary buffer & base64 string for background Drive backup
 */
export async function generateDayWiseExcelBuffer(
  dateStr: string,
  students: Student[],
  attendance: Record<string, AttendanceStatus>
): Promise<{ buffer: Uint8Array; base64: string }> {
  const wb = await generateDayWiseWorkbook(dateStr, students, attendance);
  const buf = await wb.xlsx.writeBuffer();
  const uint8 = new Uint8Array(buf);
  return { buffer: uint8, base64: uint8ArrayToBase64(uint8) };
}

/**
 * Generates a clean, professional Weekly Attendance Excel Workbook (Monday to Saturday)
 */
export async function generateWeeklyWorkbook(
  weekStartDate: string,
  daysOfWeek: Array<{ name: string; display: string; dateStr: string }>,
  students: Student[],
  attendanceMap: Record<string, Record<string, AttendanceStatus>>
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sobhasaria Group of Institutions';
  workbook.lastModifiedBy = 'SGI Attendance System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Weekly Report', {
    views: [{ state: 'frozen', ySplit: 5, xSplit: 0 }],
  });

  const sortedStudents = [...students].sort((a, b) =>
    a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
  );

  const totalDays = daysOfWeek.length;
  const weekEndDate = daysOfWeek.length > 0 ? daysOfWeek[daysOfWeek.length - 1].dateStr : weekStartDate;
  const totalCols = 4 + totalDays + 3; // Roll, Name, Father, Mobile + Days + Present, Total, %
  const lastColLetter = String.fromCharCode(65 + totalCols - 1);

  // 1. Institution Banner (Row 1)
  worksheet.mergeCells(`A1:${lastColLetter}1`);
  const titleRow = worksheet.getRow(1);
  titleRow.height = 28;
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'SOBHASARIA GROUP OF INSTITUTIONS, SIKAR';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 2. Department & Class Subtitle (Row 2)
  worksheet.mergeCells(`A2:${lastColLetter}2`);
  const subRow = worksheet.getRow(2);
  subRow.height = 20;
  const subCell = worksheet.getCell('A2');
  subCell.value = 'Department of Computer Science & Engineering • Section A';
  subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF334155' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 3. Weekly Date Range (Row 3)
  worksheet.mergeCells(`A3:${lastColLetter}3`);
  const statsRow = worksheet.getRow(3);
  statsRow.height = 20;
  const statsCell = worksheet.getCell('A3');
  statsCell.value = `Weekly Attendance Report: ${weekStartDate} to ${weekEndDate} (Monday to Saturday)   |   Total Students: ${sortedStudents.length}`;
  statsCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  statsCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 4. Spacer (Row 4)
  worksheet.getRow(4).height = 8;

  // 5. Table Headers (Row 5)
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

  const headerRow = worksheet.getRow(5);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
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

  // 6. Data Rows
  sortedStudents.forEach((st, idx) => {
    const rowNum = 6 + idx;
    const row = worksheet.getRow(rowNum);
    row.height = 22;

    let presentCount = 0;
    const dayCells: { val: string; status: AttendanceStatus | 'Not Marked' }[] = daysOfWeek.map((d) => {
      const dayData = attendanceMap[d.dateStr] || {};
      const status = dayData[st.id];
      if (status === 'Present') {
        presentCount++;
        return { val: 'Present', status: 'Present' };
      }
      if (status === 'Absent') {
        return { val: 'Absent', status: 'Absent' };
      }
      return { val: '—', status: 'Not Marked' };
    });

    const pct = totalDays > 0 ? Math.round((presentCount / totalDays) * 1000) / 10 : 0;

    const rowValues = [
      st.rollNumber,
      st.name,
      st.fatherName || '—',
      st.mobileNumber || '—',
      ...dayCells.map((dc) => dc.val),
      presentCount,
      totalDays,
      `${pct}%`,
    ];

    rowValues.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: colIdx === 1 || colIdx >= totalCols - 3,
        color: { argb: 'FF0F172A' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIdx === 1 || colIdx === 2 ? 'left' : 'center',
      };

      // Day status cells highlight
      if (colIdx >= 4 && colIdx < 4 + totalDays) {
        const dayIdx = colIdx - 4;
        const status = dayCells[dayIdx].status;
        if (status === 'Present') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        } else if (status === 'Absent') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        }
      }

      // Percentage highlight
      if (colIdx === totalCols - 1) {
        if (pct >= 75) {
          cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF15803D' } };
        } else {
          cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFB45309' } };
        }
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Auto-fit column widths
  autoFitColumns(worksheet);

  return workbook;
}

/**
 * Generates a clean, professional Master Cumulative Attendance Excel Workbook
 */
export async function generateMasterWorkbook(
  students: Student[],
  allDates: string[],
  allAttendance: Record<string, Record<string, AttendanceStatus>>
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sobhasaria Group of Institutions';
  workbook.lastModifiedBy = 'SGI Attendance System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Master Report', {
    views: [{ state: 'frozen', ySplit: 5, xSplit: 0 }],
  });

  const sortedStudents = [...students].sort((a, b) =>
    a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
  );

  const totalDates = allDates.length;

  // 1. Banner (Row 1)
  worksheet.mergeCells('A1:H1');
  const titleRow = worksheet.getRow(1);
  titleRow.height = 28;
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'SOBHASARIA GROUP OF INSTITUTIONS, SIKAR';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 2. Subtitle (Row 2)
  worksheet.mergeCells('A2:H2');
  const subRow = worksheet.getRow(2);
  subRow.height = 20;
  const subCell = worksheet.getCell('A2');
  subCell.value = 'Department of Computer Science & Engineering • Section A';
  subCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF334155' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 3. Stats (Row 3)
  worksheet.mergeCells('A3:H3');
  const statsRow = worksheet.getRow(3);
  statsRow.height = 20;
  const statsCell = worksheet.getCell('A3');
  statsCell.value = `Cumulative Master Attendance Sheet • Total Recorded Sessions: ${totalDates} Classes   |   Total Students: ${sortedStudents.length}`;
  statsCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  statsCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 4. Spacer (Row 4)
  worksheet.getRow(4).height = 8;

  // 5. Table Headers (Row 5)
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

  const headerRow = worksheet.getRow(5);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
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

  // 6. Data Rows
  sortedStudents.forEach((st, idx) => {
    const rowNum = 6 + idx;
    const row = worksheet.getRow(rowNum);
    row.height = 22;

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

    const rowValues = [
      st.rollNumber,
      st.name,
      st.fatherName || '—',
      st.mobileNumber || '—',
      totalDates,
      attended,
      absent,
      `${pct}%`,
    ];

    rowValues.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: colIdx === 1 || colIdx === 7,
        color: { argb: 'FF0F172A' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIdx === 1 || colIdx === 2 ? 'left' : 'center',
      };

      if (colIdx === 7) {
        if (pct >= 75) {
          cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF15803D' } };
        } else {
          cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFB45309' } };
        }
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  autoFitColumns(worksheet);

  return workbook;
}

/**
 * Public exports: Day-Wise, Weekly, Master
 * Filenames adhere strictly to requirements:
 * Daily: Attendance_YYYY-MM-DD.xlsx
 * Weekly: Attendance_Weekly_YYYY-MM-DD_to_YYYY-MM-DD.xlsx
 */
export async function exportDayWiseExcel(
  dateStr: string,
  students: Student[],
  attendance: Record<string, AttendanceStatus>
): Promise<{ success: boolean; filePath?: string }> {
  const workbook = await generateDayWiseWorkbook(dateStr, students, attendance);
  const filename = `Attendance_${dateStr}.xlsx`;
  return await saveAndDownloadExcel(workbook, filename);
}

export async function exportWeeklyExcel(
  weekStartDate: string,
  daysOfWeek: Array<{ name: string; display: string; dateStr: string }>,
  students: Student[],
  attendanceMap: Record<string, Record<string, AttendanceStatus>>
): Promise<{ success: boolean; filePath?: string }> {
  const workbook = await generateWeeklyWorkbook(weekStartDate, daysOfWeek, students, attendanceMap);
  const weekEndDate = daysOfWeek.length > 0 ? daysOfWeek[daysOfWeek.length - 1].dateStr : weekStartDate;
  const filename = `Attendance_Weekly_${weekStartDate}_to_${weekEndDate}.xlsx`;
  return await saveAndDownloadExcel(workbook, filename);
}

export async function exportMasterAttendanceExcel(
  students: Student[],
  allDates: string[],
  allAttendance: Record<string, Record<string, AttendanceStatus>>
): Promise<{ success: boolean; filePath?: string }> {
  const workbook = await generateMasterWorkbook(students, allDates, allAttendance);
  const filename = `Attendance_Master_Report_AllDays.xlsx`;
  return await saveAndDownloadExcel(workbook, filename);
}
