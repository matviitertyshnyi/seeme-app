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
  Compass,
  Navigation,
  UserPlus,
  Award,
  ChevronDown,
  Calendar,
} from 'lucide-react';

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[220px] rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse flex items-center justify-center text-xs text-stone-500 font-semibold">
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

const START_TIME_OPTIONS: StartTimeOption[] = [
  'Now',
  'In 30 mins',
  'In 1 hour',
  'Later today',
];

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
  const initialCat = initialCategory || 'Ping Pong';
  const [category, setCategory] = useState<ActivityCategory>(initialCat);
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
  const [startTime, setStartTime] = useState<StartTimeOption>(
    initialStartTime || 'Now'
  );
  const [isExactTime, setIsExactTime] = useState<boolean>(false);
  const [exactDate, setExactDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [exactTime, setExactTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    const hours = String(d.getHours()).padStart(2, '0');
    return `${hours}:00`;
  });
  const geocodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [maxParticipants, setMaxParticipants] = useState<number>(4);
  const [joinMode, setJoinMode] = useState<JoinMode>('OPEN');
  const [preferredAgeRange, setPreferredAgeRange] = useState<string>('All Ages (18+)');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurringDay, setRecurringDay] = useState<string>('Friday');
  const [recurringTime, setRecurringTime] = useState<string>('20:00');
  const [showPinMap, setShowPinMap] = useState<boolean>(true);
  const [selectedCoHostId, setSelectedCoHostId] = useState<string | null>(
    initialCoHost?.id || null
  );
  const [showOptionalCoHost, setShowOptionalCoHost] = useState(false);
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

        setVenueName(label);
        setVenueAddress(data.display_name || label);
        return;
      }
    } catch {}
    setVenueName(`Spot (${targetLat.toFixed(4)}, ${targetLng.toFixed(4)})`);
    setVenueAddress(`Coords: ${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}`);
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
        initialCategory || initialCoHost?.favoriteActivities?.[0] || 'Ping Pong';
      setCategory(activeCat);
      setSelectedGroup(getActivityGroup(activeCat));
      setIsCustomActivity(false);
      setCustomActivityInput('');
      if (initialStartTime) {
        setStartTime(initialStartTime);
        setIsExactTime(
          !['Now', 'In 30 mins', 'In 1 hour', 'Later today'].includes(initialStartTime)
        );
      }
      setSelectedCoHostId(initialCoHost ? initialCoHost.id : null);
      setShowOptionalCoHost(Boolean(initialCoHost));
      if (initialCoHost) {
        setMaxParticipants((prev) => Math.max(prev, 4));
      }
      if (userLat && userLng) {
        setLat(userLat);
        setLng(userLng);
        reverseGeocode(userLat, userLng);
      }
    }
  }, [isOpen, initialCategory, initialStartTime, initialCoHost, userLat, userLng]);

  if (!isOpen) return null;

  const availableCoHosts = personas.filter(
    (p) =>
      p.id !== activeUser.id && !activeUser.bannedUserIds?.includes(p.id)
  );
  const selectedCoHost =
    availableCoHosts.find((p) => p.id === selectedCoHostId) || null;

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
    ...(selectedCoHost
      ? [
          {
            id: selectedCoHost.id,
            name: selectedCoHost.name,
            age: selectedCoHost.age,
            avatar: selectedCoHost.avatar,
            skillBadge: selectedCoHost.skillBadge,
            reliabilityScore: selectedCoHost.reliabilityScore,
            ratingAvg: selectedCoHost.ratingAvg,
            joinedAt: new Date().toISOString(),
          },
        ]
      : []),
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

  const handleSelectExactTimeOption = () => {
    setIsExactTime(true);
    setStartTime(formatExactTime(exactDate, exactTime));
  };

  const handleExactDateChange = (newDate: string) => {
    setExactDate(newDate);
    setIsExactTime(true);
    setStartTime(formatExactTime(newDate, exactTime));
  };

  const handleExactTimeChange = (newTime: string) => {
    setExactTime(newTime);
    setIsExactTime(true);
    setStartTime(formatExactTime(exactDate, newTime));
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
    const finalNote =
      equipmentNote.trim() ||
      `I have extra gear for ${activeCategoryName}. Drop a message in the meetup chat when you arrive.`;

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
          coHost: selectedCoHost
            ? {
                id: selectedCoHost.id,
                name: selectedCoHost.name,
                age: selectedCoHost.age,
                avatar: selectedCoHost.avatar,
                skillBadge: selectedCoHost.skillBadge,
                tagline: selectedCoHost.tagline,
                reliabilityScore: selectedCoHost.reliabilityScore,
                ratingAvg: selectedCoHost.ratingAvg,
                joinedAt: new Date().toISOString(),
              }
            : null,
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
            <div className="w-11 h-11 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="create-meetup-title"
                className="text-lg sm:text-xl font-extrabold text-stone-950 dark:text-white"
              >
                Host a Meetup
              </h2>
              <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
                Hosting as{' '}
                <strong className="text-stone-950 dark:text-white">
                  {activeUser.name}
                </strong>{' '}
                ·{' '}
                <span className="text-orange-600 dark:text-orange-400 font-extrabold">
                  {activeUser.skillBadge}
                </span>
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
                      onClick={() => setCategory(act)}
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
          </div>

          {/* 2. Meetup Title & Notes */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                2. Meetup Title & Activity Format
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., 1v1 ${category} Rally or Casual Park Match`}
                className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-sm font-bold text-stone-950 dark:text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                  Equipment Note
                </label>
                <textarea
                  rows={2}
                  value={equipmentNote}
                  onChange={(e) => setEquipmentNote(e.target.value)}
                  placeholder="e.g., I have 2 extra ping pong paddles and balls."
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

            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                Skill Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SKILL_COMPAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSkillCompatibility(opt.value)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                      skillCompatibility === opt.value
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
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

          {/* 4. Start Time & 5. Max Player Cap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  4. Start Time
                </label>
                {isExactTime && (
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                    {startTime}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {START_TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setIsExactTime(false);
                      setStartTime(opt);
                    }}
                    className={`min-h-[42px] py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                      !isExactTime && startTime === opt
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                        : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Exact Date & Time Picker */}
              <div className="mt-2.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleSelectExactTimeOption}
                    className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5 hover:text-orange-600 text-left cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                    <span>Exact Date & Time</span>
                  </button>
                  {isExactTime ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-600 text-white">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectExactTimeOption}
                      className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                    >
                      Set Exact
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-500 dark:text-stone-400 font-medium block mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={exactDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => handleExactDateChange(e.target.value)}
                      className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 dark:text-stone-400 font-medium block mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={exactTime}
                      onChange={(e) => handleExactTimeChange(e.target.value)}
                      className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                    />
                  </div>
                </div>

                {isExactTime && (
                  <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400">
                    Scheduled: <span className="font-bold">{startTime}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                5. Group Size ({maxParticipants} Players)
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {PLAYER_CAPS.map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setMaxParticipants(cap)}
                    className={`min-h-[44px] py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                      maxParticipants === cap
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                        : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>

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
                onClick={() => setIsRecurring(!isRecurring)}
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
              {['All Ages (18+)', '18–25', '20s & 30s', '25–35', '30+', '40+'].map((ageOpt) => (
                <button
                  key={ageOpt}
                  type="button"
                  onClick={() => setPreferredAgeRange(ageOpt)}
                  className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                    preferredAgeRange === ageOpt
                      ? 'bg-brand text-white border-brand shadow-sm'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {ageOpt}
                </button>
              ))}
            </div>
          </div>

          {/* Niche Optional Co-Host Selector: tucked cleanly inside the Hosting Flow only */}
          {availableCoHosts.length > 0 && (
            <div className="border-t border-stone-200 dark:border-stone-800 pt-3">
              <button
                type="button"
                onClick={() => setShowOptionalCoHost((prev) => !prev)}
                className="min-h-[44px] w-full flex items-center justify-between text-xs font-extrabold text-stone-700 dark:text-stone-300 hover:text-orange-600 dark:hover:text-orange-400"
              >
                <span className="inline-flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  {selectedCoHost
                    ? `Co-Hosting with ${selectedCoHost.name}`
                    : 'Add an optional Co-Host'}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showOptionalCoHost ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showOptionalCoHost && (
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {availableCoHosts.map((person) => {
                    const isCoHost = selectedCoHostId === person.id;
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() =>
                          setSelectedCoHostId(isCoHost ? null : person.id)
                        }
                        className={`min-h-[48px] p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                          isCoHost
                            ? 'bg-orange-50 dark:bg-orange-950 border-orange-600 ring-1 ring-orange-600'
                            : 'bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 border-stone-200 dark:border-stone-700'
                        }`}
                      >
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-stone-950 dark:text-white truncate">
                            {person.name.split(' ')[0]}, {person.age}
                          </div>
                          <div className="text-[11px] font-bold text-orange-600 dark:text-orange-400 truncate">
                            {person.skillBadge}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
