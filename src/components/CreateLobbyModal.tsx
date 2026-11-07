'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  X,
  MapPin,
  Clock,
  Users,
  Zap,
  ShieldCheck,
  Navigation,
  UserPlus,
  Award,
  ChevronDown,
  Calendar,
  Check,
} from 'lucide-react';
import { OpenDoorLogo } from '@/components/OpenDoorLogo';
import { getDefaultCoverForCategory, VIBEY_BACKGROUNDS, formatCleanAddress } from '@/lib/geo';

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] sm:h-[420px] rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse flex items-center justify-center text-xs text-stone-500 font-semibold">
      Loading interactive spot picker...
    </div>
  ),
});
import {
  ActivityCategory,
  ActivityGroup,
  JoinMode,
  Lobby,
  Participant,
  SkillCompatibility,
  StartTimeOption,
  UserPersona,
} from '@/types/lobby';
import {
  ACTIVITY_GROUPS,
  GROUPED_ACTIVITIES,
  getActivityGroup,
  CategoryIcon,
} from '@/components/CategoryIcon';
import { SeatBubbles } from '@/components/SeatBubbles';

interface CreateLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserPersona;
  personas?: UserPersona[];
  initialCategory?: ActivityCategory;
  initialStartTime?: StartTimeOption;
  initialCoHost?: UserPersona | null;
  userLat: number;
  userLng: number;
  onCreated: (newLobby: Lobby) => void;
}

const PLAYER_CAPS = [2, 3, 4, 5, 6, 8];

const SKILL_COMPAT_OPTIONS: { value: SkillCompatibility; label: string }[] = [
  { value: 'ALL_LEVELS', label: 'All Levels' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'COMPETITIVE', label: 'Competitive' },
];

function formatExactTime(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [h, min] = timeStr.split(':').map(Number);
    const target = new Date(y, m - 1, d, h, min);
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);

    const isToday =
      target.getDate() === now.getDate() &&
      target.getMonth() === now.getMonth() &&
      target.getFullYear() === now.getFullYear();

    const isTomorrow =
      target.getDate() === tomorrow.getDate() &&
      target.getMonth() === tomorrow.getMonth() &&
      target.getFullYear() === tomorrow.getFullYear();

    const timePart = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    if (isToday) return `Today at ${timePart}`;
    if (isTomorrow) return `Tomorrow at ${timePart}`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[target.getMonth()]} ${target.getDate()} at ${timePart}`;
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

function getDayNameFromDateStr(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dateObj.getDay()] || 'Friday';
  } catch {
    return 'Friday';
  }
}

export function CreateLobbyModal({
  isOpen,
  onClose,
  activeUser,
  personas = [],
  initialCategory,
  initialStartTime,
  initialCoHost = null,
  userLat,
  userLng,
  onCreated,
}: CreateLobbyModalProps) {
  const initialCat = initialCategory || 'Coffee';
  const [category, setCategory] = useState<ActivityCategory>(initialCat);
  const [selectedCoverImage, setSelectedCoverImage] = useState<string>(() =>
    getDefaultCoverForCategory(initialCat)
  );
  const [selectedGroup, setSelectedGroup] = useState<ActivityGroup>(
    getActivityGroup(initialCat)
  );
  const [isCustomActivity, setIsCustomActivity] = useState(false);
  const [customActivityInput, setCustomActivityInput] = useState('');
  const [title, setTitle] = useState('');
  const [equipmentNote, setEquipmentNote] = useState('');
  const [spotClue, setSpotClue] = useState('');
  const [skillCompatibility, setSkillCompatibility] =
    useState<SkillCompatibility>('ALL_LEVELS');
  const [venueName, setVenueName] = useState('Meetup Location');
  const [venueAddress, setVenueAddress] = useState('Meetup Location');
  const [lat, setLat] = useState<number>(userLat || 50.4501);
  const [lng, setLng] = useState<number>(userLng || 30.5234);
  const [exactDate, setExactDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [exactTime, setExactTime] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  });
  const [startTime, setStartTime] = useState<string>(() => {
    const d = new Date();
    const dateStr = d.toISOString().split('T')[0];
    d.setMinutes(d.getMinutes() + 15);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return formatExactTime(dateStr, `${hours}:${mins}`);
  });
  const geocodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [maxParticipants, setMaxParticipants] = useState<number>(4);
  const [isCustomParticipants, setIsCustomParticipants] = useState<boolean>(false);
  const [customParticipantsInput, setCustomParticipantsInput] = useState<string>('4');
  const [joinMode, setJoinMode] = useState<JoinMode>('OPEN');
  const [preferredAgeRange, setPreferredAgeRange] = useState<string>('No preference');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringDay, setRecurringDay] = useState<string>(() => {
    const d = new Date();
    return getDayNameFromDateStr(d.toISOString().split('T')[0]);
  });
  const [recurringTime, setRecurringTime] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  });
  const [showPinMap, setShowPinMap] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const reverseGeocode = async (targetLat: number, targetLng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const spot =
          data.name ||
          addr.amenity ||
          addr.leisure ||
          addr.building ||
          addr.park ||
          addr.road ||
          '';
        const district =
          addr.suburb ||
          addr.neighbourhood ||
          addr.city_district ||
          addr.quarter ||
          addr.city ||
          addr.town ||
          addr.village ||
          '';
        const label =
          [spot, district].filter(Boolean).join(', ') ||
          (data.display_name ? data.display_name.split(',').slice(0, 2).join(',').trim() : '') ||
          `Spot (${targetLat.toFixed(4)}, ${targetLng.toFixed(4)})`;

        const houseNr = addr.house_number || '';
        const road = addr.road || addr.pedestrian || addr.footway || addr.street || '';
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.suburb ||
          '';

        let cleanAddress = '';
        if (road && houseNr) {
          cleanAddress = city ? `${road} ${houseNr}, ${city}` : `${road} ${houseNr}`;
        } else if (road) {
          cleanAddress = city ? `${road}, ${city}` : road;
        } else if (data.display_name) {
          cleanAddress = formatCleanAddress(data.display_name, label);
        } else {
          cleanAddress = label;
        }

        setVenueName(label);
        setVenueAddress(cleanAddress);
        return;
      }
    } catch {}
    setVenueName(`Spot (${targetLat.toFixed(4)}, ${targetLng.toFixed(4)})`);
    setVenueAddress(`Spot (${targetLat.toFixed(4)}, ${targetLng.toFixed(4)})`);
  };

  const handleLocationChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => {
      reverseGeocode(newLat, newLng);
    }, 400);
  };

  useEffect(() => {
    if (isOpen) {
      const activeCat =
        initialCategory || initialCoHost?.favoriteActivities?.[0] || 'Coffee';
      setCategory(activeCat);
      setSelectedCoverImage(getDefaultCoverForCategory(activeCat));
      setSelectedGroup(getActivityGroup(activeCat));
      setIsCustomActivity(false);
      setCustomActivityInput('');
      if (
        initialStartTime &&
        initialStartTime !== 'Now' &&
        initialStartTime !== 'In 30 mins' &&
        initialStartTime !== 'In 1 hour'
      ) {
        setStartTime(initialStartTime);
      } else {
        const d = new Date();
        const dateStr = d.toISOString().split('T')[0];
        d.setMinutes(d.getMinutes() + 15);
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${mins}`;
        setExactDate(dateStr);
        setExactTime(timeStr);
        setStartTime(formatExactTime(dateStr, timeStr));
      }
      if (userLat && userLng) {
        setLat(userLat);
        setLng(userLng);
        reverseGeocode(userLat, userLng);
      }
    }
  }, [isOpen, initialCategory, initialStartTime, userLat, userLng]);

  if (!isOpen) return null;

  const previewParticipants: Participant[] = [
    {
      id: activeUser.id,
      name: activeUser.name,
      age: activeUser.age,
      avatar: activeUser.avatar,
      skillBadge: activeUser.skillBadge,
      reliabilityScore: activeUser.reliabilityScore,
      ratingAvg: activeUser.ratingAvg,
      joinedAt: new Date().toISOString(),
    },
  ];

  const handleUseMyLocation = () => {
    if (userLat && userLng) {
      const targetLat = Number(userLat.toFixed(5));
      const targetLng = Number(userLng.toFixed(5));
      setLat(targetLat);
      setLng(targetLng);
      reverseGeocode(targetLat, targetLng);
    }
  };

  const handleExactDateChange = (newDate: string) => {
    setExactDate(newDate);
    setStartTime(formatExactTime(newDate, exactTime));
    setRecurringDay(getDayNameFromDateStr(newDate));
  };

  const handleExactTimeChange = (newTime: string) => {
    setExactTime(newTime);
    setStartTime(formatExactTime(exactDate, newTime));
    setRecurringTime(newTime);
  };

  const handleToggleRecurring = () => {
    const next = !isRecurring;
    if (next) {
      setRecurringDay(getDayNameFromDateStr(exactDate));
      setRecurringTime(exactTime);
    }
    setIsRecurring(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const activeCategoryName =
      isCustomActivity && customActivityInput.trim()
        ? customActivityInput.trim()
        : category;

    const finalTitle =
      title.trim() ||
      `Spontaneous ${activeCategoryName} Meetup (${
        maxParticipants === 2 ? '1v1' : `Up to ${maxParticipants}`
      })`;
    const finalNote = equipmentNote.trim();

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/lobbies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
          Authorization: `Bearer ${activeUser.id}`,
        },
        body: JSON.stringify({
          category: activeCategoryName,
          title: finalTitle,
          coverImage: selectedCoverImage,
          equipmentNote: finalNote,
          spotClue: spotClue.trim() || undefined,
          skillCompatibility,
          venueName: venueName.trim() || 'Local Park Meetup Spot',
          venueAddress: venueAddress.trim() || venueName.trim(),
          lat: Number(lat),
          lng: Number(lng),
          startTime,
          isRecurring,
          recurringSchedule: isRecurring
            ? `Every ${recurringDay} at ${recurringTime}`
            : undefined,
          maxParticipants,
          joinMode,
          preferredAgeRange,
          host: {
            id: activeUser.id,
            name: activeUser.name,
            age: activeUser.age,
            avatar: activeUser.avatar,
            skillBadge: activeUser.skillBadge,
            tagline: activeUser.tagline,
            reliabilityScore: activeUser.reliabilityScore,
            ratingAvg: activeUser.ratingAvg,
            joinedAt: new Date().toISOString(),
          },
          coHost: null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create meetup');
      }

      const data = await res.json();
      onCreated(data.lobby);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not create meetup'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-stone-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-meetup-title"
        className="w-full max-w-2xl bg-white dark:bg-[#1C1917] rounded-t-[28px] sm:rounded-[28px] shadow-ambient-lg border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className="px-5 sm:px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <OpenDoorLogo className="w-10 h-10 shrink-0" size={40} />
            <div>
              <h2
                id="create-meetup-title"
                className="text-lg sm:text-xl font-extrabold text-stone-950 dark:text-white"
              >
                Host a Meetup
              </h2>
              <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                Hosting as{' '}
                <strong className="text-stone-950 dark:text-white inline-flex items-center">
                  {activeUser.name}
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 inline ml-1" />
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-11 h-11 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 overflow-y-auto space-y-5"
        >
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs font-extrabold text-rose-800 dark:text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* 1. Activity Category with High-Level Groups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                1. Category & Activity
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsCustomActivity(!isCustomActivity);
                  if (!isCustomActivity) {
                    setCustomActivityInput('');
                  }
                }}
                className="text-xs font-extrabold text-orange-600 dark:text-orange-400 hover:underline"
              >
                {isCustomActivity ? 'Select Presets' : '+ Custom Activity'}
              </button>
            </div>

            {/* Macro Group Tabs: Sports, Gaming, Hanging Out, Co-working */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACTIVITY_GROUPS.map((grp) => {
                const isCurrent = selectedGroup === grp;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => {
                      setSelectedGroup(grp);
                      setIsCustomActivity(false);
                      const presets = GROUPED_ACTIVITIES[grp];
                      if (!presets.includes(category)) {
                        setCategory(presets[0]);
                        setSelectedCoverImage(getDefaultCoverForCategory(presets[0]));
                      }
                    }}
                    className={`min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                      isCurrent
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <CategoryIcon category={grp} className="w-4 h-4" />
                    <span>{grp}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-activities or Custom Input */}
            {isCustomActivity ? (
              <div className="pt-1">
                <input
                  type="text"
                  value={customActivityInput}
                  onChange={(e) => setCustomActivityInput(e.target.value)}
                  placeholder={`e.g. Pickleball, Spikeball, Poker, Coding in ${selectedGroup}`}
                  aria-label="Custom activity name"
                  className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-600"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {GROUPED_ACTIVITIES[selectedGroup].map((act) => {
                  const isSelected = category === act && !isCustomActivity;
                  return (
                    <button
                      key={act}
                      type="button"
                      onClick={() => {
                        setCategory(act);
                        setSelectedCoverImage(getDefaultCoverForCategory(act));
                      }}
                      className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${
                        isSelected
                          ? 'bg-stone-900 dark:bg-orange-600 text-white border-stone-900 dark:border-orange-600 shadow-sm'
                          : 'bg-white dark:bg-stone-900 hover:bg-orange-50/60 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700'
                      }`}
                    >
                      <CategoryIcon
                        category={act}
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-white' : 'text-orange-600 dark:text-orange-400'
                        }`}
                      />
                      <span className="truncate">{act}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Cover Selection Strip */}
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Cover Photo
                </label>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  Choose a style
                </span>
              </div>

              {/* Active Cover Preview Card */}
              {selectedCoverImage && (
                <div className="relative w-full h-24 sm:h-28 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-xs group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedCoverImage}
                    alt="Selected cover"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex items-end p-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
                        {isCustomActivity ? customActivityInput.trim() || 'Custom' : category}
                      </span>
                      <span className="text-xs font-bold text-white/95 truncate">
                        {title.trim() || `Casual ${category} Meetup`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Thumbnail Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar">
                {VIBEY_BACKGROUNDS.map((bg, idx) => {
                  const isSelected = selectedCoverImage === bg;
                  const coverLabels = [
                    'Sunset Clouds',
                    'Cozy Café',
                    'Night City',
                    'Sports Court',
                    'Pine Forest',
                    'Modern Mesh',
                    'Cyber Horizon',
                    'Minimal Arches',
                    'Obsidian Stone',
                  ];
                  const label = coverLabels[idx] || `Cover ${idx + 1}`;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedCoverImage(bg)}
                      title={label}
                      aria-label={`Select ${label} cover`}
                      className={`relative shrink-0 w-20 h-13 rounded-xl overflow-hidden border-2 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${
                        isSelected
                          ? 'border-orange-600 ring-2 ring-orange-500/40 scale-105 shadow-xs'
                          : 'border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 opacity-75 hover:opacity-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={bg}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent py-0.5 px-1 text-center">
                        <span className="text-[9px] font-bold text-white/90 truncate block">
                          {label}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-orange-600 ring-1 ring-white flex items-center justify-center">
                          <Check className="w-2 h-2 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Meetup Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                2. Meetup Title & Activity Format
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., Casual ${category} Meetup`}
                className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-sm font-bold text-stone-950 dark:text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={equipmentNote}
                  onChange={(e) => setEquipmentNote(e.target.value)}
                  placeholder="e.g., Meetup description, what to bring, or spot details..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-950 dark:text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                  Spot Clue (Optional)
                </label>
                <textarea
                  rows={2}
                  value={spotClue}
                  onChange={(e) => setSpotClue(e.target.value)}
                  placeholder="e.g., Table 3 near fountain, wearing green hoodie"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-950 dark:text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-600"
                />
              </div>
            </div>
          </div>

          {/* 3. Meetup Location & Map Pinning */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                3. Meetup Location
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinMap(!showPinMap)}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 text-xs font-bold transition-colors inline-flex items-center gap-1 border border-orange-500/30"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{showPinMap ? 'Hide Map' : 'Pin on Map'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="min-h-[34px] px-2.5 py-1 text-xs font-bold text-stone-600 dark:text-stone-400 hover:text-orange-600 inline-flex items-center gap-1 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  GPS
                </button>
              </div>
            </div>

            {/* Interactive Leaflet Map for Pinning Meetup Spot */}
            {showPinMap && (
              <LocationPickerMap
                lat={lat}
                lng={lng}
                onLocationChange={handleLocationChange}
                venueName={venueName}
              />
            )}

            {/* Meetup Location Text Field (auto-updates with pin, directly editable) */}
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => {
                    setVenueName(e.target.value);
                    setVenueAddress(e.target.value);
                  }}
                  placeholder="Meetup location (e.g. Park entrance, Main square, Cafe name)"
                  className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-orange-600 shadow-2xs"
                />
                <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-1">
                <span>Auto-updates when you tap map or drag pin</span>
                <span className="font-mono text-[10px]">
                  {lat.toFixed(4)}, {lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Date & Time & 5. Max Player Cap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span>4. Date & Time</span>
                </label>
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                  {startTime}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold block mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={exactDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleExactDateChange(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white focus:outline-none focus:border-orange-600 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold block mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={exactTime}
                      onChange={(e) => handleExactTimeChange(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white focus:outline-none focus:border-orange-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
                  <span className="text-stone-500 dark:text-stone-400">Scheduled:</span>
                  <span className="font-bold text-stone-900 dark:text-white">{startTime}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  5. Group Size ({maxParticipants >= 999 ? 'No limit' : `${maxParticipants} Players`})
                </span>
                {maxParticipants >= 999 && (
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                    Unlimited Capacity
                  </span>
                )}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {[2, 4, 6, 8, 12].map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => {
                      setIsCustomParticipants(false);
                      setMaxParticipants(cap);
                    }}
                    className={`min-h-[44px] py-2 rounded-xl text-xs font-extrabold border transition-all ${
                      !isCustomParticipants && maxParticipants === cap
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                        : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomParticipants(false);
                    setMaxParticipants(999);
                  }}
                  className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-extrabold border transition-all ${
                    !isCustomParticipants && maxParticipants >= 999
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  ∞ No limit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomParticipants(true);
                    if (maxParticipants >= 999) {
                      setMaxParticipants(10);
                      setCustomParticipantsInput('10');
                    } else {
                      setCustomParticipantsInput(String(maxParticipants));
                    }
                  }}
                  className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-extrabold border transition-all ${
                    isCustomParticipants
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustomParticipants && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                    Max players:
                  </span>
                  <input
                    type="number"
                    min={2}
                    max={500}
                    value={customParticipantsInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomParticipantsInput(val);
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed) && parsed >= 2) {
                        setMaxParticipants(parsed);
                      }
                    }}
                    placeholder="Enter limit"
                    className="w-28 min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-orange-500 text-sm font-bold text-stone-900 dark:text-white focus:outline-none shadow-2xs"
                  />
                  <span className="text-[11px] text-stone-500">
                    (Any number from 2 to 500)
                  </span>
                </div>
              )}

              <div className="mt-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700">
                <SeatBubbles
                  participants={previewParticipants}
                  maxParticipants={maxParticipants}
                  hostId={activeUser.id}
                  activeUserId={activeUser.id}
                />
              </div>
            </div>
          </div>

          {/* Recurring Event Option */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  Recurring Event
                </label>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Repeat this meetup every week at a scheduled time (e.g., Every Friday at 20:00)
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleRecurring}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isRecurring
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300'
                }`}
              >
                {isRecurring ? 'Recurring Weekly' : 'One-Time Only'}
              </button>
            </div>

            {isRecurring && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                    Day of Week
                  </label>
                  <select
                    value={recurringDay}
                    onChange={(e) => setRecurringDay(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                      <option key={d} value={d}>Every {d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={recurringTime}
                    onChange={(e) => setRecurringTime(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 6. Join Mode */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
              6. Join Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setJoinMode('OPEN')}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  joinMode === 'OPEN'
                    ? 'border-orange-600 bg-orange-50/50 dark:bg-orange-950/40'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2 font-extrabold text-sm text-stone-950 dark:text-white">
                  <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Instant Join (Open)
                </div>
                <p className="mt-1 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  First-come, first-served until player cap is reached.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setJoinMode('APPROVAL_REQUIRED')}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  joinMode === 'APPROVAL_REQUIRED'
                    ? 'border-orange-600 bg-orange-50/50 dark:bg-orange-950/40'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800'
                }`}
              >
                <div className="flex items-center gap-2 font-extrabold text-sm text-stone-950 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  Host Approval
                </div>
                <p className="mt-1 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                  Review requests and 1-tap accept or decline players.
                </p>
              </button>
            </div>
          </div>

          {/* 7. Preferred Age Range */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
              7. Age Preference
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {['No preference', '18–25', '20s & 30s', '25–35', '30+', '40+'].map((ageOpt) => (
                <button
                  key={ageOpt}
                  type="button"
                  onClick={() => setPreferredAgeRange(ageOpt)}
                  className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                    preferredAgeRange === ageOpt
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {ageOpt}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-3 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-xs font-extrabold text-stone-800 dark:text-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-7 py-3 rounded-full bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-sm font-extrabold shadow-sm transition-all"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Meetup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
