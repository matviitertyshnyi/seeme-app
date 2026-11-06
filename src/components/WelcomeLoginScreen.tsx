'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  MapPin,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { GoogleIcon, AppleIcon } from '@/components/AuthProfileModal';
import { OpenDoorLogo } from '@/components/OpenDoorLogo';

interface WelcomeLoginScreenProps {
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
}

export function WelcomeLoginScreen({
  onGoogleSignIn,
  onAppleSignIn,
}: WelcomeLoginScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProvider, setActiveProvider] = useState<'google' | 'apple' | null>(null);
  const [errorMsg, setErrorMsg] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('auth_error') || params.get('oauth_error') || '';
      if (raw.toLowerCase().includes('apple')) {
        return 'Apple Sign-In is currently in review. Please use Continue with Google for instant access.';
      }
      return raw;
    }
    return '';
  });

  const handleGoogle = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActiveProvider('google');
    setErrorMsg('');
    try {
      await onGoogleSignIn();
    } catch {
      setErrorMsg('Google Sign-In failed. Please try again.');
    } finally {
      setIsSubmitting(false);
      setActiveProvider(null);
    }
  };

  const handleApple = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActiveProvider('apple');
    setErrorMsg('');
    try {
      if (
        typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        setErrorMsg(
          'Apple Sign-In is currently in review. Please use Continue with Google for instant access.'
        );
        return;
      }
      await onAppleSignIn();
    } catch {
      setErrorMsg(
        'Apple Sign-In is currently in review. Please use Continue with Google for instant access.'
      );
    } finally {
      setIsSubmitting(false);
      setActiveProvider(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4 sm:p-6 transition-colors duration-200">
      <main className="max-w-md w-full my-auto">
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-border dark:border-border-dark shadow-ambient space-y-6">
          {/* Centered Brand Header: Logo + Clean Title (Strictly NO BADGES) */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <OpenDoorLogo className="w-16 h-16 drop-shadow-sm" size={64} />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-950 dark:text-white">
                Leave The Room
              </h1>
              <p className="text-xs sm:text-sm font-medium text-ink-muted dark:text-ink-muted-dark max-w-xs mx-auto leading-relaxed">
                Step outside. Connect for spontaneous in-person sports, games, and real-world meetups with verified nearby people.
              </p>
            </div>
          </div>

          {/* Social Auth Providers (Google & Apple Only: No Guest Mode) */}
          <div className="space-y-3 pt-2">
            {/* Google Sign-In */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogle}
              className="w-full min-h-[50px] flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-stone-800 border-2 border-border dark:border-border-dark hover:border-brand dark:hover:border-brand-accent text-stone-900 dark:text-white font-extrabold text-sm shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <GoogleIcon className="w-5 h-5 flex-shrink-0" />
              <span>
                {isSubmitting && activeProvider === 'google'
                  ? 'Connecting with Google...'
                  : 'Continue with Google'}
              </span>
            </button>

            {/* Apple Sign-In */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleApple}
              className="w-full min-h-[50px] flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 font-extrabold text-sm shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <AppleIcon className="w-5 h-5 flex-shrink-0" />
              <span>
                {isSubmitting && activeProvider === 'apple'
                  ? 'Connecting with Apple...'
                  : 'Continue with Apple'}
              </span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Safe & Verified Notice */}
          <div className="pt-2 border-t border-border dark:border-border-dark">
            <div className="flex items-center gap-2 text-[11px] font-bold text-ink-muted dark:text-ink-muted-dark">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Instant sign-in with your Google or Apple account. No separate password needed.</span>
            </div>
          </div>
        </div>

        {/* Verification Footnote */}
        <footer className="text-center pt-5 space-y-3">
          <div className="flex items-center justify-center gap-4 text-xs font-bold text-ink-muted dark:text-ink-muted-dark">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Verified Member Profiles
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand dark:text-brand-accent" />
              Real-World Meetups
            </span>
          </div>

          {/* Legal Links for OAuth Compliance & Reviewers */}
          <div className="flex items-center justify-center gap-3 text-[11px] font-medium text-ink-muted dark:text-ink-muted-dark">
            <Link
              href="/privacy"
              className="hover:underline hover:text-ink dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <span>•</span>
            <Link
              href="/terms"
              className="hover:underline hover:text-ink dark:hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
