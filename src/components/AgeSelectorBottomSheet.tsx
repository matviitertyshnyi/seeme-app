'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, RotateCcw, Users } from 'lucide-react';

export interface AgePreset {
  id: string;
  label: string;
  title: string;
  description: string;
  range: [number, number];
}

export const AGE_PRESETS: AgePreset[] = [
  {
    id: '18-24',
    label: '18–24',
    title: 'Young Adults',
    description: 'College students & early twenties',
    range: [18, 24],
  },
  {
    id: '25-34',
    label: '25–34',
    title: 'Early Career',
    description: 'Mid twenties and early thirties peers',
    range: [25, 34],
  },
  {
    id: '35-44',
    label: '35–44',
    title: 'Mid Career',
    description: 'Thirties & forties community',
    range: [35, 44],
  },
  {
    id: '45+',
    label: '45+',
    title: 'Seasoned & 40s+',
    description: 'Mature crowd and veteran participants',
    range: [45, 99],
  },
];

export interface AgeSelectorBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAgeRanges: string[];
  onApply: (selectedIds: string[]) => void;
  onHaptic?: () => void;
  matchingCount?: number;
}

export function AgeSelectorBottomSheet({
  isOpen,
  onClose,
  selectedAgeRanges,
  onApply,
  onHaptic,
  matchingCount,
}: AgeSelectorBottomSheetProps) {
  const [stagedRanges, setStagedRanges] = useState<string[]>([]);
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      setStagedRanges(selectedAgeRanges.filter((id) => id !== 'all' && id !== 'Any'));

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        if (previouslyFocusedElementRef.current) {
          previouslyFocusedElementRef.current.focus?.();
        }
      };
    }
  }, [isOpen, selectedAgeRanges]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && sheetRef.current) {
        const focusableElements = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const isAllAgesSelected = stagedRanges.length === 0;

  const togglePreset = (presetId: string) => {
    onHaptic?.();
    setStagedRanges((prev) => {
      if (prev.includes(presetId)) {
        return prev.filter((id) => id !== presetId);
      } else {
        return [...prev, presetId];
      }
    });
  };

  const selectAllAges = () => {
    onHaptic?.();
    setStagedRanges([]);
  };

  const handleReset = () => {
    onHaptic?.();
    setStagedRanges([]);
  };

  const handleApply = () => {
    onApply(stagedRanges);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-selector-sheet-title"
      className="fixed inset-0 z-[600] flex flex-col justify-end"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        tabIndex={-1}
        className="relative z-[601] w-full max-w-lg mx-auto bg-stone-50 dark:bg-[#181512] text-stone-900 dark:text-stone-100 rounded-t-3xl border-t border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col focus:outline-none"
      >
        <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mb-3 shrink-0" />

        <div className="flex items-start justify-between gap-4 pb-3 border-b border-stone-200/80 dark:border-stone-800/80 shrink-0">
          <div>
            <h2
              id="age-selector-sheet-title"
              className="text-base font-bold text-stone-950 dark:text-stone-100 flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>Age Preference</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Select one or more age groups to filter your feed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close age filter sheet"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-3.5 space-y-3 overflow-y-auto flex-1 pr-0.5">
          <button
            type="button"
            onClick={selectAllAges}
            className={`w-full min-h-[50px] p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${
              isAllAgesSelected
                ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 shadow-xs dark:shadow-[0_0_14px_rgba(234,88,12,0.2)] ring-1 ring-orange-500/40'
                : 'bg-white dark:bg-[#201D1A] border-stone-200/80 dark:border-stone-800/80 hover:bg-stone-100/70 dark:hover:bg-stone-800/60'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <span>All Ages (18+)</span>
                <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
                  (Default)
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                Show meetups open to any adults 18 and older
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-3 transition-colors ${
                isAllAgesSelected
                  ? 'bg-orange-600 text-white shadow-[0_0_8px_rgba(234,88,12,0.4)]'
                  : 'border-2 border-stone-300 dark:border-stone-600'
              }`}
            >
              {isAllAgesSelected && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AGE_PRESETS.map((preset) => {
              const isSelected = stagedRanges.includes(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => togglePreset(preset.id)}
                  aria-pressed={isSelected}
                  className={`min-h-[54px] p-3 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${
                    isSelected
                      ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 text-orange-950 dark:text-orange-100 shadow-xs dark:shadow-[0_0_12px_rgba(249,115,22,0.22)] ring-1 ring-orange-500/50'
                      : 'bg-white dark:bg-[#201D1A] border-stone-200/80 dark:border-stone-800/80 hover:bg-stone-100/70 dark:hover:bg-stone-800/60 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span className="text-orange-600 dark:text-orange-400 font-extrabold tracking-tight">
                        {preset.label}
                      </span>
                      <span className="text-stone-700 dark:text-stone-300 font-semibold">
                        {preset.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                      {preset.description}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-orange-600 text-white shadow-[0_0_8px_rgba(234,88,12,0.4)]'
                        : 'border-2 border-stone-300 dark:border-stone-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800/80 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition active:scale-95 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="min-h-[44px] flex-1 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.98] text-white text-xs font-bold shadow-[0_2px_14px_rgba(234,88,12,0.38)] border border-orange-400/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
          >
            {stagedRanges.length === 0
              ? 'Show All Meetups'
              : `Apply Filters (${stagedRanges.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
