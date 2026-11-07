'use client';

import React from 'react';
import { Search, X, ChevronDown, SearchX, Plus, Bookmark, ShieldCheck, Users, MapPin, Globe2, Navigation } from 'lucide-react';
import { LobbyWithDistance, RoomStatus, UserPersona } from '@/types/lobby';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';
import { LobbyCard } from '@/components/LobbyCard';
import { AGE_PRESETS } from '@/components/AgeSelectorBottomSheet';
import { getUserTag, matchesUserSearch } from '@/lib/user-handle';

export interface ExploreViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  selectedBroadCategory: string;
  selectedCategory?: string;
  categoryCounts: Record<string, number>;
  activityCounts?: Record<string, number>;
  totalLobbiesCount: number;
  onOpenCategorySheet: () => void;
  userLocationLabel: string;
  onNearMeGps: () => void;
  radiusKm: number;
  formatRadiusUnit: (km: number) => string;
  onOpenRadiusSheet: () => void;
  onSelectRadius?: (km: number) => void;
  selectedAgeFilters: string[];
  onOpenAgeSheet: () => void;
  onToggleAgeFilter?: (ageId: string) => void;
  onClearAgeFilters?: () => void;
  statusFilter: 'ALL' | RoomStatus;
  onToggleStatusFilter: () => void;
  filteredLobbiesCount: number;
  availableToJoinLobbies: LobbyWithDistance[];
  joinedFilteredLobbies: LobbyWithDistance[];
  activeUser: UserPersona;
  isSignedOut?: boolean;
  onSelectLobby: (lobbyId: string) => void;
  onQuickJoin: (lobby: LobbyWithDistance, e: React.MouseEvent) => void;
  joiningLobbyId: string | null;
  currentLang: SupportedLanguage;
  onOpenHostModal: () => void;
  onResetFilters: () => void;
  onOpenCitySelector?: () => void;
  hasChosenCity?: boolean;
  onSelectCity?: (city: { lat: number; lng: number; label: string }) => void;
  personas?: UserPersona[];
  onClickUser?: (userId: string) => void;
  onToggleBeacon?: () => void;
  savedLobbyIds?: string[];
  onToggleSaveLobby?: (lobbyId: string, e: React.MouseEvent) => void;
  showSavedOnly?: boolean;
  onToggleSavedOnly?: () => void;
}

export function ExploreView({
  searchQuery,
  onSearchChange,
  onClearSearch,
  selectedBroadCategory,
  selectedCategory = 'All',
  categoryCounts,
  activityCounts = {},
  totalLobbiesCount,
  onOpenCategorySheet,
  userLocationLabel,
  onNearMeGps,
  radiusKm,
  formatRadiusUnit,
  onOpenRadiusSheet,
  onSelectRadius,
  selectedAgeFilters,
  onOpenAgeSheet,
  onToggleAgeFilter,
  onClearAgeFilters,
  statusFilter,
  onToggleStatusFilter,
  filteredLobbiesCount,
  availableToJoinLobbies,
  joinedFilteredLobbies,
  activeUser,
  isSignedOut = false,
  onSelectLobby,
  onQuickJoin,
  joiningLobbyId,
  currentLang,
  onOpenHostModal,
  onResetFilters,
  onOpenCitySelector,
  hasChosenCity = true,
  onSelectCity,
  personas = [],
  onClickUser,
  onToggleBeacon,
  savedLobbyIds = [],
  onToggleSaveLobby,
  showSavedOnly = false,
  onToggleSavedOnly,
}: ExploreViewProps) {
  const t = (key: any, params?: any) => getTranslation(currentLang, key, params);
  const locationName = userLocationLabel.split(',')[0];

  const [openDropdown, setOpenDropdown] = React.useState<'RADIUS' | 'AGE' | null>(null);
  const radiusDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const ageDropdownRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!openDropdown) return;
    const handleDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        openDropdown === 'RADIUS' &&
        radiusDropdownRef.current &&
        !radiusDropdownRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      } else if (
        openDropdown === 'AGE' &&
        ageDropdownRef.current &&
        !ageDropdownRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openDropdown]);

  // People are ONLY shown when there's an explicit search query of at least 2 chars (and not signed out)
  const matchingPeople = React.useMemo(() => {
    if (isSignedOut) return [];
    if (searchQuery.trim().length < 2 || !personas || personas.length === 0) return [];
    return personas.filter((p) => p.id !== activeUser.id && matchesUserSearch(p, searchQuery));
  }, [isSignedOut, searchQuery, personas, activeUser.id]);

  const displayAvailable = React.useMemo(() => {
    // When signed out, all meetups are available to explore/join
    const base = isSignedOut
      ? [...availableToJoinLobbies, ...joinedFilteredLobbies]
      : availableToJoinLobbies;
    if (showSavedOnly && savedLobbyIds) {
      return base.filter((l) => savedLobbyIds.includes(l.id));
    }
    return base;
  }, [isSignedOut, showSavedOnly, savedLobbyIds, availableToJoinLobbies, joinedFilteredLobbies]);

  const displayJoined = React.useMemo(() => {
    // When signed out, visitor is not in any meetups
    if (isSignedOut) return [];
    if (showSavedOnly && savedLobbyIds) {
      return joinedFilteredLobbies.filter((l) => savedLobbyIds.includes(l.id));
    }
    return joinedFilteredLobbies;
  }, [isSignedOut, showSavedOnly, savedLobbyIds, joinedFilteredLobbies]);

  const effectiveTotalCount =
    showSavedOnly && savedLobbyIds
      ? displayAvailable.length + displayJoined.length
      : filteredLobbiesCount;

  return (
    <div className="space-y-4">
      <section
        aria-label="Meetup Discovery Filters"
        className="bg-white dark:bg-[#1C1917] rounded-2xl p-2.5 sm:p-3.5 border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_20px_-4px_rgba(0,0,0,0.5)] space-y-2.5 relative overflow-visible"
      >
        {/* Row 1: Search Bar (Left) + Activity Type Filter (Right) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search meetups, activities, or member name / #ID..."
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
            className="min-h-[40px] px-2.5 sm:px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700/80 text-stone-800 dark:text-stone-200 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] cursor-pointer"
          >
            <span className="truncate max-w-[105px] sm:max-w-none">
              {selectedCategory && selectedCategory !== 'All' && selectedCategory !== 'All Categories'
                ? selectedCategory
                : selectedBroadCategory === 'All Categories'
                ? t('all_activities') || 'All Meetups'
                : selectedBroadCategory}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200">
              {(() => {
                if (selectedCategory && selectedCategory !== 'All' && selectedCategory !== 'All Categories') {
                  return activityCounts[selectedCategory] ?? categoryCounts[selectedCategory] ?? 0;
                }
                if (selectedBroadCategory && selectedBroadCategory !== 'All Categories') {
                  return categoryCounts[selectedBroadCategory] ?? 0;
                }
                return categoryCounts['All Categories'] ?? totalLobbiesCount;
              })()}
            </span>
            <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
          </button>
        </div>

        {/* Subrow: Location & Radius | Age Selector | Live Now */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 pt-1.5 border-t border-stone-100 dark:border-stone-800/80 overflow-visible relative">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCitySelector || onNearMeGps}
              className="min-h-[26px] sm:min-h-[28px] inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200/80 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors text-[11px] sm:text-xs shrink-0 cursor-pointer shadow-2xs"
              title="Tap to select country, city or GPS location"
            >
              <MapPin className="w-3 h-3 text-orange-600 dark:text-orange-400 shrink-0" />
              <span className="truncate max-w-[95px] sm:max-w-none">{locationName}</span>
              <ChevronDown className="w-2.5 h-2.5 text-stone-400 shrink-0" />
            </button>

            {/* Inline Roll-down Radius Dropdown */}
            <div className="relative shrink-0" ref={radiusDropdownRef}>
              <button
                type="button"
                onClick={() => setOpenDropdown((prev) => (prev === 'RADIUS' ? null : 'RADIUS'))}
                className="min-h-[26px] sm:min-h-[28px] inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200/80 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors text-[11px] sm:text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                <span>{formatRadiusUnit(radiusKm)}</span>
                <ChevronDown
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-stone-400 transition-transform duration-200 ${
                    openDropdown === 'RADIUS' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'RADIUS' && (
                <div className="absolute left-0 top-full mt-1.5 w-52 z-50 bg-white dark:bg-[#1C1917] border border-stone-200 dark:border-stone-700/90 rounded-2xl shadow-xl p-1.5 space-y-0.5">
                  {[
                    { km: 2, desc: 'Walking distance' },
                    { km: 5, desc: 'Nearby neighborhood' },
                    { km: 15, desc: 'Across town' },
                    { km: 50, desc: 'Full metro area' },
                  ].map((opt) => {
                    const isSelected = radiusKm === opt.km;
                    return (
                      <button
                        key={opt.km}
                        type="button"
                        onClick={() => {
                          if (onSelectRadius) {
                            onSelectRadius(opt.km);
                          } else {
                            onOpenRadiusSheet();
                          }
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-950 dark:text-white font-semibold'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60 font-medium'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{formatRadiusUnit(opt.km)}</div>
                          <div className="text-[10px] text-stone-400 dark:text-stone-500">{opt.desc}</div>
                        </div>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-stone-900 dark:bg-white" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Inline Roll-down Age Dropdown */}
            <div className="relative shrink-0" ref={ageDropdownRef}>
              <button
                type="button"
                onClick={() => setOpenDropdown((prev) => (prev === 'AGE' ? null : 'AGE'))}
                className={`min-h-[26px] sm:min-h-[28px] inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedAgeFilters.length > 0
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-transparent dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                }`}
              >
                <span className={selectedAgeFilters.length > 0 ? 'text-stone-300 dark:text-stone-600 text-[10px] sm:text-[11px] font-normal' : 'text-stone-400 text-[10px] sm:text-[11px] font-normal'}>
                  {currentLang === 'uk' ? 'Вік:' : 'Age:'}
                </span>
                <span>
                  {selectedAgeFilters.length === 0
                    ? (currentLang === 'uk' ? 'Всі' : 'All')
                    : selectedAgeFilters.length === 1
                    ? AGE_PRESETS.find((p) => p.id === selectedAgeFilters[0])?.label ||
                      selectedAgeFilters[0]
                    : `${selectedAgeFilters.length} selected`}
                </span>
                <ChevronDown
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-stone-400 transition-transform duration-200 ${
                    openDropdown === 'AGE' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'AGE' && (
                <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-56 z-50 bg-white dark:bg-[#1C1917] border border-stone-200 dark:border-stone-700/90 rounded-2xl shadow-xl p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (onClearAgeFilters) {
                        onClearAgeFilters();
                      }
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      selectedAgeFilters.length === 0
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-950 dark:text-white font-semibold'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60 font-medium'
                    }`}
                  >
                    <span>All Ages (18+)</span>
                    {selectedAgeFilters.length === 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-900 dark:bg-white" />
                    )}
                  </button>

                  {AGE_PRESETS.map((preset) => {
                    const isChecked = selectedAgeFilters.includes(preset.id);
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (onToggleAgeFilter) {
                            onToggleAgeFilter(preset.id);
                          } else {
                            onOpenAgeSheet();
                          }
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          isChecked
                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-950 dark:text-white font-semibold'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60 font-medium'
                        }`}
                      >
                        <span className="truncate pr-2">{preset.label}</span>
                        <span
                          className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] shrink-0 ${
                            isChecked
                              ? 'bg-stone-900 border-stone-900 dark:bg-white dark:border-white text-white dark:text-stone-950 font-bold'
                              : 'border-stone-300 dark:border-stone-600'
                          }`}
                        >
                          {isChecked ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {onToggleSavedOnly && (
              <button
                type="button"
                onClick={onToggleSavedOnly}
                aria-label="Filter to saved meetups"
                className={`min-h-[26px] sm:min-h-[28px] px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-colors inline-flex items-center gap-1 shrink-0 cursor-pointer ${
                  showSavedOnly
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <Bookmark className={`w-3 h-3 ${showSavedOnly ? 'fill-current text-white dark:text-stone-950' : 'text-stone-400'}`} />
                <span>{currentLang === 'uk' ? 'Збережені' : 'Saved'}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Matching People Search Results (Only shown on explicit search >= 2 chars for signed-in users) */}
      {!isSignedOut && matchingPeople.length > 0 && (
        <section
          aria-label="Matching People"
          className="bg-white dark:bg-[#1C1917] rounded-2xl p-3 border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_20px_-4px_rgba(0,0,0,0.5)] space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 truncate">
                Matching People ({matchingPeople.length})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5">
            {matchingPeople.map((person) => {
              const idTag = getUserTag(person);
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => onClickUser?.(person.id)}
                  className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none cursor-pointer"
                  title={`${person.name} (${idTag}), ${person.age} · ${person.skillBadge || 'Member'}`}
                >
                  <div className="relative">
                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-stone-200 dark:border-stone-750 group-hover:scale-105 group-hover:border-orange-500 transition-all bg-stone-100 dark:bg-stone-800"
                    />
                    {Boolean(person.photoVerified) && (
                      <span
                        title="Verified Human Member"
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-stone-900 shadow-xs z-10"
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {person.beacon?.active && (
                      <span
                        title="Free to Meet Today"
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-stone-900 animate-pulse"
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-stone-800 dark:text-stone-200 group-hover:text-orange-500 transition-colors truncate max-w-[64px] text-center">
                    {person.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-mono text-stone-400 dark:text-stone-500 -mt-0.5">
                    {idTag}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!hasChosenCity ? (
        <div className="bg-white dark:bg-[#1C1917] rounded-3xl p-6 sm:p-8 text-center border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_28px_rgba(0,0,0,0.5)] max-w-lg mx-auto space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center justify-center mx-auto shadow-sm">
            <MapPin className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-stone-950 dark:text-stone-100">
              Choose Your City
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto leading-relaxed">
              Select your city to discover real-world meetups, sports rallies, and activities happening near you.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onNearMeGps}
              className="w-full min-h-[46px] px-5 py-3 rounded-2xl bg-stone-900 dark:bg-white hover:opacity-90 text-white dark:text-stone-950 text-xs font-bold shadow-md inline-flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-orange-500 fill-current" />
              <span>Use GPS Location</span>
            </button>

            <button
              type="button"
              onClick={onOpenCitySelector}
              className="w-full min-h-[46px] px-5 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-600/20 inline-flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <Globe2 className="w-4 h-4" />
              <span>Select City from List</span>
            </button>
          </div>

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80">
            <p className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2.5">
              Popular Cities
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { label: 'Warsaw, Poland', name: 'Warsaw', flag: '🇵🇱', lat: 52.2297, lng: 21.0122 },
                { label: 'Gdynia, Poland', name: 'Gdynia', flag: '🇵🇱', lat: 54.5189, lng: 18.5305 },
                { label: 'Gdansk, Poland', name: 'Gdansk', flag: '🇵🇱', lat: 54.3520, lng: 18.6466 },
                { label: 'Krakow, Poland', name: 'Krakow', flag: '🇵🇱', lat: 50.0647, lng: 19.9450 },
                { label: 'Berlin, Germany', name: 'Berlin', flag: '🇩🇪', lat: 52.5200, lng: 13.4050 },
                { label: 'Paris, France', name: 'Paris', flag: '🇫🇷', lat: 48.8566, lng: 2.3522 },
                { label: 'London, UK', name: 'London', flag: '🇬🇧', lat: 51.5074, lng: -0.1278 },
                { label: 'New York, USA', name: 'New York', flag: '🇺🇸', lat: 40.7128, lng: -74.0060 },
              ].map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onSelectCity?.({ lat: item.lat, lng: item.lng, label: item.label })}
                  className="min-h-[32px] px-3 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>{item.flag}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : effectiveTotalCount === 0 ? (
        <div className="bg-white dark:bg-[#1C1917] rounded-3xl p-8 text-center border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_28px_rgba(0,0,0,0.5)] max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-750 flex items-center justify-center mx-auto shadow-sm">
            <SearchX className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-base font-bold text-stone-950 dark:text-stone-100">
              {showSavedOnly ? 'No Saved Meetups' : 'No Meetups Found Nearby'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              {showSavedOnly
                ? 'You have not saved any meetups yet. Tap the bookmark icon on any meetup card to save it.'
                : 'No active meetups matched your current filters. Expand your radius, switch categories, or start a meetup.'}
            </p>
          </div>

          <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onOpenHostModal}
              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition active:scale-[0.98]"
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

            {onOpenCitySelector && (
              <button
                type="button"
                onClick={onOpenCitySelector}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold border border-stone-200 dark:border-stone-700 transition active:scale-[0.98]"
              >
                Change City
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* SECTION A: AVAILABLE MEETUPS TO JOIN */}
          {displayAvailable.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100">
                    {t('available_meetups') || 'Available Meetups'} (
                    {displayAvailable.length})
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {t('sorted_by_distance') || 'Sorted by distance and live status'}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                {displayAvailable.map((lobby) => (
                  <LobbyCard
                    key={lobby.id}
                    lobby={lobby}
                    activeUser={activeUser}
                    onSelectLobby={(item) => onSelectLobby(item.id)}
                    onQuickJoin={onQuickJoin}
                    isJoining={joiningLobbyId === lobby.id}
                    language={currentLang}
                    isSaved={savedLobbyIds?.includes(lobby.id)}
                    onToggleSave={onToggleSaveLobby}
                    onClickUser={(uid, e) => {
                      e.stopPropagation();
                      onClickUser?.(uid);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* SECTION B: MEETUPS YOU ARE IN */}
          {!isSignedOut && displayJoined.length > 0 && (
            <section className="space-y-3 pt-3 border-t border-stone-200/80 dark:border-stone-800/80">
              <div className="flex items-center justify-between px-0.5">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>
                      Meetups You Are In ({displayJoined.length})
                    </span>
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Tap to check in or see details
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                {displayJoined.map((lobby) => (
                  <LobbyCard
                    key={lobby.id}
                    lobby={lobby}
                    activeUser={activeUser}
                    onSelectLobby={(item) => onSelectLobby(item.id)}
                    onQuickJoin={onQuickJoin}
                    isJoining={joiningLobbyId === lobby.id}
                    language={currentLang}
                    isSaved={savedLobbyIds?.includes(lobby.id)}
                    onToggleSave={onToggleSaveLobby}
                    onClickUser={(uid, e) => {
                      e.stopPropagation();
                      onClickUser?.(uid);
                    }}
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
