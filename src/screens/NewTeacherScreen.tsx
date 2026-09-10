import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  UserPlus,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Users,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext';
import { fetchTeachersList } from '../services/teacherService';
import { Teacher } from '../types';

interface NewTeacherScreenProps {
  onBack: () => void;
}

export const NewTeacherScreen: React.FC<NewTeacherScreenProps> = ({ onBack }) => {
  const { user, isAdmin, createTeacher } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const loadTeachers = async () => {
    if (!user || !isAdmin) return;
    try {
      setLoadingTeachers(true);
      const token = await user.getIdToken();
      const list = await fetchTeachersList(token);
      setTeachers(list);
    } catch {
      // ignore
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, [user, isAdmin]);

  // Security gate: If user is not the single admin
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-2xl border border-red-200 shadow-sm text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-600 mb-6">
          Only the authorized Administrator (<span className="font-semibold text-slate-800">{ADMIN_EMAIL}</span>) has permission to provision and manage teacher accounts.
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
        >
          Return to Settings
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side validations
    if (!name.trim()) {
      setErrorMessage('Please enter the teacher’s full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setErrorMessage('Cannot create a teacher account with the administrator email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await createTeacher(name, email, password);
      setSuccessMessage(
        res.message || `Teacher account for ${name} (${email}) was created successfully!`
      );
      // Reset form on success
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      // Reload the teachers list
      loadTeachers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create teacher account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header bar with Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            id="back-to-settings-btn"
            onClick={onBack}
            className="p-2 rounded-xl text-slate-600 hover:bg-white hover:shadow-xs border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            aria-label="Back to Settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Sign Up for New Teacher
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                <ShieldCheck className="w-3 h-3" />
                Admin Portal
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Securely create faculty login credentials for Sobhasaria attendance management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Admin: <strong>{ADMIN_EMAIL}</strong></span>
        </div>
      </div>

      {/* Grid Layout: Form on Left/Center, Teacher Directory on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Teacher Form Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Create Teacher Account
              </h2>
              <p className="text-xs text-slate-500">
                New teachers will use their email and password to log in directly.
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div
              id="new-teacher-success-banner"
              className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-800 animate-in fade-in"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-emerald-900">Teacher Registered Successfully</p>
                <p className="text-emerald-700 leading-relaxed">{successMessage}</p>
                <p className="text-[11px] text-emerald-600 font-medium pt-1">
                  The teacher can now log in directly from the main login screen using these credentials.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div
              id="new-teacher-error-banner"
              className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800 animate-in fade-in"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-900">Registration Failed</p>
                <p className="text-red-700 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Teacher Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Teacher Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="new-teacher-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Prof. Rajesh Sharma"
                  required
                  className="block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Teacher Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Teacher Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="new-teacher-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rsharma@sobhasaria.edu.in"
                  required
                  className="block w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Must be unique. The teacher will log in with this email.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Temporary / Initial Password <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-teacher-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="new-teacher-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter same password"
                  required
                  minLength={6}
                  className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
              )}
            </div>

            {/* Security Guarantee Note */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Plain-Text Storage:</strong> Passwords are cryptographically salted and hashed inside Firebase Authentication via secure identity protocols.
              </span>
            </div>

            {/* Submit Button */}
            <button
              id="create-teacher-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account in Firebase Auth...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Teacher Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Registered Teachers Directory */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Registered Teachers ({teachers.length})
                </h3>
              </div>
              <button
                onClick={loadTeachers}
                className="text-[11px] text-blue-700 hover:underline font-medium cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {loadingTeachers ? (
              <div className="py-8 flex justify-center items-center">
                <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : teachers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-50" />
                <p>No extra teacher accounts registered yet.</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Use the form to create your faculty members.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {teachers.map((teacher) => (
                  <div key={teacher.uid || teacher.email} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {teacher.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {teacher.email}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      Active Faculty
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="bg-linear-to-br from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100 p-5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 mb-1.5">
              <Sparkles className="w-4 h-4 text-blue-700" />
              <span>Admin Privileges Note</span>
            </div>
            <p className="text-xs text-blue-800/80 leading-relaxed">
              Teacher accounts created here will have faculty access to mark attendance, review Section A students, and export reports. Only <strong>{ADMIN_EMAIL}</strong> has administrative authority to register new teachers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
