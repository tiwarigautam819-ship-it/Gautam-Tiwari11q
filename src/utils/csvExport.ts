import { Student, AttendanceStatus } from '../types';
import { apiUrl, getAbsoluteBrowserUrl } from '../services/apiConfig';

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
 * Opens a URL in the external mobile browser (e.g. Chrome / Samsung Internet)
 */
export function openInMobileBrowser(url: string): void {
  try {
    if ((window as any).Capacitor?.Plugins?.Browser?.open) {
      (window as any).Capacitor.Plugins.Browser.open({ url });
      return;
    }
  } catch {}

  try {
    // _system instructs native Android WebView/Cordova/Capacitor to delegate URL to external native browser
    const win = window.open(url, '_system');
    if (!win) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Displays a lightweight, non-intrusive floating download notification for mobile users.
 * Uses a short direct browser link that guarantees instant download without freezing UI.
 */
export function showMobileDownloadNotification(downloadUrl: string, filename: string): void {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('sgi-mobile-download-toast');
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'sgi-mobile-download-toast';
  toast.setAttribute(
    'style',
    'position:fixed;bottom:20px;left:16px;right:16px;z-index:99999;max-width:440px;margin:0 auto;'
  );
  toast.innerHTML = `
    <div style="background:#0f172a;color:#ffffff;border-radius:16px;padding:14px 16px;box-shadow:0 12px 30px -4px rgba(0,0,0,0.5);border:1px solid #334155;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:system-ui,-apple-system,sans-serif;">
      <div style="min-width:0;flex:1;">
        <div style="font-size:13px;font-weight:700;color:#38bdf8;display:flex;align-items:center;gap:6px;">
          <span>📄 CSV Ready</span>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${filename}
        </div>
      </div>
      <a 
        href="${downloadUrl}" 
        download="${filename}"
        id="sgi-direct-browser-download-btn"
        style="background:#059669;color:#ffffff;font-size:12px;font-weight:700;padding:8px 14px;border-radius:10px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;cursor:pointer;flex-shrink:0;"
      >
        Download CSV ⬇
      </a>
      <button 
        type="button" 
        id="sgi-close-download-toast-btn"
        style="background:transparent;border:none;color:#94a3b8;font-size:18px;line-height:1;cursor:pointer;padding:4px;margin-left:-4px;"
      >
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(toast);

  const closeBtn = toast.querySelector('#sgi-close-download-toast-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });
  }

  const downloadBtn = toast.querySelector('#sgi-direct-browser-download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      setTimeout(() => toast.remove(), 2000);
    });
  }

  // Auto remove after 14 seconds
  setTimeout(() => {
    if (toast && toast.parentNode) {
      toast.remove();
    }
  }, 14000);
}

/**
 * Downloads data as a Microsoft Excel-compatible .csv file.
 * Adds UTF-8 Byte Order Mark (\uFEFF) and CRLF line breaks so Excel opens
 * special characters, accents, and student names properly without column distortion.
 *
 * For mobile / Android APK users:
 * Prepares a short, compact server link (< 80 chars) to prevent WebView crashes
 * and opens directly in the external browser (Chrome / DownloadManager).
 */
export async function downloadExcelCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<{ downloadUrl?: string; success: boolean }> {
  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const cleanFilename = filename.toLowerCase().endsWith('.csv')
    ? filename
    : `${filename}.csv`;

  const isMobile = isMobileOrWebView();
  let localBlobUrl = '';

  // 1. ALWAYS trigger client-side instant file download (Works across all browsers and WebViews natively)
  if (typeof document !== 'undefined') {
    try {
      const blob = new Blob(['\uFEFF' + csvContent], {
        type: 'text/csv;charset=utf-8;',
      });
      localBlobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = localBlobUrl;
      link.setAttribute('download', cleanFilename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // On modern mobile devices (Android / iOS / WebView), offer native share sheet if supported
      if (isMobile && typeof navigator !== 'undefined' && (navigator as any).canShare) {
        try {
          const file = new File([blob], cleanFilename, { type: 'text/csv;charset=utf-8' });
          if ((navigator as any).canShare({ files: [file] })) {
            (navigator as any).share({
              files: [file],
              title: cleanFilename,
              text: `SGI Attendance Report: ${cleanFilename}`,
            }).catch(() => {});
          }
        } catch {}
      }

      setTimeout(() => {
        try {
          if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
        } catch {}
      }, 60000);
    } catch (e) {
      console.warn('Client blob download notice:', e);
    }
  }

  // 2. Show floating mobile download bar with safe local blob URL
  if (isMobile && localBlobUrl) {
    showMobileDownloadNotification(localBlobUrl, cleanFilename);
  }

  // 3. Optional server-side sync if backend is active (non-blocking, will never fail the download)
  try {
    fetch(apiUrl('/api/export/prepare'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: cleanFilename,
        content: csvContent,
      }),
    }).catch(() => {});
  } catch {}

  return { success: true, downloadUrl: localBlobUrl };
}

/**
 * Generates formatted CSV string for Day-Wise Attendance.
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
 * Exports Day-Wise Attendance into an Excel-compatible CSV file.
 */
export function exportDayWiseCSV(
  dateStr: string,
  students: Student[],
  attendance: Record<string, AttendanceStatus>
): Promise<{ downloadUrl?: string; success: boolean }> {
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

  return downloadExcelCSV(`SGI_Attendance_DayWise_${dateStr}.csv`, headers, rows);
}

/**
 * Exports Weekly Attendance (Monday to Saturday 6 days) into an Excel-compatible CSV file.
 */
export function exportWeeklyCSV(
  weekStartDate: string,
  daysOfWeek: Array<{ name: string; display: string; dateStr: string }>,
  students: Student[],
  attendanceMap: Record<string, Record<string, AttendanceStatus>>
): Promise<{ downloadUrl?: string; success: boolean }> {
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

  return downloadExcelCSV(
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
): Promise<{ downloadUrl?: string; success: boolean }> {
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

  return downloadExcelCSV(
    `SGI_Attendance_Master_Report_AllDays.csv`,
    headers,
    rows
  );
}
