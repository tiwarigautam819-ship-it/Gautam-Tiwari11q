import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { Student } from '../types';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  existingStudents: Student[];
}

interface ParsedRow {
  rollNumber: string;
  name: string;
  enrollmentNumber: string;
  semester?: string;
  isValid: boolean;
  error?: string;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingStudents,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const existingRolls = new Set(existingStudents.map((s) => s.rollNumber.trim().toLowerCase()));
  const existingEnrolls = new Set(
    existingStudents.map((s) => s.enrollmentNumber.trim().toLowerCase())
  );

  const downloadSampleCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Roll Number,Student Name,Enrollment Number,Semester\n' +
      '01,Rahul Sharma,238TECH001,1st Semester\n' +
      '02,Aman Verma,238TECH002,1st Semester\n' +
      '03,Priya Singh,238TECH003,1st Semester\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sgi_cse_section_a_students_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setGlobalError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.onerror = () => {
      setGlobalError('Failed to read file. Please verify file format.');
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setGlobalError('CSV file must have a header row and at least one student data row.');
      return;
    }

    // Determine delimiter (comma, semicolon, or tab)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

    const headers = firstLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

    // Map column indexes
    let rollIdx = headers.findIndex((h) => h.includes('roll'));
    let nameIdx = headers.findIndex((h) => h.includes('name'));
    let enrollIdx = headers.findIndex((h) => h.includes('enroll'));
    let semIdx = headers.findIndex((h) => h.includes('sem'));

    if (rollIdx === -1 || nameIdx === -1 || enrollIdx === -1) {
      setGlobalError(
        'Required columns missing! The CSV must contain "Roll Number", "Student Name", and "Enrollment Number".'
      );
      return;
    }

    const rows: ParsedRow[] = [];
    const seenRollsInFile = new Set<string>();
    const seenEnrollsInFile = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quotes or simple split
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const rollNumber = cols[rollIdx] || '';
      const name = cols[nameIdx] || '';
      const enrollmentNumber = cols[enrollIdx] || '';
      const semester = semIdx !== -1 && cols[semIdx] ? cols[semIdx] : '1st Semester';

      let error: string | undefined = undefined;

      if (!rollNumber) {
        error = 'Missing roll number';
      } else if (!name) {
        error = 'Missing name';
      } else if (!enrollmentNumber) {
        error = 'Missing enrollment number';
      } else if (seenRollsInFile.has(rollNumber.toLowerCase())) {
        error = `Duplicate roll number in file (${rollNumber})`;
      } else if (seenEnrollsInFile.has(enrollmentNumber.toLowerCase())) {
        error = `Duplicate enrollment in file (${enrollmentNumber})`;
      } else if (existingRolls.has(rollNumber.toLowerCase())) {
        error = `Roll number "${rollNumber}" already exists in Section A`;
      } else if (existingEnrolls.has(enrollmentNumber.toLowerCase())) {
        error = `Enrollment "${enrollmentNumber}" already exists in Section A`;
      }

      seenRollsInFile.add(rollNumber.toLowerCase());
      seenEnrollsInFile.add(enrollmentNumber.toLowerCase());

      rows.push({
        rollNumber,
        name,
        enrollmentNumber,
        semester,
        isValid: !error,
        error,
      });
    }

    setParsedRows(rows);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleConfirmImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      const toImport = validRows.map((r) => ({
        rollNumber: r.rollNumber,
        name: r.name,
        enrollmentNumber: r.enrollmentNumber,
        class: 'B.Tech',
        branch: 'Computer Science & Engineering',
        semester: r.semester || '1st Semester',
        section: 'A',
        active: true,
      }));

      await onImport(toImport);
      onClose();
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to import students.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="w-5 h-5 text-blue-700" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Import Student Data (CSV)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Instructions and Download Template */}
          <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs">
            <div className="text-blue-900 pr-2">
              <span className="font-bold">Required Columns:</span> Roll Number, Student Name, Enrollment Number
            </div>
            <button
              onClick={downloadSampleCSV}
              className="shrink-0 px-2.5 py-1.5 bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Sample CSV
            </button>
          </div>

          {globalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-blue-50/30"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-semibold text-slate-800">
              {fileName ? fileName : 'Click to select or drag & drop CSV file'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Compatible with Microsoft Excel, Google Sheets, or plain CSV
            </p>
          </div>

          {/* Preview Results */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Preview Parsed Data:</span>
                <div className="flex items-center space-x-3">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {validRows.length} Valid
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="text-rose-700 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {invalidRows.length} Flagged
                    </span>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold">
                    <tr>
                      <th className="p-2 border-b">Roll</th>
                      <th className="p-2 border-b">Name</th>
                      <th className="p-2 border-b">Enrollment</th>
                      <th className="p-2 border-b">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={row.isValid ? 'bg-white' : 'bg-red-50/60 text-red-900'}
                      >
                        <td className="p-2 font-mono font-semibold">{row.rollNumber || '-'}</td>
                        <td className="p-2 font-medium">{row.name || '-'}</td>
                        <td className="p-2 font-mono text-[11px]">{row.enrollmentNumber || '-'}</td>
                        <td className="p-2">
                          {row.isValid ? (
                            <span className="text-emerald-600 font-bold">Ready</span>
                          ) : (
                            <span className="text-red-600 text-[11px] font-medium">
                              {row.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={validRows.length === 0 || importing}
              className="py-2.5 px-5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs sm:text-sm shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                `Import ${validRows.length} Student${validRows.length === 1 ? '' : 's'}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
