'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Edit3,
  Star,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Users,
  RotateCcw,
  UserCheck,
  LogOut,
  MapPin,
  Copy,
  Check,
} from 'lucide-react';
import { OpenDoorLogo } from '@/components/OpenDoorLogo';
import { UserPersona } from '@/types/lobby';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  getTranslation,
} from '@/lib/i18n';
import { GoogleIcon, AppleIcon } from '@/components/AuthProfileModal';
import { getUserTag } from '@/lib/user-handle';

export interface ProfileViewProps {
  isSignedOut: boolean;
  activeUser: UserPersona;
  personas: UserPersona[];
  isDarkMode: boolean;
  currentLang: SupportedLanguage;
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  onSwitchUser: (userId: string) => void;
  onOpenAuthModal: () => void;
  onOpenEditProfile: () => void;
  onToggleDarkMode: (isDark: boolean) => void;
  onOpenLanguageSheet: () => void;
  onOpenPoliciesModal: () => void;
  onResetDemoData: () => void;
  onSignOut: () => void;
  onToggleBeacon?: () => void;
  onOpenCitySelector?: () => void;
  onOpenLightbox?: (url: string, name: string) => void;
  onOpenFriendsDrawer?: () => void;
}

export function ProfileView({
  isSignedOut,
  activeUser,
  personas,
  isDarkMode,
  currentLang,
  onGoogleSignIn,
  onAppleSignIn,
  onSwitchUser,
  onOpenAuthModal,
  onOpenEditProfile,
  onToggleDarkMode,
  onOpenLanguageSheet,
  onOpenPoliciesModal,
  onResetDemoData,
  onSignOut,
  onToggleBeacon,
  onOpenCitySelector,
  onOpenLightbox,
  onOpenFriendsDrawer,
}: ProfileViewProps) {
  const t = (key: any, params?: any) => getTranslation(currentLang, key, params);
  const [copiedTag, setCopiedTag] = useState(false);

  const handleCopyTag = async () => {
    try {
      await navigator.clipboard.writeText(getUserTag(activeUser));
      setCopiedTag(true);
      setTimeout(() => setCopiedTag(false), 2000);
    } catch {
      setCopiedTag(true);
      setTimeout(() => setCopiedTag(false), 2000);
    }
  };

  const isRealUser = Boolean(
    activeUser.authProvider === 'google' ||
      activeUser.authProvider === 'apple' ||
      activeUser.id.startsWith('user-google-') ||
      activeUser.id.startsWith('user-apple-') ||
      activeUser.id.startsWith('user-g-') ||
      activeUser.id.startsWith('user-a-')
  );

  return (
    <div className="space-y-5">
      {isSignedOut ? (
        <div className="bg-white dark:bg-[#1C1917] rounded-[26px] p-8 text-center border border-stone-200 dark:border-stone-800 shadow-ambient space-y-4 max-w-md mx-auto mt-6">
          <div className="flex justify-center">
            <OpenDoorLogo className="w-14 h-14 drop-shadow-sm" size={56} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-stone-950 dark:text-white">
              Sign In to Leave The Room
            </h1>
            <p className="text-xs font-medium text-stone-600 dark:text-stone-300 mt-1">
              Sign in to your account to join meetups, check in, and chat with
              players nearby.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="min-h-[48px] w-full rounded-2xl bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
            >
              <GoogleIcon className="w-5 h-5 shrink-0" />
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={onAppleSignIn}
              className="min-h-[48px] w-full rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
            >
              <AppleIcon className="w-5 h-5 shrink-0" />
              <span>Continue with Apple</span>
            </button>

            <button
              type="button"
              onClick={onOpenAuthModal}
              className="min-h-[44px] w-full py-3 rounded-full bg-stone-900 hover:bg-black dark:bg-white text-white dark:text-stone-900 text-xs font-extrabold shadow-sm transition-all"
            >
              More Sign In Options
            </button>
          </div>
        </div>
      ) : (
        /* Logged-In Profile Screen */
        <>
          <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-5 border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_6px_20px_-4px_rgba(0,0,0,0.5)] space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenLightbox?.(activeUser.avatar, activeUser.name)}
                  title="Click to view full-screen photo"
                  className="relative shrink-0 rounded-full group focus:outline-none cursor-pointer"
                >
                  <img
                    src={activeUser.avatar}
                    alt={activeUser.name}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-orange-500 group-hover:ring-4 group-hover:ring-orange-400/50 shadow-[0_0_16px_rgba(234,88,12,0.3)] transition-all"
                  />
                  {Boolean(activeUser.photoVerified) && (
                    <span
                      title="Verified Member"
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-stone-900"
                    >
                      <ShieldCheck className="w-3 h-3" />
                    </span>
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-bold text-stone-950 dark:text-stone-100 flex items-center gap-1.5 flex-wrap">
                      <span>{activeUser.name}, {activeUser.age}</span>
                      <button
                        type="button"
                        onClick={handleCopyTag}
                        title="Click to copy your ID tag"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-mono text-xs font-semibold transition-colors cursor-pointer border border-stone-200/80 dark:border-stone-700/80"
                      >
                        {copiedTag ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[11px] font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <span>{getUserTag(activeUser)}</span>
                            <Copy className="w-3 h-3 text-stone-400" />
                          </>
                        )}
                      </button>
                      {Boolean(activeUser.photoVerified) && (
                        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" aria-label="Verified Human Photo" />
                      )}
                    </h1>
                  </div>

                  <div className="mt-0.5">
                    <button
                      type="button"
                      onClick={onOpenCitySelector}
                      className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1 group cursor-pointer"
                      title="Tap to change your city"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{activeUser.neighborhood || 'Select your city'}</span>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal group-hover:text-stone-300">
                        · Change
                      </span>
                    </button>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-1.5 leading-relaxed">
                    {activeUser.tagline}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-700/60"
                >
                  <Edit3 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-stone-800 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-orange-500/30 transition-all">
                <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                  {activeUser.reliabilityScore}%
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Show-Up Rate
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-stone-800 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-orange-500/30 transition-all">
                <div className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  {activeUser.ratingAvg}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Rating ({activeUser.ratingCount})
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-stone-800 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-orange-500/30 transition-all">
                <div className="text-base font-bold text-orange-600 dark:text-orange-400 drop-shadow-[0_0_8px_rgba(234,88,12,0.25)]">
                  {activeUser.meetupsAttended}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Meetups Joined
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-stone-800 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-orange-500/30 transition-all">
                <div className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {activeUser.hoursPlayed}h
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                  Hours Played
                </div>
              </div>
            </div>
          </section>

          {/* Unified Settings Section Card */}
          <section className="bg-white dark:bg-[#1C1917] rounded-2xl border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_6px_20px_-4px_rgba(0,0,0,0.5)] divide-y divide-stone-100 dark:divide-stone-800/80 overflow-hidden">
            {/* Row 1: Friends & People Search */}
            <button
              type="button"
              onClick={onOpenFriendsDrawer}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Friends & Direct Messages
                    </h2>
                    {Boolean(((activeUser as any).incomingFriendRequestIds?.length || 0) > 0) && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white animate-pulse">
                        {(activeUser as any).incomingFriendRequestIds.length} new
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                    Search by Name or #ID · Chat 1-on-1
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold text-xs shrink-0 group-hover:translate-x-0.5 transition-transform">
                <span>Open</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {/* Row 2: Appearance & Theme */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center shrink-0">
                  {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Appearance
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {isDarkMode ? 'Dark warm stone' : 'Light'}
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleDarkMode(false)}
                  className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-all ${
                    !isDarkMode
                      ? 'bg-white text-stone-950 shadow-2xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleDarkMode(true)}
                  className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-all ${
                    isDarkMode
                      ? 'bg-orange-600 text-white shadow-2xs'
                      : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {/* Row 3: Language */}
            <button
              type="button"
              onClick={onOpenLanguageSheet}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                  {currentLang.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Language
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                    {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.nativeName}{' '}
                    <span className="text-stone-400">
                      ({SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.name})
                    </span>
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-colors shrink-0" />
            </button>

            {/* Row 4: Community Policies & Safety */}
            <button
              type="button"
              onClick={onOpenPoliciesModal}
              className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Community Policies & Safety
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                    Rules & zero-tolerance flaking policy
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-colors shrink-0" />
            </button>

            {/* Row 5: Account & Sign Out */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Account
                    </h2>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                      Signed in as {activeUser.email || activeUser.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onSignOut}
                  className="min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Compact Demo Switcher & Reset for demo mode */}
              {!isRealUser && personas.length > 1 && (
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                      Demo Personas
                    </span>
                    <button
                      type="button"
                      onClick={onResetDemoData}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Demo</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {personas
                      .filter(
                        (p) => !p.name.includes('Adversarial') && !p.name.includes('Auditor')
                      )
                      .map((persona) => {
                        const isSelected = persona.id === activeUser.id;
                        return (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() => onSwitchUser(persona.id)}
                            className={`p-1.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500 text-orange-950 dark:text-orange-200'
                                : 'bg-stone-50/70 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800 border-stone-200/80 dark:border-stone-700/60 text-stone-800 dark:text-stone-300'
                            }`}
                          >
                            <img
                              src={persona.avatar}
                              alt={persona.name}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                            <span className="text-xs font-semibold truncate flex-1">
                              {persona.name.split(' ')[0]}
                            </span>
                            {isSelected && (
                              <UserCheck className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Bar */}
            <div className="p-3.5 bg-stone-50/70 dark:bg-stone-900/50 flex items-center justify-center gap-3 text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex-wrap">
              <a href="/privacy" className="hover:text-orange-500 transition-colors">
                Privacy Policy
              </a>
              <span>·</span>
              <a href="/terms" className="hover:text-orange-500 transition-colors">
                Terms of Service
              </a>
              <span>·</span>
              <a
                href="mailto:contact@leavetheroom.tech"
                className="hover:text-orange-500 transition-colors"
              >
                contact@leavetheroom.tech
              </a>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default ProfileView;
