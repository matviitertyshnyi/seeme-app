'use client';

import React from 'react';
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
} from 'lucide-react';
import { OpenDoorLogo } from '@/components/OpenDoorLogo';
import { UserPersona } from '@/types/lobby';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  getTranslation,
} from '@/lib/i18n';
import { GoogleIcon, AppleIcon } from '@/components/AuthProfileModal';

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
              onClick={() => onSwitchUser(activeUser.id)}
              className="min-h-[44px] w-full py-3 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              Continue as {activeUser.name}
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
                  {activeUser.verified && (
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
                    <h1 className="text-lg font-bold text-stone-950 dark:text-stone-100 flex items-center gap-1.5">
                      <span>{activeUser.name}, {activeUser.age}</span>
                      <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" aria-label="Verified" />
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

          {/* Friends & Direct Messages Card */}
          <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-4 border border-stone-200/90 dark:border-stone-800/90 shadow-2xs hover:border-orange-500/40 transition-colors">
            <button
              type="button"
              onClick={onOpenFriendsDrawer}
              className="w-full flex items-center justify-between text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                      Friends & Direct Messages
                    </h2>
                    {Boolean(((activeUser as any).incomingFriendRequestIds?.length || 0) > 0) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white animate-pulse">
                        {(activeUser as any).incomingFriendRequestIds.length} new
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                    {((activeUser as any).friendIds?.length || 0) === 1
                      ? '1 Friend connected · Chat 1-on-1'
                      : `${(activeUser as any).friendIds?.length || 0} Friends connected · Chat 1-on-1`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold text-xs shrink-0 group-hover:translate-x-0.5 transition-transform">
                <span>Open</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </section>

          {/* Dark Mode & Appearance Toggle Card */}
          <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-4 border border-stone-200/90 dark:border-stone-800/90 shadow-2xs">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center shrink-0">
                  {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Appearance & Theme
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {isDarkMode ? 'Dark warm stone palette' : 'Warm cream light mode'}
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleDarkMode(false)}
                  className={`min-h-[32px] px-3 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-all ${
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
                  className={`min-h-[32px] px-3 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-all ${
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
          </section>

          {/* Language Picker */}
          <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-4 border border-stone-200 dark:border-stone-800/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                Language / Мова / Język / Sprache / Langue
              </h2>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">
                {currentLang.toUpperCase()}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenLanguageSheet}
              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700/80 text-stone-900 dark:text-stone-100 text-xs font-semibold flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400">
                  {currentLang.toUpperCase()}
                </span>
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.nativeName}
                </span>
                <span className="text-stone-400 font-normal">
                  ({SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.name})
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-stone-400" />
            </button>
          </section>

          {/* Community Policies Trigger */}
          <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-4 border border-stone-200 dark:border-stone-800/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                {t('community_policies') || 'Community Policies & Safety Guidelines'}
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Review community standards, zero-tolerance flaking rules, and in-person verification standards.
            </p>
            <button
              type="button"
              onClick={onOpenPoliciesModal}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/70 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 text-xs font-bold border border-stone-200 dark:border-stone-700/80 transition flex items-center justify-between group active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{t('community_policies') || 'Community Policies & Safety Guidelines'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-200 transition-colors" />
            </button>
            <div className="flex items-center gap-4 pt-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
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

          {/* Switch Active Demo Account (Only shown in demo mode, hidden for real logged-in users) */}
          {!isRealUser ? (
            <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-4 border border-stone-200 dark:border-stone-800/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    Switch Active Demo Account
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onResetDemoData}
                  className="min-h-[32px] px-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        className={`min-h-[48px] p-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500'
                            : 'bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={persona.avatar}
                            alt={persona.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-stone-950 dark:text-stone-100 truncate">
                              {persona.name}, {persona.age}
                            </div>
                            <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                              {persona.skillBadge}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <UserCheck className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onSignOut}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </section>
          ) : (
            /* Real Authenticated User Account Actions */
            <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-4 border border-stone-200 dark:border-stone-800/90 shadow-2xs flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Signed In
                </h2>
                <p className="text-xs font-medium text-stone-800 dark:text-stone-200 mt-0.5 truncate">
                  {activeUser.email || activeUser.name}
                </p>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default ProfileView;
