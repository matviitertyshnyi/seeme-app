'use client';

import React from 'react';
import { Search, X, ChevronDown, SearchX, Plus } from 'lucide-react';
import { LobbyWithDistance, RoomStatus, UserPersona } from '@/types/lobby';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';
import { LobbyCard } from '@/components/LobbyCard';
import { AGE_PRESETS } from '@/components/AgeSelectorBottomSheet';

export interface ExploreViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  selectedBroadCategory: string;
  categoryCounts: Record<string, number>;
  totalLobbiesCount: number;
  onOpenCategorySheet: () => void;
  userLocationLabel: string;
  onNearMeGps: () => void;
  radiusKm: number;
  formatRadiusUnit: (km: number) => string;
  onOpenRadiusSheet: () => void;
  selectedAgeFilters: string[];
  onOpenAgeSheet: () => void;
  statusFilter: 'ALL' | RoomStatus;
  onToggleStatusFilter: () => void;
  filteredLobbiesCount: number;
  availableToJoinLobbies: LobbyWithDistance[];
  joinedFilteredLobbies: LobbyWithDistance[];
  activeUser: UserPersona;
  onSelectLobby: (lobbyId: string) => void;
  onQuickJoin: (lobby: LobbyWithDistance, e: React.MouseEvent) => void;
  joiningLobbyId: string | null;
  currentLang: SupportedLanguage;
  onOpenHostModal: () => void;
  onResetFilters: () => void;
}

export function ExploreView({
  searchQuery,
  onSearchChange,
  onClearSearch,
  selectedBroadCategory,
  categoryCounts,
  totalLobbiesCount,
  onOpenCategorySheet,
  userLocationLabel,
  onNearMeGps,
  radiusKm,
  formatRadiusUnit,
  onOpenRadiusSheet,
  selectedAgeFilters,
  onOpenAgeSheet,
  statusFilter,
  onToggleStatusFilter,
  filteredLobbiesCount,
  availableToJoinLobbies,
  joinedFilteredLobbies,
  activeUser,
  onSelectLobby,
  onQuickJoin,
  joiningLobbyId,
  currentLang,
  onOpenHostModal,
  onResetFilters,
}: ExploreViewProps) {
  const t = (key: any, params?: any) => getTranslation(currentLang, key, params);
  const locationName = userLocationLabel.split(',')[0];

  return (
    <div className="space-y-4">
      <section
        aria-label="Meetup Discovery Filters"
        className="bg-white dark:bg-[#1C1917] rounded-2xl p-3 sm:p-3.5 border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_20px_-4px_rgba(0,0,0,0.5)] space-y-2.5"
      >
        {/* Row 1: Search Bar (Left) + Activity Type Filter (Right) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('search_placeholder') || 'Search meetups, sports, games...'}
              className="w-full min-h-[40px] pl-9 pr-8 py-2 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenCategorySheet}
            aria-label="Filter by activity type"
            className="min-h-[40px] px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700/80 text-stone-800 dark:text-stone-200 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
          >
            <span className="truncate max-w-[110px] sm:max-w-none">
              {selectedBroadCategory === 'All Categories'
                ? t('all_activities') || 'All Meetups'
                : selectedBroadCategory}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-orange-500/20 text-orange-600 dark:text-orange-400">
              {categoryCounts[selectedBroadCategory] ?? totalLobbiesCount}
            </span>
            <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
          </button>
        </div>

        {/* Subrow: Location & Radius | Age Selector | Live Now */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 text-xs text-stone-500 dark:text-stone-400 pt-1.5 border-t border-stone-100 dark:border-stone-800/80 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onNearMeGps}
              className="font-semibold text-stone-800 dark:text-stone-200 hover:text-orange-600 transition-colors inline-flex items-center gap-1.5 text-xs shrink-0"
              title="Tap to update current location"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate max-w-[125px] sm:max-w-none">{locationName}</span>
            </button>
            <span className="text-stone-300 dark:text-stone-700 shrink-0">·</span>
            <button
              type="button"
              onClick={onOpenRadiusSheet}
              className="min-h-[28px] inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors text-xs shrink-0 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
            >
              <span>{formatRadiusUnit(radiusKm)}</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenAgeSheet}
              className={`min-h-[28px] inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                selectedAgeFilters.length > 0
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/40 shadow-2xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-transparent dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
              }`}
            >
              <span className="text-stone-400 text-[11px] font-normal">
                {currentLang === 'uk' ? 'Вік:' : 'Age:'}
              </span>
              <span>
                {selectedAgeFilters.length === 0
                  ? (currentLang === 'uk' ? 'Всі' : 'All ages')
                  : selectedAgeFilters.length === 1
                  ? AGE_PRESETS.find((p) => p.id === selectedAgeFilters[0])?.label ||
                    selectedAgeFilters[0]
                  : `${selectedAgeFilters.length} selected`}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            <button
              type="button"
              onClick={onToggleStatusFilter}
              className={`min-h-[28px] px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1 shrink-0 ${
                statusFilter === 'LIVE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  statusFilter === 'LIVE' ? 'bg-white' : 'bg-emerald-500'
                }`}
              />
              <span>{currentLang === 'uk' ? 'Наживо' : 'Live now'}</span>
            </button>
          </div>
        </div>
      </section>

      {filteredLobbiesCount === 0 ? (
        <div className="bg-white dark:bg-[#1C1917] rounded-3xl p-8 text-center border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_28px_rgba(0,0,0,0.5)] max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto shadow-[0_0_16px_rgba(234,88,12,0.2)]">
            <SearchX className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-base font-bold text-stone-950 dark:text-stone-100">
              No Meetups Found Nearby
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              No active meetups matched your current filters. Expand your radius, switch
              categories, or start a meetup.
            </p>
          </div>

          <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onOpenHostModal}
              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-[0_4px_16px_rgba(234,88,12,0.4)] border border-orange-400/30 inline-flex items-center gap-1.5 transition active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Host a Meetup</span>
            </button>

            <button
              type="button"
              onClick={onResetFilters}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold border border-stone-200 dark:border-stone-700 transition active:scale-[0.98]"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* SECTION A: AVAILABLE MEETUPS TO JOIN */}
          {availableToJoinLobbies.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100">
                    {t('available_meetups') || 'Available Meetups'} (
                    {availableToJoinLobbies.length})
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {t('sorted_by_distance') || 'Sorted by distance and live status'}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                {availableToJoinLobbies.map((lobby) => (
                  <LobbyCard
                    key={lobby.id}
                    lobby={lobby}
                    activeUser={activeUser}
                    onSelectLobby={(item) => onSelectLobby(item.id)}
                    onQuickJoin={onQuickJoin}
                    isJoining={joiningLobbyId === lobby.id}
                    language={currentLang}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION B: MEETUPS YOU ARE IN */}
          {joinedFilteredLobbies.length > 0 && (
            <section className="space-y-3 pt-3 border-t border-stone-200/80 dark:border-stone-800/80">
              <div className="flex items-center justify-between px-0.5">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>
                      Meetups You Are In ({joinedFilteredLobbies.length})
                    </span>
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Tap to check in or open chat
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                {joinedFilteredLobbies.map((lobby) => (
                  <LobbyCard
                    key={lobby.id}
                    lobby={lobby}
                    activeUser={activeUser}
                    onSelectLobby={(item) => onSelectLobby(item.id)}
                    onQuickJoin={onQuickJoin}
                    isJoining={joiningLobbyId === lobby.id}
                    language={currentLang}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default ExploreView;
