'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  MapPin,
  Check,
  Coffee,
  Compass,
} from 'lucide-react';
import { UserPersona, ActivityCategory } from '@/types/lobby';
import { GoogleIcon } from '@/components/AuthProfileModal';
import { CategoryIcon } from '@/components/CategoryIcon';

interface WelcomeLoginScreenProps {
  personas: UserPersona[];
  onGoogleSignIn: () => Promise<void>;
  onSelectPersona: (persona: UserPersona) => void;
  onCreateProfile: (profile: {
    name: string;
    email?: string;
    favoriteActivities: ActivityCategory[];
  }) => Promise<void>;
  onContinueAsGuest: () => void;
}

const POPULAR_ACTIVITIES: ActivityCategory[] = [
  'Ping Pong',
  'Chess',
  'Tennis',
  'Coffee',
  'Run Club',
  'Co-work',
];

export function WelcomeLoginScreen({
  personas,
  onGoogleSignIn,
  onSelectPersona,
  onCreateProfile,
  onContinueAsGuest,
}: WelcomeLoginScreenProps) {
  const [mode, setMode] = useState<'INITIAL' | 'QUICK_SIGNUP'>('INITIAL');
  const [nameInput, setNameInput] = useState('');
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

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMsg('Please enter your name or nickname');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await onCreateProfile({
        name: nameInput.trim(),
        favoriteActivities: selectedActivities,
      });
    } catch {
      setErrorMsg('Could not create profile. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Bar Branding */}
      <div className="flex items-center justify-between max-w-md w-full mx-auto pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black text-lg tracking-tight shadow-sm">
            S
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">SeeMe</span>
            <span className="ml-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded-full">
              IRL
            </span>
          </div>
        </div>

        <button
          onClick={onContinueAsGuest}
          className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-colors flex items-center gap-1"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Browse first</span>
        </button>
      </div>

      {/* Main Hero Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm">
          {mode === 'INITIAL' ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Spontaneous IRL Meetups
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Meet real people around you right now.
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Drop into ping pong, chess, running, coffee, or co-working in your neighborhood. No scheduling weeks ahead.
                </p>
              </div>

              {/* Primary 1-Tap Google Login */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsSubmitting(true);
                    await onGoogleSignIn();
                    setIsSubmitting(false);
                  }}
                  disabled={isSubmitting}
                  className="w-full min-h-[50px] flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-100 font-semibold text-sm shadow-sm hover:shadow transition-all active:scale-[0.99] disabled:opacity-60"
                >
                  <GoogleIcon className="w-5 h-5 flex-shrink-0" />
                  <span>{isSubmitting ? 'Signing in...' : 'Continue with Google'}</span>
                </button>

                <div className="relative flex items-center justify-center my-3">
                  <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                  <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    or
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setMode('QUICK_SIGNUP')}
                  className="w-full min-h-[46px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.99]"
                >
                  <User className="w-4 h-4" />
                  <span>Create quick profile</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Demo Account Fast-Switch for Quick Review */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5 text-center">
                  Or test drive with a demo persona:
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {personas.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectPersona(p)}
                      className="flex flex-col items-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-center group"
                    >
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-indigo-500 transition-all"
                      />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-1 truncate max-w-[65px]">
                        {p.name.split(' ')[0]}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate max-w-[65px]">
                        {p.skillBadge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Quick Profile Form */
            <form onSubmit={handleQuickCreate} className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Join SeeMe in 30 seconds
                </h2>
                <button
                  type="button"
                  onClick={() => setMode('INITIAL')}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  Back
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  What should people call you?
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Liam, Sarah, Max"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pick activities you're down for:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_ACTIVITIES.map((act) => {
                    const isSelected = selectedActivities.includes(act);
                    return (
                      <button
                        type="button"
                        key={act}
                        onClick={() => toggleActivity(act)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-left transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <CategoryIcon category={act} className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{act}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !nameInput.trim()}
                  className="w-full min-h-[46px] rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.99] disabled:opacity-50"
                >
                  {isSubmitting ? 'Setting up profile...' : 'Enter SeeMe'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Trust & Reliability Footer */}
      <div className="max-w-md w-full mx-auto text-center space-y-2 pb-2">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Reliability Score tracked
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            Exact spots & clues
          </span>
        </div>
      </div>
    </div>
  );
}
