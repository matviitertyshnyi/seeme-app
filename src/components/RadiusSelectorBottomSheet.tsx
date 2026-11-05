'use client';

import React from 'react';
import { Check, X } from 'lucide-react';

export const RADIUS_OPTIONS = [
  { value: 2, label: '2 km', desc: 'Walking distance (under 25 min walk)' },
  { value: 5, label: '5 km', desc: 'Nearby neighborhood & short cycle' },
  { value: 15, label: '15 km', desc: 'Across town & rapid transit access' },
  { value: 50, label: '50 km', desc: 'Full metropolitan area' },
];

export interface RadiusSelectorBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  radiusKm: number;
  onSelectRadius: (radius: number) => void;
  userLocationLabel?: string;
  onOpenCitySelector?: () => void;
}

export function RadiusSelectorBottomSheet({
  isOpen,
  onClose,
  radiusKm,
  onSelectRadius,
  userLocationLabel = 'Greenwich Village, NYC',
  onOpenCitySelector,
}: RadiusSelectorBottomSheetProps) {
  if (!isOpen) return null;

  const locationName = userLocationLabel.split(',')[0];

  return (
    <div className="fixed inset-0 z-[600] flex flex-col justify-end">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="radius-filter-title"
        className="relative z-10 w-full max-w-lg mx-auto bg-white dark:bg-[#1C1917] rounded-t-3xl border-t border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col"
      >
        <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mb-4 shrink-0" />

        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div>
            <h2
              id="radius-filter-title"
              className="text-base font-bold text-stone-900 dark:text-stone-100"
            >
              Distance Radius
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>How far are you willing to travel from {locationName}?</span>
              {onOpenCitySelector && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCitySelector();
                  }}
                  className="text-orange-600 dark:text-orange-400 font-bold hover:underline"
                >
                  Change City
                </button>
              )}
            </p>
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

        <div className="py-3 space-y-2 overflow-y-auto">
          {RADIUS_OPTIONS.map((opt) => {
            const isSelected = radiusKm === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelectRadius(opt.value)}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 shadow-xs ring-1 ring-orange-500/40'
                    : 'bg-stone-50/80 dark:bg-stone-900/60 border-stone-200/80 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800/80'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <span>{opt.label}</span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {opt.desc}
                  </p>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-stone-300 dark:border-stone-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-semibold shadow-xs transition"
          >
            Apply Distance
          </button>
        </div>
      </div>
    </div>
  );
}

export default RadiusSelectorBottomSheet;
