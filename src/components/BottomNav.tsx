import React from 'react';
import { Home, Users, History, BarChart3, Settings } from 'lucide-react';
import { ScreenType } from '../types';

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'dashboard' as ScreenType, label: 'Home', icon: Home },
    { id: 'students' as ScreenType, label: 'Students', icon: Users },
    { id: 'history' as ScreenType, label: 'History', icon: History },
    { id: 'weekly-report' as ScreenType, label: 'Reports', icon: BarChart3 },
    { id: 'settings' as ScreenType, label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      id="app-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 md:max-w-xl lg:max-w-2xl sm:rounded-t-2xl sm:border print:hidden"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Determine if active: when on 'mark-attendance', 'dashboard' or related
          const isActive =
            currentScreen === item.id ||
            (item.id === 'dashboard' && currentScreen === 'mark-attendance');

          return (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-150 focus:outline-hidden ${
                isActive ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-transform ${
                  isActive ? 'scale-110' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span
                className={`text-[11px] mt-0.5 tracking-tight ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
