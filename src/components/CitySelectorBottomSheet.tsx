'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  MapPin,
  LocateFixed,
  Check,
  Globe2,
} from 'lucide-react';
import { CityPreset, POPULAR_CITIES, COUNTRIES, searchGlobalCities } from '@/lib/cities';

export interface CitySelectorBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocationLabel: string;
  onSelectCity: (city: { lat: number; lng: number; label: string }) => void;
  onUseCurrentGps: () => void;
  isLocating?: boolean;
}

export function CitySelectorBottomSheet({
  isOpen,
  onClose,
  currentLocationLabel,
  onSelectCity,
  onUseCurrentGps,
  isLocating = false,
}: CitySelectorBottomSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('ALL');
  const [customResults, setCustomResults] = useState<CityPreset[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Search filter
  const displayedCities = useMemo(() => {
    let cities = customResults.length > 0 ? customResults : POPULAR_CITIES;

    if (selectedCountryCode !== 'ALL') {
      if (selectedCountryCode === 'EU') {
        cities = cities.filter((c) => c.countryCode !== 'US');
      } else if (selectedCountryCode === 'US') {
        cities = cities.filter((c) => c.countryCode === 'US');
      } else {
        cities = cities.filter((c) => c.countryCode === selectedCountryCode);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      cities = cities.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          c.label.toLowerCase().includes(q)
      );
    }

    return cities;
  }, [searchQuery, selectedCountryCode, customResults]);

  if (!isOpen) return null;

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length >= 3) {
      setIsSearchingOnline(true);
      try {
        const results = await searchGlobalCities(val);
        setCustomResults(results);
      } catch {
        // keep presets
      } finally {
        setIsSearchingOnline(false);
      }
    } else {
      setCustomResults([]);
    }
  };

  const handleCityPick = (city: CityPreset) => {
    onSelectCity({
      lat: city.lat,
      lng: city.lng,
      label: city.label,
    });
    onClose();
  };

  const currentCityName = currentLocationLabel.split(',')[0].trim().toLowerCase();

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
        aria-labelledby="city-selector-title"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
        className="relative z-10 w-full max-w-lg mx-auto bg-white dark:bg-[#1C1917] rounded-t-3xl border-t border-stone-200 dark:border-stone-800 p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[88dvh] sm:max-h-[85vh]"
      >
        <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mb-4 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <div>
            <h2
              id="city-selector-title"
              className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2"
            >
              <Globe2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>Select City & Location</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Choose your city to discover local meetups and activities
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

        {/* Quick GPS Action */}
        <div className="pt-3 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onUseCurrentGps();
              onClose();
            }}
            disabled={isLocating}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <LocateFixed
              className={`w-4 h-4 ${isLocating ? 'animate-spin text-orange-600' : ''}`}
            />
            <span>{isLocating ? 'Detecting exact GPS...' : 'Use My Current GPS Location'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative pb-2 shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search city or country... (e.g. Kyiv, Warsaw, Berlin)"
            className="w-full min-h-[40px] pl-9 pr-8 py-2 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCustomResults([]);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Country Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedCountryCode('ALL')}
            className={`min-h-[28px] px-3 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 ${
              selectedCountryCode === 'ALL'
                ? 'bg-orange-600 text-white shadow-2xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            All Countries
          </button>
          {COUNTRIES.map((ct) => (
            <button
              key={ct.code}
              type="button"
              onClick={() => setSelectedCountryCode(ct.code)}
              className={`min-h-[28px] px-3 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 ${
                selectedCountryCode === ct.code
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              {ct.name}
            </button>
          ))}
        </div>

        {/* City List */}
        <div className="py-2 space-y-1.5 overflow-y-auto flex-1 min-h-[200px]">
          {isSearchingOnline && (
            <div className="py-4 text-center text-xs text-stone-400 animate-pulse">
              Searching global cities...
            </div>
          )}

          {displayedCities.length === 0 && !isSearchingOnline ? (
            <div className="py-8 text-center text-xs text-stone-400">
              No matching cities found. Try searching by city name.
            </div>
          ) : (
            displayedCities.map((city) => {
              const isSelected =
                currentCityName === city.name.toLowerCase() ||
                currentLocationLabel.toLowerCase().includes(city.name.toLowerCase());

              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleCityPick(city)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/40 shadow-xs'
                      : 'bg-stone-50/80 dark:bg-stone-900/60 border-stone-200/80 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-orange-600 text-white'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {city.flag}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                        {city.name}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span>{city.country}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 pl-2">
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-stone-400">Select</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
