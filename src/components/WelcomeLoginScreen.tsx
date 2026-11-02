'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  MapPin,
  Check,
  Lock,
  Mail,
  UserPlus,
  LogIn,
  AlertCircle,
} from 'lucide-react';
import { ActivityCategory } from '@/types/lobby';
import { GoogleIcon, AppleIcon } from '@/components/AuthProfileModal';
import { CategoryIcon } from '@/components/CategoryIcon';

interface WelcomeLoginScreenProps {
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  onLogin: (emailOrName: string, password?: string) => Promise<boolean>;
  onCreateAccount: (profile: {
    name: string;
    email: string;
    password?: string;
    age: number;
    neighborhood: string;
    favoriteActivities: ActivityCategory[];
  }) => Promise<boolean>;
}

const AVAILABLE_ACTIVITIES: ActivityCategory[] = [
  'Ping Pong',
  'Chess',
  'Tennis',
  'Coffee',
  'Run Club',
  'Co-work',
  'Board Games',
  'Basketball',
];

export function WelcomeLoginScreen({
  onGoogleSignIn,
  onAppleSignIn,
  onLogin,
  onCreateAccount,
}: WelcomeLoginScreenProps) {
  const [tab, setTab] = useState<'LOGIN' | 'CREATE'>('CREATE');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Create account fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState<number>(24);
  const [neighborhood, setNeighborhood] = useState('Greenwich Village');
  const [selectedActivities, setSelectedActivities] = useState<ActivityCategory[]>([
    'Ping Pong',
    'Coffee',
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleActivity = (act: ActivityCategory) => {
    if (selectedActivities.includes(act)) {
      if (selectedActivities.length > 1) {
        setSelectedActivities(selectedActivities.filter((a) => a !== act));
      }
    } else {
      setSelectedActivities([...selectedActivities, act]);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setErrorMsg('Please enter your email or username');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const ok = await onLogin(loginEmail.trim(), loginPassword.trim());
      if (!ok) {
        setErrorMsg('Invalid email or password. Please check your credentials.');
      }
    } catch {
      setErrorMsg('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Full name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Valid email address is required');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    if (selectedActivities.length === 0) {
      setErrorMsg('Select at least 1 favorite activity');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const ok = await onCreateAccount({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        age: Number(age) || 24,
        neighborhood: neighborhood.trim() || 'Greenwich Village',
        favoriteActivities: selectedActivities,
      });
      if (!ok) {
        setErrorMsg('Could not create account. Email may already be in use.');
      }
    } catch {
      setErrorMsg('Registration failed. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header Branding */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black text-xl tracking-tight shadow-sm">
            S
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight">SeeMe</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded-full">
                VERIFIED IRL
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Spontaneous Meetups & Trusted Members
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {tab === 'CREATE' ? 'Create an Account' : 'Welcome Back'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {tab === 'CREATE'
                ? 'Join verified players for spontaneous meetups in your city.'
                : 'Sign in to access your meetups, check-ins, and trust score.'}
            </p>
          </div>

          {/* Social Auth Providers (Google & Apple) */}
          <div className="space-y-2.5">
            {/* Google Sign-In */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                setErrorMsg('');
                try {
                  await onGoogleSignIn();
                } catch {
                  setErrorMsg('Google Sign-In failed');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="w-full min-h-[48px] flex items-center justify-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.99] disabled:opacity-60"
            >
              <GoogleIcon className="w-5 h-5 flex-shrink-0" />
              <span>Continue with Google</span>
            </button>

            {/* Apple Sign-In */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                setErrorMsg('');
                try {
                  await onAppleSignIn();
                } catch {
                  setErrorMsg('Apple Sign-In failed');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="w-full min-h-[48px] flex items-center justify-center gap-3 px-4 py-2.5 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.99] disabled:opacity-60"
            >
              <AppleIcon className="w-5 h-5 flex-shrink-0" />
              <span>Continue with Apple</span>
            </button>
          </div>

          {/* Or separator */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 uppercase tracking-wider font-bold">
              or with email
            </span>
          </div>

          {/* Tab Switcher: Create Account vs Sign In */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setTab('CREATE');
                setErrorMsg('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                tab === 'CREATE'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('LOGIN');
                setErrorMsg('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                tab === 'LOGIN'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Log In
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tab 1: Create Account Form */}
          {tab === 'CREATE' && (
            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password (min 6)
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Age (18+)
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Neighborhood
                </label>
                <input
                  type="text"
                  required
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="e.g. Greenwich Village, SoHo, East Village"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Activities you play or do:
                </label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {AVAILABLE_ACTIVITIES.map((act) => {
                    const isSelected = selectedActivities.includes(act);
                    return (
                      <button
                        type="button"
                        key={act}
                        onClick={() => toggleActivity(act)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <CategoryIcon category={act} className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{act}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.99] disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Creating account...' : 'Create Account & Enter'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Tab 2: Log In Form */}
          {tab === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email or Username
                </label>
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com or Username"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.99] disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
                <LogIn className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Trust & Verification Footer */}
      <div className="max-w-md w-full mx-auto text-center space-y-2 pb-2">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Verified Member Profiles
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            Local Meetup Spots
          </span>
        </div>
      </div>
    </div>
  );
}
