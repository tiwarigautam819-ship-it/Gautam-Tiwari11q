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
  Cloud,
  Check,
} from 'lucide-react';
import { CollegeEmblem } from '../components/CollegeEmblem';
import { useAuth } from '../context/AuthContext';
import { ScreenType } from '../types';
import { checkDriveConnectionStatus, signInWithGoogleDrive } from '../services/googleDriveService';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigate: (screen: ScreenType) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onNavigate }) => {
  const { user, logout, isAdmin } = useAuth();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [driveConnected, setDriveConnected] = useState<boolean>(false);
  const [driveAdminEmail, setDriveAdminEmail] = useState<string>('rk89experiment@gmail.com');
  const [driveLoading, setDriveLoading] = useState<boolean>(false);
  const [driveNotice, setDriveNotice] = useState<string | null>(null);

  useEffect(() => {
    checkDriveConnectionStatus().then((status) => {
      setDriveConnected(status.connected);
      if (status.adminEmail) setDriveAdminEmail(status.adminEmail);
    });
  }, []);

  const handleConnectDrive = async () => {
    setDriveLoading(true);
    setDriveNotice(null);
    try {
      const res = await signInWithGoogleDrive();
      if (res && res.accessToken) {
        setDriveConnected(true);
        setDriveNotice('Successfully authorized Google Drive! All attendance saves will now automatically upload to your Google Drive.');
      } else {
        setDriveNotice('Authorization completed. Drive token registered.');
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setDriveNotice(`Authorization error: ${err?.message || 'Could not connect'}`);
      }
    } finally {
      setDriveLoading(false);
    }
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

        {/* Google Drive Cloud Backup (Admin Only) */}
        {isAdmin && (
          <div className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-3.5">
              <div className={`p-2 rounded-xl ${driveConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    Google Drive Cloud Backup
                  </p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                    driveConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {driveConnected ? 'Active' : 'Action Required'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {driveConnected
                    ? `Auto-syncing all attendance records to ${driveAdminEmail} ("Sobhasaria Attendance Records")`
                    : `Needs 1-click authorization to upload attendance to ${driveAdminEmail}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              id="settings-connect-drive-btn"
              onClick={handleConnectDrive}
              disabled={driveLoading}
              className={`px-3.5 py-2 rounded-xl font-semibold text-xs transition-all shrink-0 cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 ${
                driveConnected
                  ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-blue-700 hover:bg-blue-800 text-white'
              }`}
            >
              {driveLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : driveConnected ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Re-authorize</span>
                </>
              ) : (
                <span>Authorize Google Drive</span>
              )}
            </button>
          </div>
        )}

        {driveNotice && (
          <div className="px-4 py-2.5 bg-blue-50/80 border-t border-blue-100 text-blue-900 text-xs flex items-center justify-between">
            <span>{driveNotice}</span>
            <button onClick={() => setDriveNotice(null)} className="text-blue-700 font-bold ml-2 cursor-pointer">Dismiss</button>
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
                className="py-1.5 px-4 rounded-xl bg-blue-900 text-white font-semibold text-xs shadow-xs"
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
