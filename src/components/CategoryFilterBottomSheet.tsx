'use client';

import React from 'react';
import { Check, X, Compass, ChevronRight } from 'lucide-react';
import { CategoryIcon, GROUPED_ACTIVITIES } from '@/components/CategoryIcon';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';

export interface CategoryFilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBroadCategory?: string;
  selectedCategory?: string;
  onSelectCategory: (categoryOrActivityName: string) => void;
  categoryCounts?: Record<string, number>;
  activityCounts?: Record<string, number>;
  currentLang?: SupportedLanguage;
}

const CATEGORY_GROUPS = [
  'Sports & Fitness',
  'Gaming & Strategy',
  'Social & Hangout',
  'Co-Working',
] as const;

export function CategoryFilterBottomSheet({
  isOpen,
  onClose,
  selectedBroadCategory = 'All Categories',
  selectedCategory = 'All',
  onSelectCategory,
  categoryCounts = {},
  activityCounts = {},
  currentLang = 'en',
}: CategoryFilterBottomSheetProps) {
  if (!isOpen) return null;

  const t = (key: any, params?: any) => getTranslation(currentLang, key, params);

  const totalCount = Object.values(categoryCounts).reduce((acc, curr) => acc + curr, 0);
  const isAllSelected =
    (!selectedCategory || selectedCategory === 'All' || selectedCategory === 'All Categories') &&
    (!selectedBroadCategory || selectedBroadCategory === 'All Categories');

  const handlePick = (item: string) => {
    onSelectCategory(item);
    onClose();
  };

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
        className="relative z-10 w-full max-w-lg mx-auto bg-white dark:bg-[#1C1917] rounded-t-3xl border-t border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[85vh]"
      >
        <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mb-3 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div>
            <h2
              id="category-filter-title"
              className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>{t('activity_type') || 'Filter by Activity'}</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Pick an activity to filter map pins and explore meetups
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="py-3 space-y-4 overflow-y-auto no-scrollbar">
          {/* Quick Option: All Activities */}
          <button
            type="button"
            onClick={() => handlePick('All')}
            className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
              isAllSelected
                ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/40'
                : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200/80 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isAllSelected
                    ? 'bg-orange-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}
              >
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {t('all_activities') || 'All Activities'}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400">
                  Show all meetups without activity filter
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isAllSelected
                    ? 'bg-orange-600 text-white'
                    : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                {totalCount}
              </span>
              {isAllSelected && (
                <Check className="w-4 h-4 text-orange-600 dark:text-orange-400 stroke-[3]" />
              )}
            </div>
          </button>

          {/* Grouped Activities Sections */}
          {CATEGORY_GROUPS.map((groupName) => {
            const isGroupSelected =
              selectedCategory === groupName ||
              (selectedCategory === 'All' && selectedBroadCategory === groupName);
            const groupCount = categoryCounts[groupName] || 0;
            const activities = GROUPED_ACTIVITIES[groupName] || [];

            return (
              <div
                key={groupName}
                className="p-3.5 rounded-2xl bg-stone-50/70 dark:bg-[#151311] border border-stone-200/70 dark:border-stone-800/80 space-y-2.5"
              >
                {/* Category Group Header & Quick Select */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handlePick(groupName)}
                    className="inline-flex items-center gap-2 text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                      <CategoryIcon category={groupName} className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {groupName}
                      </span>
                      <span className="text-[10px] text-stone-400 ml-1.5 font-medium">
                        (All {groupName.split(' ')[0]})
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePick(groupName)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isGroupSelected
                        ? 'bg-orange-600 text-white'
                        : 'bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700'
                    }`}
                  >
                    <span>{groupCount}</span>
                    <ChevronRight className="w-3 h-3 text-stone-400" />
                  </button>
                </div>

                {/* Sub-activities Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
                  {activities.map((act) => {
                    const isActSelected = selectedCategory === act;
                    const actCount = activityCounts[act] || 0;

                    return (
                      <button
                        key={act}
                        type="button"
                        onClick={() => handlePick(act)}
                        className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                          isActSelected
                            ? 'bg-orange-600 text-white border-orange-600 shadow-2xs ring-1 ring-orange-500'
                            : 'bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border-stone-200/80 dark:border-stone-700/80 text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CategoryIcon
                            category={act}
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActSelected ? 'text-white' : 'text-orange-600 dark:text-orange-400'
                            }`}
                          />
                          <span className="text-xs font-semibold truncate">{act}</span>
                        </div>

                        {actCount > 0 ? (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                              isActSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            }`}
                          >
                            {actCount}
                          </span>
                        ) : isActSelected ? (
                          <Check className="w-3.5 h-3.5 text-white shrink-0 stroke-[3]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CategoryFilterBottomSheet;
