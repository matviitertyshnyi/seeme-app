'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  LogIn,
  Check,
  ShieldCheck,
  Star,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { ActivityCategory, UserPersona } from '@/types/lobby';
import {
  ALL_CATEGORIES,
  ACTIVITY_GROUPS,
  GROUPED_ACTIVITIES,
  CategoryIcon,
} from '@/components/CategoryIcon';

interface AuthProfileModalProps {
  isOpen: boolean;
  initialTab?: 'LOGIN' | 'REGISTER' | 'EDIT';
  onClose: () => void;
  activeUser: UserPersona;
  personas: UserPersona[];
  onSelectUser: (persona: UserPersona) => void;
  onUserCreatedOrUpdated: (
    persona: UserPersona,
    allPersonas: UserPersona[],
    message: string
  ) => void;
}

export function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
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
  );
}

export function AppleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="currentColor">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.74-11.64-14.1-6.19-9.67-11.02-20.78-14.5-33.32-3.48-12.54-5.22-24.36-5.22-35.46 0-14.02 3.52-25.79 10.57-35.31 7.05-9.52 16.03-14.38 26.94-14.59 5.43 0 11.2 1.34 17.3 4.02 6.1 2.68 10.02 4.07 11.76 4.17 1.41 0 5.48-1.44 12.22-4.33 6.74-2.88 12.53-4.22 17.37-4.02 12.39.63 22.39 5.24 30 13.82-10.87 6.64-16.19 15.68-15.96 27.13.24 8.92 3.65 16.48 10.23 22.68 6.58 6.2 14.37 9.8 23.37 10.8-2.61 7.72-5.98 16.09-10.11 25.12zM119.22 31.84c0-7.72 2.76-14.88 8.28-21.48 5.53-6.6 12.33-10.36 20.4-11.28.22 1.09.33 2.18.33 3.27 0 7.61-2.83 14.82-8.49 21.63-5.65 6.81-12.61 10.63-20.88 11.45-.11-1.09-.16-2.18-.16-3.27z" />
    </svg>
  );
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
];

const SKILL_BADGE_PRESETS = [
  'Beginner',
  'Casual',
  'Intermediate',
  'Advanced',
  '1550 Elo',
  '3.5 NTRP',
  '4.0 NTRP',
  '5:00/km',
  'Competitive',
];

export function AuthProfileModal({
  isOpen,
  initialTab = 'EDIT',
  onClose,
  activeUser,
  personas,
  onSelectUser,
  onUserCreatedOrUpdated,
}: AuthProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER' | 'EDIT'>(
    initialTab
  );
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Login State
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register / Edit Form State
  const [name, setName] = useState(activeUser.name);
  const [email, setEmail] = useState(activeUser.email || '');
  const [age, setAge] = useState<number>(activeUser.age);
  const [neighborhood, setNeighborhood] = useState(activeUser.neighborhood);
  const [avatar, setAvatar] = useState(activeUser.avatar);
  const [skillBadge, setSkillBadge] = useState(activeUser.skillBadge);
  const [tagline, setTagline] = useState(activeUser.tagline);
  const [favoriteActivities, setFavoriteActivities] = useState<ActivityCategory[]>(
    activeUser.favoriteActivities
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setWizardStep(1);
      setLoginError('');
      if (initialTab === 'EDIT') {
        setName(activeUser.name);
        setEmail(activeUser.email || '');
        setAge(activeUser.age);
        setNeighborhood(activeUser.neighborhood);
        setAvatar(activeUser.avatar);
        setSkillBadge(activeUser.skillBadge);
        setTagline(activeUser.tagline);
        setFavoriteActivities(activeUser.favoriteActivities || ['Ping Pong', 'Chess']);
      } else if (initialTab === 'REGISTER') {
        setName('');
        setEmail('');
        setAge(25);
        setNeighborhood('Greenwich Village');
        setAvatar(PRESET_AVATARS[4]);
        setSkillBadge('Intermediate');
        setTagline('');
        setFavoriteActivities(['Ping Pong', 'Chess']);
      }
    }
  }, [isOpen, initialTab, activeUser]);

  if (!isOpen) return null;

  const toggleActivity = (cat: ActivityCategory) => {
    setFavoriteActivities((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginInput.trim()) {
      setLoginError('Enter your email or name to sign in.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOGIN',
          emailOrName: loginInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Account not found');
        return;
      }
      onSelectUser(data.persona);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    setLoginError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GOOGLE_AUTH',
          email: 'alex.chen.meetups@gmail.com',
          name: 'Alex Chen',
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Google authentication failed');
        return;
      }
      onUserCreatedOrUpdated(
        data.persona,
        data.personas,
        `Signed in with Google as ${data.persona.name}!`
      );
      onClose();
    } catch {
      setLoginError('Could not connect to Google authentication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleAuth = async () => {
    setIsSubmitting(true);
    setLoginError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPLE_AUTH',
          email: 'apple.member@icloud.com',
          name: 'Jordan Miller',
          avatar:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Apple authentication failed');
        return;
      }
      onUserCreatedOrUpdated(
        data.persona,
        data.personas,
        `Signed in with Apple ID as ${data.persona.name}!`
      );
      onClose();
    } catch {
      setLoginError('Could not connect to Apple authentication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REGISTER_OR_CREATE_PROFILE',
          name,
          email,
          age,
          neighborhood,
          avatar,
          skillBadge,
          tagline,
          favoriteActivities,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUserCreatedOrUpdated(
          data.persona,
          data.personas,
          `Created profile for ${data.persona.name}!`
        );
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          userId: activeUser.id,
          name,
          age,
          neighborhood,
          avatar,
          skillBadge,
          tagline,
          favoriteActivities,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUserCreatedOrUpdated(
          data.persona,
          data.personas,
          'Profile setup saved!'
        );
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Profile Setup"
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[28px] shadow-ambient-lg border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
              {initialTab === 'EDIT' ? 'Edit Profile' : 'Sign In & Account'}
            </h2>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {initialTab === 'EDIT'
                ? 'Update your photo, skill level badge, bio, and favorite activities'
                : 'Switch account or sign in to SeeMe'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Only show Login/Register switcher when user is signed out or switching accounts */}
        {initialTab !== 'EDIT' && (
          <div className="px-6 pt-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 pb-4 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('LOGIN')}
              className={`min-h-[44px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all ${
                activeTab === 'LOGIN'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Switch / Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('REGISTER');
                setWizardStep(1);
                setName('');
                setEmail('');
                setTagline('');
              }}
              className={`min-h-[44px] rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 border transition-all ${
                activeTab === 'REGISTER'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New Account</span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: SIGN IN */}
          {activeTab === 'LOGIN' && (
            <div className="space-y-5">
              {/* Modern OAuth (Google & Apple) */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleAuth}
                  className="min-h-[48px] w-full rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleAppleAuth}
                  className="min-h-[48px] w-full rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                >
                  <AppleIcon className="w-5 h-5 shrink-0" />
                  <span>Continue with Apple</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Or Email / Name
                </span>
                <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Email or Player Name
                  </label>
                  <input
                    type="text"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="e.g., maya@seeme.app or Liam Vance"
                    aria-label="Email or Player Name"
                    className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                {loginError && (
                  <p className="text-xs font-extrabold text-rose-700 dark:text-rose-400">{loginError}</p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[48px] w-full rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold shadow-sm transition-all"
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In to SeeMe'}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                  Or 1-Tap Sign In With Existing Account
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {personas.map((p) => {
                    const isCurrent = p.id === activeUser.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSelectUser(p);
                          onClose();
                        }}
                        className={`min-h-[56px] p-3 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all ${
                          isCurrent
                            ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-950 dark:text-white truncate">
                              {p.name}, {p.age}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                              <span>{p.skillBadge}</span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                {p.ratingAvg}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isCurrent && (
                          <Check className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER NEW ACCOUNT (3-STEP PROFILE SETUP WIZARD) */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              {/* Step Indicator */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                {[
                  { step: 1, label: '1. Account' },
                  { step: 2, label: '2. Avatar & Bio' },
                  { step: 3, label: '3. Skills & Sports' },
                ].map((item) => (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setWizardStep(item.step as 1 | 2 | 3)}
                    className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                      wizardStep === item.step
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-4">
                  {/* Google 1-Tap Sign-up */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleGoogleAuth}
                    className="min-h-[48px] w-full rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all"
                  >
                    <GoogleIcon className="w-5 h-5 shrink-0" />
                    <span>Sign Up with Google in 1 Tap</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Or fill out manually
                    </span>
                    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Jordan Taylor"
                      aria-label="Full Name"
                      className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jordan@seeme.app"
                        aria-label="Email Address"
                        className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-950 dark:text-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        Age
                      </label>
                      <input
                        type="number"
                        min={18}
                        max={99}
                        value={age}
                        onChange={(e) => setAge(Number(e.target.value) || 25)}
                        aria-label="Age"
                        className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-950 dark:text-white focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Neighborhood / City
                    </label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="e.g., Greenwich Village, SoHo, Williamsburg"
                      aria-label="Neighborhood or City"
                      className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-950 dark:text-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      disabled={!name.trim()}
                      className="min-h-[44px] px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Next: Avatar & Bio</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Choose Profile Photo
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {PRESET_AVATARS.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setAvatar(url)}
                          aria-label="Select avatar"
                          className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all ${
                            avatar === url
                              ? 'border-indigo-600 ring-2 ring-indigo-600 scale-105'
                              : 'border-transparent opacity-75 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={url}
                            alt="Avatar option"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Short Player Bio / Equipment Note
                    </label>
                    <textarea
                      rows={2}
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g., Always down for 1v1 ping pong, rapid chess in the park, or afternoon espresso."
                      aria-label="Short Player Bio"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-950 dark:text-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="min-h-[44px] px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="min-h-[44px] px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Next: Skills & Activities</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Primary Skill Badge (Shown on Your Seat Bubble)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {SKILL_BADGE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSkillBadge(preset)}
                          className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-extrabold border ${
                            skillBadge === preset
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={skillBadge}
                      onChange={(e) => setSkillBadge(e.target.value)}
                      placeholder="Custom skill badge (e.g., 1600 Elo, 4.0 Tennis)"
                      aria-label="Custom skill badge"
                      className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-950 dark:text-white focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Favorite Activities (Used for Radar Beacon Matches)
                    </label>
                    <div className="space-y-3">
                      {ACTIVITY_GROUPS.map((grp) => (
                        <div key={grp} className="space-y-1.5">
                          <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CategoryIcon category={grp} className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>{grp}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {GROUPED_ACTIVITIES[grp].map((cat) => {
                              const selected = favoriteActivities.includes(cat);
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => toggleActivity(cat)}
                                  className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                                    selected
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                      : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                                  <span>{cat}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="min-h-[44px] px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !name.trim()}
                      className="min-h-[48px] px-7 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold shadow-sm inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isSubmitting ? 'Creating Profile...' : 'Complete Registration'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* TAB 3: EDIT CURRENT PROFILE */}
          {activeTab === 'EDIT' && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Trust & Verification Summary Strip */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                  <div>
                    <div className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                      Verified Player Profile · {activeUser.reliabilityScore}% Reliability
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                      {activeUser.ratingAvg} Avg Rating across {activeUser.ratingCount} reviews
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Profile Avatar
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setAvatar(url)}
                      aria-label="Choose profile avatar"
                      className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all ${
                        avatar === url
                          ? 'border-indigo-600 ring-2 ring-indigo-600'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Full Name"
                    className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-950 dark:text-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value) || 24)}
                    aria-label="Age"
                    className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-950 dark:text-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Skill-Level Badge
                  </label>
                  <input
                    type="text"
                    value={skillBadge}
                    onChange={(e) => setSkillBadge(e.target.value)}
                    aria-label="Skill badge"
                    className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-indigo-700 dark:text-indigo-400 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Neighborhood
                  </label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    aria-label="Neighborhood"
                    className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-950 dark:text-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Bio & Tagline
                </label>
                <textarea
                  rows={2}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  aria-label="Bio and Tagline"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-950 dark:text-white focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Favorite Activities (Grouped by Category)
                </label>
                <div className="space-y-3">
                  {ACTIVITY_GROUPS.map((grp) => (
                    <div key={grp} className="space-y-1.5">
                      <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CategoryIcon category={grp} className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>{grp}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {GROUPED_ACTIVITIES[grp].map((cat) => {
                          const selected = favoriteActivities.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => toggleActivity(cat)}
                              className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                                selected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                              <span>{cat}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-extrabold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
