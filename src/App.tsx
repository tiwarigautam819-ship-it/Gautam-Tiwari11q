import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { CollegeEmblem } from './components/CollegeEmblem';
import { ScreenType } from './types';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { MarkAttendanceScreen } from './screens/MarkAttendanceScreen';
import { StudentManagementScreen } from './screens/StudentManagementScreen';
import { AttendanceHistoryScreen } from './screens/AttendanceHistoryScreen';
import { WeeklyReportScreen } from './screens/WeeklyReportScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { toDateString } from './services/attendanceService';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Current date (2026-09-09)
    return toDateString(new Date());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <CollegeEmblem size="lg" className="w-20 h-20 animate-pulse mb-4" />
        <div className="w-8 h-8 border-3 border-blue-700 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs font-semibold text-slate-600">
          Connecting to Sobhasaria Attendance System...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top App Bar */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />

      {/* Main Screen Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-20 sm:pb-24">
        {currentScreen === 'dashboard' && (
          <DashboardScreen
            onNavigate={(screen) => setCurrentScreen(screen)}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
          />
        )}

        {currentScreen === 'mark-attendance' && (
          <MarkAttendanceScreen
            onBack={() => setCurrentScreen('dashboard')}
            onNavigate={(screen) => setCurrentScreen(screen)}
            selectedDate={selectedDate}
            onSelectDate={(date) => setSelectedDate(date)}
          />
        )}

        {currentScreen === 'students' && (
          <StudentManagementScreen
            onBack={() => setCurrentScreen('dashboard')}
          />
        )}

        {currentScreen === 'history' && (
          <AttendanceHistoryScreen
            onBack={() => setCurrentScreen('dashboard')}
            onNavigateToMarkDate={(date) => {
              setSelectedDate(date);
              setCurrentScreen('mark-attendance');
            }}
          />
        )}

        {currentScreen === 'weekly-report' && (
          <WeeklyReportScreen
            onBack={() => setCurrentScreen('dashboard')}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            onBack={() => setCurrentScreen('dashboard')}
            onNavigate={(screen) => setCurrentScreen(screen)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
