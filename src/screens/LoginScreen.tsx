import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { CollegeEmblem } from '../components/CollegeEmblem';
import { CampusSilhouette } from '../components/CampusSilhouette';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { signInWithEmail, registerWithEmail, signInWithGoogle, authError, clearAuthError, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegisterMode) {
        await registerWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      // Handled in context and sets authError
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearAuthError();
    setLocalError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      // Handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-[#0b2559] via-[#0d3478] to-[#071c42] flex flex-col justify-between items-center px-4 py-8 overflow-x-hidden">
      {/* Background Campus Silhouette */}
      <div className="absolute bottom-0 left-0 right-0 w-full z-0 opacity-40 pointer-events-none">
        <CampusSilhouette />
      </div>

      {/* Top Header Section */}
      <div className="relative z-10 flex flex-col items-center text-center mt-2 sm:mt-6 max-w-md w-full animate-in fade-in duration-300">
        {/* Crest Logo */}
        <div className="mb-3 transform hover:scale-105 transition-transform">
          <CollegeEmblem size="lg" className="w-20 h-20 sm:w-24 sm:h-24" />
        </div>

        {/* Institution Name */}
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-sm px-2">
          Sobhasaria Group of Institutions, Sikar
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-blue-200 mt-1 font-medium">
          B.Tech – Computer Science & Engineering
        </p>

        {/* Tagline in Gold */}
        <div className="flex items-center space-x-2.5 mt-2 text-xs sm:text-sm font-bold text-amber-400 tracking-wider uppercase">
          <span>Learn</span>
          <span className="text-white/40">|</span>
          <span>Grow</span>
          <span className="text-white/40">|</span>
          <span>Excel</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-[390px] my-6">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-7 border border-white/20 backdrop-blur-xs">
          {/* Card Title */}
          <div className="text-center mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {isRegisterMode ? 'Register Teacher Account' : 'Teacher / Admin Login'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Section A Attendance Management System
            </p>
          </div>

          {/* Disconnected Status Banner */}
          {!isConfigured && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-950">Firebase Disconnected</p>
                <p className="text-amber-800 leading-relaxed">
                  Purana Firebase project disconnect ho chuka hai. Naya project link karne ke liye chat me apna <strong>Firebase Project ID</strong> ya web configuration share karein.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {displayError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <span>{displayError}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username / Email
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@sobhasaria.edu.in"
                  required
                  className="block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  id="login-toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegisterMode ? 'Create Account' : 'Login'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">Or</span>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <button
            id="login-google-btn"
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full py-2.5 px-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-2.5 shadow-2xs hover:shadow-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Toggle between Login and Register */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              id="login-toggle-mode-btn"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                clearAuthError();
                setLocalError(null);
              }}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold transition-colors"
            >
              {isRegisterMode
                ? 'Already have an account? Log In'
                : 'Need a teacher login? Register here'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center text-[11px] text-blue-200/80 font-medium">
        © 2025 Sobhasaria Group of Institutions, Sikar
      </div>
    </div>
  );
};
