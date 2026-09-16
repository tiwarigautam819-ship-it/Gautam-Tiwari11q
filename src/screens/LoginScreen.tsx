import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, Mail, CheckCircle2, KeyRound } from 'lucide-react';
import { CollegeEmblem } from '../components/CollegeEmblem';
import { CampusSilhouette } from '../components/CampusSilhouette';
import { useAuth } from '../context/AuthContext';

type LoginView = 'signin' | 'forgot';

export const LoginScreen: React.FC = () => {
  const { signInWithEmail, resetPassword, authError, clearAuthError, isConfigured } = useAuth();

  const [view, setView] = useState<LoginView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalError(null);
    setResetSuccessMessage(null);

    const cleanEmail = email.trim();

    if (view === 'forgot') {
      if (!cleanEmail) {
        setLocalError('Please enter your email address.');
        return;
      }
      setSubmitting(true);
      try {
        await resetPassword(cleanEmail);
        setResetSuccessMessage(`Password reset link sent to ${cleanEmail}. Please check your inbox and spam folder.`);
      } catch {
        // Error state handled in AuthContext
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!cleanEmail) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmail(cleanEmail, password);
    } catch {
      // Error state handled in AuthContext
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

      {/* Main Login Card - Email and Password Only */}
      <div className="relative z-10 w-full max-w-[400px] my-6">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-7 border border-white/20 backdrop-blur-xs">
          {/* Card Title */}
          <div className="text-center mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {view === 'signin' ? 'Faculty & Admin Sign In' : 'Reset Your Password'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {view === 'signin'
                ? 'Sign in with your Email and Password'
                : 'Enter your registered email to receive a recovery link'}
            </p>
          </div>

          {/* Disconnected Status Banner */}
          {!isConfigured && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-950">Firebase Setup Required</p>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  Please ensure Firebase configuration is connected to enable cloud authentication.
                </p>
              </div>
            </div>
          )}

          {/* Reset Password Success Banner */}
          {resetSuccessMessage && (
            <div
              id="login-success-banner"
              className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 text-[11px] leading-relaxed">
                <p className="font-semibold">{resetSuccessMessage}</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {displayError && (
            <div
              id="login-error-banner"
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 text-[11px] leading-relaxed">
                <span>{displayError}</span>
              </div>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@sobhasaria.edu.in"
                  autoComplete="email"
                  required
                  className="block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field (Only in Sign In mode) */}
            {view === 'signin' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    id="forgot-password-toggle-btn"
                    onClick={() => {
                      setView('forgot');
                      clearAuthError();
                      setLocalError(null);
                      setResetSuccessMessage(null);
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
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
                    autoComplete="current-password"
                    required
                    minLength={6}
                    className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    id="login-toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : view === 'signin' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Password Reset Link</span>
                </>
              )}
            </button>

            {/* Back to Sign In button (in forgot mode) */}
            {view === 'forgot' && (
              <button
                type="button"
                id="back-to-signin-btn"
                onClick={() => {
                  setView('signin');
                  clearAuthError();
                  setLocalError(null);
                  setResetSuccessMessage(null);
                }}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 text-center cursor-pointer"
              >
                ← Back to Sign In
              </button>
            )}
          </form>

          {/* Secure System Notice */}
          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Secured with <strong className="text-slate-700">Firebase Authentication</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center text-[11px] text-blue-200/80 font-medium">
        © 2026 Gautam Tiwari from Nexora. All Rights Reserved.
      </div>
    </div>
  );
};


