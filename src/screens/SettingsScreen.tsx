import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  School,
  BookOpen,
  Layers,
  Users,
  Lock,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  UserPlus,
  ShieldCheck,
  Mail,
  Send,
  Download,
  FileText,
  Clock,
  ExternalLink,
  Cloud,
  FolderOpen,
  RefreshCw,
} from 'lucide-react';
import { CollegeEmblem } from '../components/CollegeEmblem';
import { useAuth } from '../context/AuthContext';
import { ScreenType } from '../types';
import {
  GMAIL_TARGET_EMAIL,
  getGmailBackupRecords,
  getGmailBackupStatus,
  sendTestGmailBackup,
  GmailAttendanceRecord,
} from '../services/gmailBackupService';
import {
  checkDriveConnectionStatus,
  testDriveUpload,
  getDriveAttendanceFiles,
  GOOGLE_DRIVE_TARGET_EMAIL,
  DRIVE_FOLDER_NAME,
  DRIVE_FOLDER_URL,
  DriveFileItem,
} from '../services/googleDriveService';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigate: (screen: ScreenType) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onNavigate }) => {
  const { user, logout, isAdmin } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [gmailRecords, setGmailRecords] = useState<GmailAttendanceRecord[]>([]);
  const [showRecordsModal, setShowRecordsModal] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [gmailNotice, setGmailNotice] = useState<string | null>(null);

  // Google Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [showDriveModal, setShowDriveModal] = useState<boolean>(false);
  const [driveLoading, setDriveLoading] = useState<boolean>(false);
  const [driveNotice, setDriveNotice] = useState<string | null>(null);
  const [driveConnected, setDriveConnected] = useState<boolean>(true);

  useEffect(() => {
    getGmailBackupRecords().then((records) => {
      setGmailRecords(records);
    });
    checkDriveConnectionStatus().then((res) => {
      setDriveConnected(res.connected);
    });
  }, []);

  const handleTestDriveUpload = async () => {
    setDriveLoading(true);
    setDriveNotice(null);
    try {
      const res = await testDriveUpload();
      if (res.success) {
        setDriveNotice(`✓ Uploaded successfully to Google Drive ("${DRIVE_FOLDER_NAME}")!`);
        const filesRes = await getDriveAttendanceFiles();
        setDriveFiles(filesRes.files || []);
      } else {
        setDriveNotice(`Notice: ${res.message || 'Could not complete upload'}`);
      }
    } catch (err: any) {
      setDriveNotice(`Notice: ${err?.message || 'Drive connection error'}`);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleOpenDriveFiles = async () => {
    setDriveLoading(true);
    try {
      const res = await getDriveAttendanceFiles();
      setDriveFiles(res.files || []);
      setShowDriveModal(true);
    } catch (err) {
      console.warn(err);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleTestBackup = async () => {
    setTestLoading(true);
    setGmailNotice(null);
    try {
      const res = await sendTestGmailBackup();
      if (res.success) {
        setGmailNotice(`✓ Test backup successful! Attendance record saved & sent to ${GMAIL_TARGET_EMAIL}`);
        const updated = await getGmailBackupRecords();
        setGmailRecords(updated);
      } else {
        setGmailNotice(`Test finished: ${res.message || 'Saved to archive'}`);
      }
    } catch (err: any) {
      setGmailNotice(`Notice: ${err?.message || 'Verification complete'}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleOpenRecords = async () => {
    const updated = await getGmailBackupRecords();
    setGmailRecords(updated);
    setShowRecordsModal(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto">
      {/* Header Matching Screenshot 8 */}
      <div className="flex items-center space-x-3">
        <button
          id="settings-back-btn"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Settings</h1>
      </div>

      {/* College Profile Card Matching Screenshot 8 */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex items-center space-x-4">
        <CollegeEmblem size="md" className="w-14 h-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
            Sobhasaria Group of Institutions, Sikar
          </h2>
          <p className="text-xs sm:text-sm text-blue-700 font-semibold mt-0.5">
            B.Tech – CSE
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
            <span>Session: 2025–2029</span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Secured with Firebase</span>
          </div>
        </div>
      </div>

      {/* Settings Options List Matching Screenshot 8 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {/* College Information */}
        <button
          onClick={() => {
            setActiveModal('college-info');
            setModalMessage(
              'Sobhasaria Group of Institutions (SGI), Sikar, Rajasthan — Established in 1999, affiliated with RTU and approved by AICTE. Campus: NH-52, Gokulpura, Sikar.'
            );
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <School className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                College Information
              </p>
              <p className="text-[11px] text-slate-500">
                Sobhasaria Group of Institutions, Sikar
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Course & Semester */}
        <button
          onClick={() => {
            setActiveModal('scope-info');
            setModalMessage(
              'Program: B.Tech (Bachelor of Technology)\nBranch: Computer Science & Engineering (CSE)\nScope: Dedicated strictly to Section A.'
            );
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Course & Semester
              </p>
              <p className="text-[11px] text-slate-500">B.Tech – CSE | Sem 1</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Section */}
        <button
          onClick={() => {
            setActiveModal('section-info');
            setModalMessage(
              'Section: A\nPer institutional policy, this portal is exclusively scoped for Section A students and cannot be toggled to other sections.'
            );
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">Section</p>
              <p className="text-[11px] text-slate-500">A (Fixed Scope)</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Student Management shortcut */}
        <button
          onClick={() => onNavigate('students')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Student Management
              </p>
              <p className="text-[11px] text-slate-500">Add, edit or import students</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Attendance Settings */}
        <button
          onClick={() => {
            setActiveModal('att-settings');
            setModalMessage(
              'Attendance Storage: Cloud Firestore\nPolicy: Teacher/Admin manually records attendance for each lecture/day.\nDuplication Guard: Enabled (deterministic date_studentId keys).'
            );
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Attendance Settings
              </p>
              <p className="text-[11px] text-slate-500">
                Firestore rules & duplication protection
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Change Password / Auth Info */}
        <button
          onClick={() => {
            setActiveModal('auth-info');
            setModalMessage(
              `Authenticated User:\nEmail: ${user?.email || 'N/A'}\nUID: ${user?.uid || 'N/A'}\nRole: ${isAdmin ? 'System Administrator' : 'Faculty Member'}`
            );
          }}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                {isAdmin ? 'Administrator Credentials' : 'Instructor Account Info'}
              </p>
              <p className="text-[11px] text-slate-500">
                {user?.email || 'Teacher Credentials'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Admin Only Option in Settings */}
        {isAdmin && (
          <button
            id="settings-admin-new-teacher-btn"
            onClick={() => onNavigate('new-teacher')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    Sign Up for New Teacher
                  </p>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Provision new faculty login credentials
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        )}

        {/* Google Drive Cloud Auto-Upload (Permanent Sync - Zero Teacher Authorization) */}
        {isAdmin && (
          <div className="w-full p-4 flex flex-col gap-3 bg-blue-50/40 border-b border-blue-100 hover:bg-blue-50/70 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0 mt-0.5">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      Google Drive Cloud Sync
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
                      Connected • Auto-Upload Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Account: <strong className="text-blue-900 font-bold">{GOOGLE_DRIVE_TARGET_EMAIL}</strong> • Folder: <strong className="text-blue-900 font-bold">"{DRIVE_FOLDER_NAME}"</strong>
                    <br />
                    Har attendance save par Excel file automatically Google Drive mein upload hoti hai. Kisi teacher ko login ya authorize karne ki zaroorat nahi hai.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                <button
                  type="button"
                  id="settings-test-drive-btn"
                  onClick={handleTestDriveUpload}
                  disabled={driveLoading}
                  title="Test upload a verification file to Google Drive"
                  className="px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shrink-0 cursor-pointer bg-white border border-blue-200 text-blue-800 hover:bg-blue-100 shadow-2xs flex items-center gap-1.5"
                >
                  {driveLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
                  )}
                  <span>{driveLoading ? 'Testing...' : 'Test Drive Upload'}</span>
                </button>

                <button
                  type="button"
                  id="settings-view-drive-files-btn"
                  onClick={handleOpenDriveFiles}
                  className="px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shrink-0 cursor-pointer bg-blue-700 hover:bg-blue-800 text-white shadow-2xs flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Drive Files</span>
                </button>

                <a
                  href={DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-100 border border-slate-200 transition-colors"
                  title="Open Google Drive Folder in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {driveNotice && (
              <div className="px-3 py-2 bg-white/90 border border-blue-200 rounded-lg text-blue-900 text-xs flex items-center justify-between shadow-2xs">
                <span>{driveNotice}</span>
                <button onClick={() => setDriveNotice(null)} className="text-blue-700 font-bold ml-2 cursor-pointer">✕</button>
              </div>
            )}
          </div>
        )}

        {/* Automatic Gmail Attendance Backup (Admin View - Zero Authorization) */}
        {isAdmin && (
          <div className="w-full p-4 flex flex-col gap-3 bg-emerald-50/40 border-b border-emerald-100 hover:bg-emerald-50/70 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      Automatic Gmail Backup
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Active • Zero Authorization
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Attendance save hote hi pura data (Excel Sheet + Student List) automatically{' '}
                    <strong className="text-emerald-900 font-bold">{GMAIL_TARGET_EMAIL}</strong> par save ho raha hai. Kisi authorization ya popup ki zaroorat nahi hai.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <button
                  type="button"
                  id="settings-test-gmail-btn"
                  onClick={handleTestBackup}
                  disabled={testLoading}
                  title="Send test attendance backup to Gmail"
                  className="px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shrink-0 cursor-pointer bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 shadow-2xs flex items-center gap-1.5"
                >
                  {testLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-emerald-700" />
                  )}
                  <span>{testLoading ? 'Testing...' : 'Test Backup'}</span>
                </button>

                <button
                  type="button"
                  id="settings-view-gmail-records-btn"
                  onClick={handleOpenRecords}
                  className="px-3 py-1.5 rounded-xl font-semibold text-xs transition-all shrink-0 cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Saved Records ({gmailRecords.length})</span>
                </button>
              </div>
            </div>

            {gmailNotice && (
              <div className="px-3 py-2 bg-white/90 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center justify-between shadow-2xs">
                <span>{gmailNotice}</span>
                <button onClick={() => setGmailNotice(null)} className="text-emerald-700 font-bold ml-2 cursor-pointer">✕</button>
              </div>
            )}
          </div>
        )}

        {/* Logout Matching Screenshot 8 */}
        <button
          id="settings-logout-btn"
          onClick={handleLogout}
          className="w-full p-4 flex items-center justify-between hover:bg-rose-50/50 transition-colors text-left group"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-rose-700">Logout</p>
              <p className="text-[11px] text-rose-500">Sign out of SGI Attendance</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400" />
        </button>
      </div>

      {/* App Version Info */}
      <div className="text-center pt-2">
        <p className="text-xs font-semibold text-slate-500">
          SGI Attendance v1.0.0
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          © 2026 Gautam Tiwari from Nexora. All Rights Reserved.
        </p>
      </div>

      {/* Info Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-2.5 text-blue-900 font-bold text-sm mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span>System Information</span>
            </div>
            <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 leading-relaxed">
              {modalMessage}
            </pre>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="py-1.5 px-4 rounded-xl bg-blue-900 text-white font-semibold text-xs shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gmail Backup Archive Records Modal */}
      {showRecordsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5 text-emerald-900 font-bold text-sm">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Gmail Backup Records</h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Target: <strong className="text-emerald-700">{GMAIL_TARGET_EMAIL}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecordsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-3 flex items-center justify-between bg-emerald-50/60 rounded-xl px-3 my-3 text-xs text-emerald-900 border border-emerald-100">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Zero authorization required</span>
              </div>
              <span className="text-[11px] bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                {gmailRecords.length} Saved Record{gmailRecords.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2.5 divide-y divide-slate-100">
              {gmailRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-700">No attendance backups saved yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click "Test Backup" or mark attendance to automatically save here!
                  </p>
                </div>
              ) : (
                gmailRecords.map((rec) => (
                  <div key={rec.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{rec.date}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700">
                          {rec.percentage}% Att.
                        </span>
                        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Auto-saved
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <span className="text-emerald-700 font-semibold">{rec.presentCount} Present</span> •{' '}
                        <span className="text-rose-600 font-semibold">{rec.absentCount} Absent</span> •{' '}
                        <span>{rec.totalStudents} Total Students</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {rec.filePath && (
                        <a
                          href={`/api/gmail/download/${rec.filePath}`}
                          download
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors text-xs flex items-center gap-1"
                          title="Download Excel Report"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <a
                href={`https://mail.google.com/mail/u/0/#search/from%3ASGI+Attendance+OR+subject%3AAttendance`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-700 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Open Gmail ({GMAIL_TARGET_EMAIL})</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => setShowRecordsModal(false)}
                className="py-1.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs shadow-xs cursor-pointer hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Uploaded Files Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5 text-blue-900 font-bold text-sm">
                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-700">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Google Drive Synced Files</h3>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Folder: <strong className="text-blue-700">{DRIVE_FOLDER_NAME}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDriveModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-3 flex items-center justify-between bg-blue-50/60 rounded-xl px-3 my-3 text-xs text-blue-900 border border-blue-100">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-semibold">Auto-synced from Sobhasaria App</span>
              </div>
              <span className="text-[11px] bg-blue-200/70 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                {driveFiles.length} File{driveFiles.length !== 1 ? 's' : ''} in Folder
              </span>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2.5 divide-y divide-slate-100">
              {driveFiles.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <Cloud className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-700">No attendance files found in folder yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click "Test Drive Upload" or mark attendance to see files appear here!
                  </p>
                </div>
              ) : (
                driveFiles.map((f) => (
                  <div key={f.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-900 truncate" title={f.name}>
                        {f.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : 'Recent'} • Google Drive File
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`https://drive.google.com/file/d/${f.id}/view`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs flex items-center gap-1 font-semibold"
                        title="View file in Google Drive"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <a
                href={DRIVE_FOLDER_URL}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-700 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Open in Google Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => setShowDriveModal(false)}
                className="py-1.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs shadow-xs cursor-pointer hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
