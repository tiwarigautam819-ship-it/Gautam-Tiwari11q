import React, { useState } from 'react';
import { Menu, Bell, LogOut, User as UserIcon, X, School, Info } from 'lucide-react';
import { CollegeEmblem } from './CollegeEmblem';
import { useAuth } from '../context/AuthContext';
import { ScreenType } from '../types';

interface NavbarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentScreen, onNavigate }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Menu & App Branding */}
          <div className="flex items-center space-x-3">
            <button
              id="header-menu-toggle-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors focus:outline-hidden"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              id="header-brand-logo-btn"
              onClick={() => onNavigate('dashboard')}
              className="flex items-center space-x-2.5 focus:outline-hidden text-left"
            >
              <CollegeEmblem size="sm" className="w-7 h-7" />
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-900 leading-tight">
                  SGI Attendance
                </span>
                <span className="text-[10px] text-blue-700 font-semibold uppercase tracking-wider">
                  B.Tech CSE – Sec A
                </span>
              </div>
            </button>
          </div>

          {/* Right: Notification Bell & Teacher Profile */}
          <div className="flex items-center space-x-2">
            <button
              id="header-bell-btn"
              onClick={() => setShowNotification(!showNotification)}
              className="relative p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors focus:outline-hidden"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
            </button>

            {user && (
              <div className="hidden sm:flex items-center pl-2 border-l border-slate-200 space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'T'}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-800 truncate max-w-[120px]">
                    {user.email?.split('@')[0] || 'Teacher'}
                  </span>
                  <span className="text-[10px] text-slate-500">Instructor</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notification Popup */}
        {showNotification && (
          <div className="absolute right-4 top-16 w-80 bg-white border border-slate-200 shadow-xl rounded-xl p-4 z-50 text-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-blue-600" /> Notifications
              </span>
              <button
                onClick={() => setShowNotification(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2">
              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                <p className="font-semibold text-blue-900">Attendance Portal Active</p>
                <p className="text-blue-800 mt-0.5">
                  Sobhasaria Group of Institutions — Computer Science & Engineering (Section A) attendance system connected to live Cloud Firestore.
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Slide-out Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CollegeEmblem size="md" className="w-10 h-10" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">SGI Attendance</h3>
                  <p className="text-xs text-blue-200">CSE – Section A</p>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Institution Badge in Drawer */}
            <div className="p-3 bg-blue-50/70 border-b border-blue-100 text-xs text-blue-900">
              <div className="font-semibold">Sobhasaria Group of Institutions</div>
              <div className="text-[11px] text-blue-700">Sikar, Rajasthan</div>
            </div>

            {/* Nav Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <button
                onClick={() => {
                  onNavigate('dashboard');
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                  currentScreen === 'dashboard'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  onNavigate('mark-attendance');
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                  currentScreen === 'mark-attendance'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Mark Attendance
              </button>
              <button
                onClick={() => {
                  onNavigate('students');
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                  currentScreen === 'students'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Student Management
              </button>
              <button
                onClick={() => {
                  onNavigate('history');
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                  currentScreen === 'history'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Attendance History
              </button>
              <button
                onClick={() => {
                  onNavigate('weekly-report');
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                  currentScreen === 'weekly-report'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Weekly Report
              </button>
              <button
                onClick={() => {
                  onNavigate('settings');
                  setMenuOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-3 ${
                  currentScreen === 'settings'
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Settings / Admin
              </button>
            </div>

            {/* Bottom Drawer Logout */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
