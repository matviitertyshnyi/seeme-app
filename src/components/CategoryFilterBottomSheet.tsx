'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';

export interface CategoryFilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBroadCategory: string;
  onSelectCategory: (categoryName: string) => void;
  categoryCounts: Record<string, number>;
  currentLang?: SupportedLanguage;
}

const CATEGORIES = [
  'All Categories',
  'Sports & Fitness',
  'Gaming & Strategy',
  'Social & Hangout',
  'Co-Working',
] as const;

export function CategoryFilterBottomSheet({
  isOpen,
  onClose,
  selectedBroadCategory,
  onSelectCategory,
  categoryCounts,
  currentLang = 'en',
}: CategoryFilterBottomSheetProps) {
  if (!isOpen) return null;

  const t = (key: any, params?: any) => getTranslation(currentLang, key, params);

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
        aria-labelledby="category-filter-title"
        className="relative z-10 w-full max-w-lg mx-auto bg-white dark:bg-[#1C1917] rounded-t-3xl border-t border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[80vh]"
      >
        <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mb-4 shrink-0" />

        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div>
            <h2
              id="category-filter-title"
              className="text-base font-bold text-stone-900 dark:text-stone-100"
            >
              {t('activity_type') || 'Activity Type'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Filter meetups by category
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
          {CATEGORIES.map((catName) => {
            const isSelected = selectedBroadCategory === catName;
            const catLabel =
              catName === 'All Categories'
                ? t('all_activities') || 'All Meetups'
                : catName;
            const count = categoryCounts[catName] || 0;
            return (
              <button
                key={catName}
                type="button"
                onClick={() => {
                  onSelectCategory(catName);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/40'
                    : 'bg-stone-50/80 dark:bg-stone-900/60 border-stone-200/80 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-orange-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    <CategoryIcon
                      category={
                        catName === 'All Categories' ? 'All Rooms' : catName
                      }
                      className="w-4 h-4"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {catLabel}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      {count} {count === 1 ? 'meetup available' : 'meetups available'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isSelected
                        ? 'bg-orange-600 text-white'
                        : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {count}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-orange-600 dark:text-orange-400 stroke-[3]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CategoryFilterBottomSheet;
