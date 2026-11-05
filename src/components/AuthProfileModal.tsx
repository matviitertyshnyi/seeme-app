'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { ActivityCategory, UserPersona } from '@/types/lobby';
import {
  ACTIVITY_GROUPS,
  GROUPED_ACTIVITIES,
  CategoryIcon,
} from '@/components/CategoryIcon';

interface AuthProfileModalProps {
  isOpen: boolean;
  initialTab?: 'LOGIN' | 'EDIT';
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
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.89.04-1.98.6-2.62 1.34-.57.65-1.07 1.71-1.01 2.76.99.08 2.01-.5 2.62-1.23z" />
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
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'EDIT'>(initialTab);
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
      }
    }
  }, [isOpen, initialTab, activeUser]);

  if (!isOpen) return null;

  const toggleActivity = (cat: ActivityCategory) => {
    setFavoriteActivities((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleGoogleAuth = async () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/google';
    }
  };

  const handleAppleAuth = async () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/apple';
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
      className="fixed inset-0 z-[1000] bg-stone-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Profile Setup"
        className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-t-[28px] sm:rounded-[28px] shadow-ambient-lg border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-stone-950 dark:text-white">
              {initialTab === 'EDIT' ? 'Edit Profile' : 'Sign In & Account'}
            </h2>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              {initialTab === 'EDIT'
                ? 'Update your photo, skill level badge, bio, and favorite activities'
                : 'Switch account or sign in to Leave The Room'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authentication header when user is signed out or switching accounts */}
        {initialTab !== 'EDIT' && (
          <div className="px-6 pt-3 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 pb-3 shrink-0">
            <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
              Sign in with your verified Google or Apple account
            </p>
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
                  className="min-h-[48px] w-full rounded-2xl bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                >
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleAppleAuth}
                  className="min-h-[48px] w-full rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                >
                  <AppleIcon className="w-5 h-5 shrink-0" />
                  <span>Continue with Apple</span>
                </button>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold">
                  {loginError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 flex items-center gap-2 text-[11px] font-bold text-stone-600 dark:text-stone-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Verified 1-tap sign-in with your Google or Apple ID. No separate password needed.</span>
              </div>

              <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
                <div className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-3">
                  Or 1-Tap Sign In With Existing Demo Account
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
                            ? 'bg-orange-50 dark:bg-orange-950 border-orange-600'
                            : 'bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-stone-950 dark:text-white truncate">
                              {p.name}, {p.age}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-700 dark:text-orange-400">
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
                          <Check className="w-4 h-4 text-orange-700 dark:text-orange-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
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
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
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
                          ? 'border-orange-600 ring-2 ring-orange-600'
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
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Full Name"
                    className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value) || 24)}
                    aria-label="Age"
                    className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                    Skill-Level Badge
                  </label>
                  <input
                    type="text"
                    value={skillBadge}
                    onChange={(e) => setSkillBadge(e.target.value)}
                    aria-label="Skill badge"
                    className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-bold text-orange-700 dark:text-orange-400 focus:outline-none focus:border-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                    Neighborhood
                  </label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    aria-label="Neighborhood"
                    className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                  Bio & Tagline
                </label>
                <textarea
                  rows={2}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  aria-label="Bio and Tagline"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                  Favorite Activities (Grouped by Category)
                </label>
                <div className="space-y-3">
                  {ACTIVITY_GROUPS.map((grp) => (
                    <div key={grp} className="space-y-1.5">
                      <div className="text-[11px] font-extrabold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CategoryIcon category={grp} className="w-3 h-3 text-orange-600 dark:text-orange-400" />
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
                                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                  : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
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
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-extrabold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-sm transition-all"
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
