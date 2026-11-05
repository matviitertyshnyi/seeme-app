'use client';

import React from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';

export interface CommunityPoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: SupportedLanguage;
}

export function CommunityPoliciesModal({
  isOpen,
  onClose,
  currentLang = 'en',
}: CommunityPoliciesModalProps) {
  if (!isOpen) return null;

  const t = (key: any, params?: any) => getTranslation(currentLang, key, params);

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="policies-modal-title"
        className="relative z-10 w-full max-w-lg bg-white dark:bg-[#1C1917] rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="policies-modal-title"
                className="text-base font-bold text-stone-950 dark:text-stone-100"
              >
                {t('community_policies') || 'Community Policies & Safety Guidelines'}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Standards ensuring safe, respectful in-person meetups
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4 overflow-y-auto text-xs text-stone-600 dark:text-stone-300 leading-relaxed pr-1">
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 space-y-1">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              1. Respectful & Inclusive Culture
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-xs">
              Zero tolerance for harassment, discrimination, intimidatory behavior, or hostility. Treat all participants with mutual dignity, regardless of skill level or experience.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 space-y-1">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              2. Public & Verified Meetup Spots Only
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-xs">
              All meetups occur exclusively in public, well-lit spaces: parks, public recreation facilities, verified cafes, libraries, and open courts. Private residences and secluded unverified locations are strictly prohibited.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 space-y-1">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              3. Punctuality & Anti-Flaking Policy
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-xs">
              Confirm attendance only when you genuinely intend to show up. If running late, message your group chat promptly. Repeated unexcused no-shows lower your Show-Up Reliability Score and trigger matchmaking timeouts.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 space-y-1">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              4. Real-Time Arrival Check-In
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-xs">
              Tap &quot;I&apos;m Here&quot; in the room details when you reach the meetup spot. This reassures hosts and peers, confirms your in-person presence, and activates reciprocal player rating at the end of the meetup.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 space-y-1">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              5. Reporting & Host Discretion
            </h3>
            <p className="text-stone-500 dark:text-stone-400 text-xs">
              Hosts have discretion over their meetup participants. Any player can block or report bad actors immediately via the player card. Reported violations are promptly investigated by moderation.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{t('i_understand') || 'I understand'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CommunityPoliciesModal;
