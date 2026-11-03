'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Compass,
  Plus,
  LayoutGrid,
  Map as MapIcon,
  LocateFixed,
  MessageCircle,
  Crown,
  Bell,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  Clock,
  Navigation,
  UserCheck,
  UserPlus,
  CalendarClock,
  Sparkles,
  SearchX,
  BarChart3,
  Settings,
  Star,
  Radio,
  User,
  Moon,
  Sun,
  ShieldCheck,
  Edit3,
  LogOut,
  Users,
  ChevronDown,
  Check,
  X,
  Search,
} from 'lucide-react';
import {
  ActivityCategory,
  ActivityGroup,
  AppNotification,
  Lobby,
  LobbyWithDistance,
  PlayerRating,
  RoomStatus,
  StartTimeOption,
  UserPersona,
  UserSettings,
} from '@/types/lobby';
import { DEMO_PERSONAS, INITIAL_SEED_DATA } from '@/lib/seed';
import { attachAndSortByDistance, DEFAULT_USER_COORDS, doesMeetupMatchAgeFilters } from '@/lib/geo';
import {
  triggerSensoryFeedback,
  fireNativeNotificationIfPermitted,
} from '@/lib/sound';
import {
  ACTIVITY_GROUPS,
  GROUPED_ACTIVITIES,
  getActivityGroup,
  ALL_CATEGORIES,
  CategoryIcon,
  getBroadCategory,
  BROAD_CATEGORIES,
} from '@/components/CategoryIcon';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  useTranslation,
  getTranslation,
} from '@/lib/i18n';
import { LobbyCard } from '@/components/LobbyCard';
import { RoomDetailModal } from '@/components/RoomDetailModal';
import { CreateLobbyModal } from '@/components/CreateLobbyModal';
import { AuthProfileModal, GoogleIcon, AppleIcon } from '@/components/AuthProfileModal';
import { MetricsModal } from '@/components/MetricsModal';
import { SettingsModal } from '@/components/SettingsModal';
import { WelcomeLoginScreen } from '@/components/WelcomeLoginScreen';
import { AdminAccountsModal } from '@/components/AdminAccountsModal';
import { BottomNav } from '@/components/BottomNav';
import { MyMeetupsView } from '@/components/MyMeetupsView';
import { AgeSelectorBottomSheet, AGE_PRESETS } from '@/components/AgeSelectorBottomSheet';
import {
  MobilePushBanner,
  NotificationDrawer,
} from '@/components/NotificationCenter';

const MapRadar = dynamic(() => import('@/components/MapRadar'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] rounded-[26px] bg-white dark:bg-[#141210] shadow-ambient border border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
        <MapIcon className="w-6 h-6" />
      </div>
      <p className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300">
        Loading Live Map Radar...
      </p>
    </div>
  ),
});

const DISTANCE_RADII = [2, 5, 15, 50];

const RADIUS_OPTIONS = [
  { value: 2, label: '2 km', desc: 'Walking distance (under 25 min walk)' },
  { value: 5, label: '5 km', desc: 'Nearby neighborhood & short cycle' },
  { value: 15, label: '15 km', desc: 'Across town & rapid transit access' },
  { value: 50, label: '50 km', desc: 'Full metropolitan area' },
];

type NavDestination = 'EXPLORE' | 'MAP' | 'MY_MEETUPS' | 'PROFILE';

export default function LeaveTheRoomHomePage() {
  const [personas, setPersonas] = useState<UserPersona[]>(DEMO_PERSONAS);
  const [activePersonaId, setActivePersonaId] = useState<string>(
    DEMO_PERSONAS[0].id
  );
  const [isSignedOut, setIsSignedOut] = useState<boolean>(true);
  const [hasCheckedSession, setHasCheckedSession] = useState<boolean>(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(true);
  const [rawLobbies, setRawLobbies] = useState<Lobby[]>(
    INITIAL_SEED_DATA.lobbies
  );
  const [ratings, setRatings] = useState<PlayerRating[]>(
    INITIAL_SEED_DATA.ratings || []
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(
    INITIAL_SEED_DATA.notifications || []
  );

  const [activeNav, setActiveNav] = useState<NavDestination>('EXPLORE');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const isThemeInitialized = React.useRef(false);

  const [selectedBroadCategory, setSelectedBroadCategory] = useState<string>('All Categories');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState<boolean>(false);
  const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState<boolean>(false);
  const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState<boolean>(false);
  const [selectedAgeFilters, setSelectedAgeFilters] = useState<string[]>([]);
  const [isAgeSheetOpen, setIsAgeSheetOpen] = useState<boolean>(false);
  const [isRadiusSheetOpen, setIsRadiusSheetOpen] = useState<boolean>(false);
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');
  const [selectedGroup, setSelectedGroup] = useState<
    ActivityGroup | 'All Activities'
  >('All Activities');
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RoomStatus>('ALL');
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [myRoomsCategoryFilter, setMyRoomsCategoryFilter] = useState<
    string | 'All'
  >('All');

  // Pre-filled Host Modal Options
  const [createModalCategory, setCreateModalCategory] = useState<
    string | undefined
  >(undefined);
  const [createModalStartTime, setCreateModalStartTime] = useState<
    StartTimeOption | undefined
  >(undefined);
  const [createModalCoHost, setCreateModalCoHost] =
    useState<UserPersona | null>(null);

  // User Coordinates
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
    label: string;
    isLiveGps: boolean;
  }>({
    lat: DEFAULT_USER_COORDS.lat,
    lng: DEFAULT_USER_COORDS.lng,
    label: DEFAULT_USER_COORDS.label,
    isLiveGps: false,
  });
  const [isLocating, setIsLocating] = useState(false);

  // Modals & Interactive States
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'LOGIN' | 'EDIT'>('LOGIN');
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [pushAlert, setPushAlert] = useState<{
    title: string;
    body: string;
    lobbyId?: string;
  } | null>(null);

  const [joiningLobbyId, setJoiningLobbyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((p) => p.id === activePersonaId) || personas[0],
    [personas, activePersonaId]
  );

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored =
        localStorage.getItem('leavetheroom_theme') ||
        localStorage.getItem('seeme_theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const htmlIsDark = document.documentElement.classList.contains('dark');
      if (stored === 'dark' || (!stored && prefersDark) || htmlIsDark) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
      isThemeInitialized.current = true;
    }
  }, []);

  // Sync dark mode class on <html> and persist
  useEffect(() => {
    if (!isThemeInitialized.current) return;
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      if (typeof window !== 'undefined') {
        localStorage.setItem('leavetheroom_theme', 'dark');
        localStorage.setItem('seeme_theme', 'dark');
      }
    } else {
      root.classList.remove('dark');
      if (typeof window !== 'undefined') {
        localStorage.setItem('leavetheroom_theme', 'light');
        localStorage.setItem('seeme_theme', 'light');
      }
    }
  }, [isDarkMode]);

  // Language state initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved =
        (localStorage.getItem('leavetheroom_lang') as SupportedLanguage) ||
        (localStorage.getItem('ltr_language') as SupportedLanguage) ||
        (localStorage.getItem('seeme_language') as SupportedLanguage) ||
        'en';
      if (['en', 'uk', 'pl', 'de', 'fr'].includes(saved)) {
        setCurrentLang(saved);
      }
    }
  }, []);

  const handleLanguageSelect = (lang: SupportedLanguage) => {
    setCurrentLang(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('leavetheroom_lang', lang);
      localStorage.setItem('ltr_language', lang);
      localStorage.setItem('seeme_language', lang);
      document.documentElement.lang = lang;
    }
  };

  const t = useCallback(
    (key: any, params?: any) => {
      return getTranslation(currentLang, key, params);
    },
    [currentLang]
  );

  const distanceUnit = activeUser.settings?.distanceUnit || 'km';
  const formatRadiusUnit = (km: number) =>
    distanceUnit === 'mi' ? `${(km * 0.621371).toFixed(0)} mi` : `${km} km`;

  const myNotifications = useMemo(
    () => notifications.filter((n) => n.userId === activeUser.id),
    [notifications, activeUser.id]
  );

  const unreadNotifCount = useMemo(
    () => myNotifications.filter((n) => !n.read).length,
    [myNotifications]
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const triggerSimulatedPush = useCallback(
    (title: string, body: string, lobbyId?: string) => {
      if (activeUser.settings?.iosAndroidPush !== false) {
        setPushAlert({ title, body, lobbyId });
        fireNativeNotificationIfPermitted(title, body);
      }
      triggerSensoryFeedback('NOTIFICATION', activeUser.settings);
    },
    [activeUser.settings]
  );

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!pushAlert) return;
    const timer = setTimeout(() => setPushAlert(null), 5000);
    return () => clearTimeout(timer);
  }, [pushAlert]);

  const fetchLobbies = useCallback(async () => {
    try {
      const res = await fetch('/api/lobbies', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.lobbies)) {
        setRawLobbies(data.lobbies);
      }
      if (Array.isArray(data.personas) && data.personas.length > 0) {
        setPersonas(data.personas);
      }
      if (Array.isArray(data.ratings)) {
        setRatings(data.ratings);
      }
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch {
      // Fallback to local seed state
    }
  }, []);

  useEffect(() => {
    fetchLobbies();
  }, [fetchLobbies]);

  // Load persistent user session from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSession =
        localStorage.getItem('leavetheroom_session_user_id') ||
        localStorage.getItem('seeme_session_user_id');
      if (savedSession && savedSession !== 'signed_out') {
        setActivePersonaId(savedSession);
        setIsSignedOut(false);
      } else {
        setIsSignedOut(true);
      }
      setHasCheckedSession(true);
    }
  }, []);

  const handleSwitchUser = (userId: string) => {
    setActivePersonaId(userId);
    setIsSignedOut(false);
    setIsGuestMode(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('leavetheroom_session_user_id', userId);
      localStorage.setItem('seeme_session_user_id', userId);
      document.cookie = `leavetheroom_session=${userId}; path=/; max-age=31536000; SameSite=Lax`;
    }
    const targetPersona = personas.find((p) => p.id === userId);
    if (targetPersona) {
      showToast(`Logged in as ${targetPersona.name}`);
    }
  };

  const handleSignOut = () => {
    setIsSignedOut(true);
    setIsGuestMode(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('leavetheroom_session_user_id', 'signed_out');
      localStorage.setItem('seeme_session_user_id', 'signed_out');
      document.cookie = 'leavetheroom_session=signed_out; path=/; max-age=0';
    }
    showToast('Signed out of Leave The Room');
  };

  const handleGoogleSignIn = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GOOGLE_AUTH',
          email: 'alex.chen.meetups@gmail.com',
          name: 'Alex Chen',
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.personas)) setPersonas(data.personas);
        if (data.persona) {
          setActivePersonaId(data.persona.id);
          setIsSignedOut(false);
          setIsGuestMode(false);
          if (typeof window !== 'undefined') {
            localStorage.setItem('leavetheroom_session_user_id', data.persona.id);
            localStorage.setItem('seeme_session_user_id', data.persona.id);
            document.cookie = `leavetheroom_session=${data.persona.id}; path=/; max-age=31536000; SameSite=Lax`;
          }
          triggerSensoryFeedback('SUCCESS', data.persona.settings);
          showToast(`Signed in with Google as ${data.persona.name}!`);
        }
      }
    } catch {
      showToast('Could not sign in with Google');
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPLE_AUTH',
          email: 'apple.member@icloud.com',
          name: 'Jordan Miller',
          avatar:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.personas)) setPersonas(data.personas);
        if (data.persona) {
          setActivePersonaId(data.persona.id);
          setIsSignedOut(false);
          setIsGuestMode(false);
          if (typeof window !== 'undefined') {
            localStorage.setItem('leavetheroom_session_user_id', data.persona.id);
            localStorage.setItem('seeme_session_user_id', data.persona.id);
            document.cookie = `leavetheroom_session=${data.persona.id}; path=/; max-age=31536000; SameSite=Lax`;
          }
          triggerSensoryFeedback('SUCCESS', data.persona.settings);
          showToast(`Signed in with Apple ID as ${data.persona.name}!`);
        }
      }
    } catch {
      showToast('Could not sign in with Apple');
    }
  };

  const handleRequestVerification = async (note?: string) => {
    setIsRequestingVerification(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_VERIFICATION',
          userId: activeUser.id,
          note: note || 'Identity verification request for verified member checkmark',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.personas)) setPersonas(data.personas);
        showToast('Verification request submitted for admin review!');
      }
    } finally {
      setIsRequestingVerification(false);
    }
  };

  // Attach Haversine distance & standardized status
  const lobbiesWithDistance: LobbyWithDistance[] = useMemo(() => {
    return attachAndSortByDistance(rawLobbies, userCoords.lat, userCoords.lng);
  }, [rawLobbies, userCoords.lat, userCoords.lng]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'All Categories': lobbiesWithDistance.length,
      'Sports & Fitness': 0,
      'Gaming & Strategy': 0,
      'Social & Hangout': 0,
      'Co-Working': 0,
    };
    lobbiesWithDistance.forEach((lobby) => {
      const broad = getBroadCategory(lobby.category);
      if (counts[broad] !== undefined) {
        counts[broad]++;
      }
    });
    return counts;
  }, [lobbiesWithDistance]);

  // Filtered meetups for Explore and Map
  const filteredLobbies: LobbyWithDistance[] = useMemo(() => {
    const bannedIds = activeUser.bannedUserIds || [];
    return lobbiesWithDistance.filter((lobby) => {
      if (
        bannedIds.includes(lobby.hostId) ||
        lobby.bannedUserIds?.includes(activeUser.id)
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = lobby.title.toLowerCase().includes(q);
        const matchCat = lobby.category.toLowerCase().includes(q);
        const matchVenue =
          lobby.venueName.toLowerCase().includes(q) ||
          (lobby.venueAddress && lobby.venueAddress.toLowerCase().includes(q));
        const matchNote = lobby.equipmentNote?.toLowerCase().includes(q);
        const matchHost = lobby.participants[0]?.name.toLowerCase().includes(q);
        if (!matchTitle && !matchCat && !matchVenue && !matchNote && !matchHost) {
          return false;
        }
      }

      // Haversine distance limit
      if (lobby.distanceKm > radiusKm) return false;

      // Status filter
      if (statusFilter !== 'ALL' && lobby.computedStatus !== statusFilter) {
        return false;
      }

      // Broad Category filter
      if (selectedBroadCategory !== 'All Categories') {
        const broad = getBroadCategory(lobby.category);
        if (broad !== selectedBroadCategory) {
          return false;
        }
      }

      if (selectedAgeFilters.length > 0) {
        if (!doesMeetupMatchAgeFilters(lobby.preferredAgeRange, selectedAgeFilters)) {
          return false;
        }
      }

      return true;
    });
  }, [
    lobbiesWithDistance,
    selectedBroadCategory,
    searchQuery,
    selectedAgeFilters,
    radiusKm,
    statusFilter,
    activeUser.bannedUserIds,
    activeUser.id,
  ]);

  const joinedFilteredLobbies = useMemo(
    () =>
      filteredLobbies.filter((lobby) =>
        lobby.participants.some((p) => p.id === activeUser.id)
      ),
    [filteredLobbies, activeUser.id]
  );

  const availableToJoinLobbies = useMemo(
    () =>
      filteredLobbies.filter(
        (lobby) => !lobby.participants.some((p) => p.id === activeUser.id)
      ),
    [filteredLobbies, activeUser.id]
  );

  const myActiveRooms: LobbyWithDistance[] = useMemo(() => {
    return lobbiesWithDistance.filter(
      (lobby) =>
        lobby.hostId === activeUser.id ||
        lobby.participants.some((p) => p.id === activeUser.id) ||
        lobby.pendingRequests.some((r) => r.user.id === activeUser.id)
    );
  }, [lobbiesWithDistance, activeUser.id]);

  const nearestOpenMeetup = useMemo(() => {
    return availableToJoinLobbies.find(
      (l) =>
        l.computedStatus !== 'FINISHED' &&
        l.participants.length < l.maxParticipants
    );
  }, [availableToJoinLobbies]);

  const myRoomCategories = useMemo(() => {
    const set = new Set<ActivityCategory>();
    myActiveRooms.forEach((r) => set.add(r.category));
    return Array.from(set);
  }, [myActiveRooms]);

  const filteredMyActiveRooms = useMemo(() => {
    if (myRoomsCategoryFilter === 'All') return myActiveRooms;
    return myActiveRooms.filter((r) => r.category === myRoomsCategoryFilter);
  }, [myActiveRooms, myRoomsCategoryFilter]);

  const totalPendingRequestsForMe = useMemo(() => {
    return myActiveRooms
      .filter((r) => r.hostId === activeUser.id)
      .reduce((acc, r) => acc + r.pendingRequests.length, 0);
  }, [myActiveRooms, activeUser.id]);

  const selectedLobby: LobbyWithDistance | null = useMemo(() => {
    if (!selectedLobbyId) return null;
    return lobbiesWithDistance.find((l) => l.id === selectedLobbyId) || null;
  }, [lobbiesWithDistance, selectedLobbyId]);

  const openHostModal = (options?: {
    category?: ActivityCategory;
    startTime?: StartTimeOption;
    coHost?: UserPersona | null;
  }) => {
    if (isSignedOut) {
      showToast('Please sign in to host a meetup');
      setAuthModalTab('LOGIN');
      setIsAuthModalOpen(true);
      return;
    }
    setCreateModalCategory(options?.category);
    setCreateModalStartTime(options?.startTime);
    setCreateModalCoHost(options?.coHost || null);
    setIsCreateModalOpen(true);
  };

  // Toggle "Want-to-Play" Radar Beacon Mode (Located cleanly in Profile)
  const handleToggleBeacon = async () => {
    const nextActive = !activeUser.beacon?.active;
    const beaconCats =
      activeUser.beacon?.categories?.length
        ? activeUser.beacon.categories
        : activeUser.favoriteActivities;

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'TOGGLE_BEACON',
        userId: activeUser.id,
        active: nextActive,
        categories: beaconCats,
        radiusKm,
        note: `Open to play ${beaconCats.join(', ')} nearby`,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.personas)) setPersonas(data.personas);
      triggerSensoryFeedback('SUCCESS', activeUser.settings);
      showToast(
        nextActive
          ? `Want-to-Play Beacon ON for ${beaconCats[0] || 'activities'}`
          : 'Want-to-Play Beacon turned off'
      );
    }
  };

  // Rate Player Handler
  const handleRatePlayer = async (
    toUserId: string,
    lobbyId: string,
    stars: number,
    showedUp: boolean,
    comment: string
  ) => {
    const targetLobby = lobbiesWithDistance.find((l) => l.id === lobbyId);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RATE_PLAYER',
        fromUserId: activeUser.id,
        fromUserName: activeUser.name,
        fromUserAvatar: activeUser.avatar,
        toUserId,
        lobbyId,
        lobbyTitle: targetLobby?.title || 'Leave The Room Meetup',
        stars,
        showedUp,
        comment,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.personas)) setPersonas(data.personas);
      if (Array.isArray(data.ratings)) setRatings(data.ratings);
      if (Array.isArray(data.notifications))
        setNotifications(data.notifications);

      const targetPlayer = personas.find((p) => p.id === toUserId);
      triggerSensoryFeedback('SUCCESS', activeUser.settings);
      showToast(
        `Submitted ${stars}-Star rating for ${
          targetPlayer?.name.split(' ')[0] || 'player'
        }!`
      );
      await fetchLobbies();
    }
  };

  const handleQuickFistBumpRate = async (
    toUserId: string,
    lobbyId: string,
    toUserName: string
  ) => {
    await handleRatePlayer(
      toUserId,
      lobbyId,
      5,
      true,
      'Showed up on time, great energy and sportsmanship!'
    );
    showToast(`Sent a 5.0 rating to ${toUserName.split(' ')[0]}!`);
  };

  const handleToggleRegularPartner = async (
    partnerId: string,
    partnerName?: string
  ) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'TOGGLE_REGULAR_PARTNER',
        userId: activeUser.id,
        partnerId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.personas)) setPersonas(data.personas);
      const isNowSaved = data.persona?.regularPartnerIds?.includes(partnerId);
      showToast(
        isNowSaved
          ? `Saved ${partnerName || 'player'} to Regular Partners`
          : `Removed ${partnerName || 'player'} from Regular Partners`
      );
    }
  };

  const handleBanOrUnbanUser = async (
    targetUserId: string,
    action: 'BAN_USER' | 'UNBAN_USER'
  ) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        userId: activeUser.id,
        targetUserId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.personas)) setPersonas(data.personas);
      await fetchLobbies();
      showToast(
        action === 'BAN_USER'
          ? 'Player blocked and hidden from your feed'
          : 'Player unblocked'
      );
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<UserSettings>) => {
    if (typeof newSettings.darkMode === 'boolean') {
      setIsDarkMode(newSettings.darkMode);
    }
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'UPDATE_SETTINGS',
        userId: activeUser.id,
        settings: newSettings,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.personas)) setPersonas(data.personas);
      showToast('Preferences saved');
    }
  };

  const handleMarkNotificationsRead = async () => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'MARK_NOTIFICATIONS_READ',
        userId: activeUser.id,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    }
  };

  const handleNearMeGps = () => {
    if (userCoords.isLiveGps) {
      setUserCoords({
        lat: DEFAULT_USER_COORDS.lat,
        lng: DEFAULT_USER_COORDS.lng,
        label: DEFAULT_USER_COORDS.label,
        isLiveGps: false,
      });
      showToast('Centered on Greenwich Village, NYC');
      return;
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      showToast('Centered on Greenwich Village, NYC');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const nearestCheck = attachAndSortByDistance(
          rawLobbies,
          latitude,
          longitude
        );
        const closestKm = nearestCheck[0]?.distanceKm ?? 0;

        if (closestKm > 50) {
          showToast('GPS verified: showing NYC meetup zone');
          setUserCoords({
            lat: DEFAULT_USER_COORDS.lat,
            lng: DEFAULT_USER_COORDS.lng,
            label: 'Greenwich Village, NYC',
            isLiveGps: true,
          });
        } else {
          setUserCoords({
            lat: latitude,
            lng: longitude,
            label: 'Current GPS Location',
            isLiveGps: true,
          });
          showToast('Updated to your current GPS location');
        }
      },
      () => {
        setIsLocating(false);
        setUserCoords({
          lat: DEFAULT_USER_COORDS.lat,
          lng: DEFAULT_USER_COORDS.lng,
          label: 'Greenwich Village, NYC',
          isLiveGps: true,
        });
        showToast('Centered on Greenwich Village, NYC');
      },
      { timeout: 6000 }
    );
  };

  const handleQuickJoin = async (
    lobby: LobbyWithDistance,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (joiningLobbyId) return;

    if (isSignedOut) {
      showToast('Please sign in to join meetups');
      setAuthModalTab('LOGIN');
      setIsAuthModalOpen(true);
      return;
    }

    const alreadyIn = lobby.participants.some((p) => p.id === activeUser.id);
    if (alreadyIn) {
      setSelectedLobbyId(lobby.id);
      return;
    }

    setJoiningLobbyId(lobby.id);
    try {
      const res = await fetch(`/api/lobbies/${lobby.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
          Authorization: `Bearer ${activeUser.id}`,
        },
        body: JSON.stringify({
          action: 'JOIN_OR_REQUEST',
          user: {
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
          note: `Hey! I am nearby (${lobby.distanceLabel}) and down to join.`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await fetchLobbies();
        triggerSensoryFeedback('JOIN', activeUser.settings);
        if (data.status === 'JOINED') {
          showToast(`Joined "${lobby.title}"!`);
          setSelectedLobbyId(lobby.id);
        } else if (data.status === 'REQUESTED') {
          showToast(`Join request sent to host`);
          setSelectedLobbyId(lobby.id);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Could not join meetup');
      }
    } catch {
      showToast('Network error while joining meetup');
    } finally {
      setJoiningLobbyId(null);
    }
  };

  const handleResetDemoData = async () => {
    const res = await fetch('/api/lobbies', { method: 'PUT' });
    if (res.ok) {
      const data = await res.json();
      setRawLobbies(data.lobbies);
      if (Array.isArray(data.personas)) setPersonas(data.personas);
      showToast('Demo meetups and profiles restored');
    }
  };


  if (!hasCheckedSession) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center animate-pulse">
          <Compass className="w-5 h-5 stroke-[2.4]" />
        </div>
      </div>
    );
  }

  if (isSignedOut) {
    return (
      <WelcomeLoginScreen
        onGoogleSignIn={handleGoogleSignIn}
        onAppleSignIn={handleAppleSignIn}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#141210] text-stone-900 dark:text-stone-100 flex flex-col transition-colors duration-200">
      {/* Native iOS / Android Top Push Notification Banner */}
      <MobilePushBanner
        pushAlert={pushAlert}
        onDismiss={() => setPushAlert(null)}
        onOpenLobby={(lobbyId) => setSelectedLobbyId(lobbyId)}
      />

      {/* Toast Notification (Positioned safely above the bottom nav) */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -transtone-x-1/2 z-[900] bg-stone-900 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2.5 text-xs font-semibold border border-white/10 max-w-[90vw]"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      <main className={`w-full max-w-xl mx-auto flex-1 px-4 pt-3 ${activeNav === 'MAP' ? 'pb-20' : 'pb-24'}`}>
        {activeNav === 'EXPLORE' && (
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('search_placeholder') || 'Search meetups, sports, games...'}
                    className="w-full min-h-[40px] pl-9 pr-8 py-2 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-750 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsCategorySheetOpen(true)}
                  aria-label="Filter by activity type"
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700/80 text-stone-800 dark:text-stone-200 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                >
                  <span className="truncate max-w-[110px] sm:max-w-none">
                    {selectedBroadCategory === 'All Categories' ? (t('all_activities') || 'All Meetups') : selectedBroadCategory}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-orange-500/20 text-orange-600 dark:text-orange-400">
                    {categoryCounts[selectedBroadCategory] ?? lobbiesWithDistance.length}
                  </span>
                  <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
                </button>
              </div>

              {/* Subrow: Location & Radius | Age Selector | Live Now */}
              <div className="flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400 pt-1.5 border-t border-stone-100 dark:border-stone-800/80">
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleNearMeGps}
                    className="font-semibold text-stone-800 dark:text-stone-200 hover:text-orange-600 transition-colors inline-flex items-center gap-1.5 text-xs"
                    title="Tap to update current location"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="truncate max-w-[110px] sm:max-w-none">{userCoords.label.split(',')[0]}</span>
                  </button>
                  <span className="text-stone-300 dark:text-stone-700">·</span>
                  <button
                    type="button"
                    onClick={() => setIsRadiusSheetOpen(true)}
                    className="min-h-[30px] inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold transition-colors text-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                  >
                    <span>{formatRadiusUnit(radiusKm)}</span>
                    <ChevronDown className="w-3 h-3 text-stone-400" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAgeSheetOpen(true)}
                    className={`min-h-[30px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedAgeFilters.length > 0
                        ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/40 shadow-2xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-transparent dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <span className="text-stone-400 text-[11px] font-normal">Age:</span>
                    <span>
                      {selectedAgeFilters.length === 0
                        ? 'All ages'
                        : selectedAgeFilters.length === 1
                        ? AGE_PRESETS.find((p) => p.id === selectedAgeFilters[0])?.label || selectedAgeFilters[0]
                        : `${selectedAgeFilters.length} selected`}
                    </span>
                    <ChevronDown className="w-3 h-3 text-stone-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'LIVE' ? 'ALL' : 'LIVE')}
                    className={`min-h-[30px] px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1 ${
                      statusFilter === 'LIVE'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'LIVE' ? 'bg-white' : 'bg-emerald-500'}`} />
                    <span>Live now</span>
                  </button>
                </div>
              </div>
            </section>

            {filteredLobbies.length === 0 ? (
              <div className="bg-white dark:bg-[#1C1917] rounded-3xl p-8 text-center border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_28px_rgba(0,0,0,0.5)] max-w-lg mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto shadow-[0_0_16px_rgba(234,88,12,0.2)]">
                  <SearchX className="w-6 h-6" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-stone-950 dark:text-stone-100">
                    No Meetups Found Nearby
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                    No active meetups matched your current filters. Expand your radius, switch categories, or start a meetup.
                  </p>
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openHostModal({
                        category:
                          selectedCategory !== 'All'
                            ? selectedCategory
                            : selectedGroup !== 'All Activities'
                            ? GROUPED_ACTIVITIES[selectedGroup][0]
                            : 'Ping Pong',
                        startTime:
                          statusFilter === 'UPCOMING' ? 'In 30 mins' : 'Now',
                      })
                    }
                    className="min-h-[42px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-[0_4px_16px_rgba(234,88,12,0.4)] border border-orange-400/30 inline-flex items-center gap-1.5 transition active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Host a Meetup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBroadCategory('All Categories');
                      setSelectedCategory('All');
                      setStatusFilter('ALL');
                      setRadiusKm(50);
                      setSelectedAgeFilters([]);
                    }}
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
                          {t('available_meetups') || 'Available Meetups'} ({availableToJoinLobbies.length})
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
                          onSelectLobby={(item) => setSelectedLobbyId(item.id)}
                          onQuickJoin={handleQuickJoin}
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
                          <span>Meetups You Are In ({joinedFilteredLobbies.length})</span>
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
                          onSelectLobby={(item) => setSelectedLobbyId(item.id)}
                          onQuickJoin={handleQuickJoin}
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
        )}

        {activeNav === 'MAP' && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {(['All Categories', 'Sports & Fitness', 'Gaming & Strategy', 'Social & Hangout', 'Co-Working'] as const).map(
                (catName) => {
                  const isSelected = selectedBroadCategory === catName;
                  const count =
                    catName === 'All Categories'
                      ? lobbiesWithDistance.filter((l) => l.distanceKm <= radiusKm).length
                      : lobbiesWithDistance.filter(
                          (l) => getBroadCategory(l.category) === catName && l.distanceKm <= radiusKm
                        ).length;

                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => setSelectedBroadCategory(catName)}
                      className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white border-orange-500 shadow-xs'
                          : 'bg-white dark:bg-[#1C1917] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span>{catName === 'All Categories' ? 'All Meetups' : catName}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            <MapRadar
              lobbies={filteredLobbies}
              userLat={userCoords.lat}
              userLng={userCoords.lng}
              radiusKm={radiusKm}
              activeUser={activeUser}
              onSelectLobby={(item) => setSelectedLobbyId(item.id)}
              onQuickJoin={handleQuickJoin}
            />
          </div>
        )}

        {activeNav === 'MY_MEETUPS' && (
          <MyMeetupsView
            activeUser={activeUser}
            lobbies={lobbiesWithDistance}
            selectedLobbyId={selectedLobbyId}
            onSelectLobby={(id) => setSelectedLobbyId(id)}
            onOpenHostModal={openHostModal}
            onQuickJoin={handleQuickJoin}
            onNavigateExplore={() => setActiveNav('EXPLORE')}
            nearestOpenMeetup={nearestOpenMeetup}
          />
        )}

        {activeNav === 'PROFILE' && (
          <div className="space-y-5">
            {isSignedOut ? (
              <div className="bg-white dark:bg-[#1C1917] rounded-[26px] p-8 text-center border border-stone-200 dark:border-stone-800 shadow-ambient space-y-4 max-w-md mx-auto mt-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
                  <Compass className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-stone-950 dark:text-white">
                    Sign In to Leave The Room
                  </h1>
                  <p className="text-xs font-medium text-stone-600 dark:text-stone-300 mt-1">
                    Sign in to your account to join meetups, check in, and chat
                    with players nearby.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="min-h-[48px] w-full rounded-2xl bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                  >
                    <GoogleIcon className="w-5 h-5 shrink-0" />
                    <span>Continue with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAppleSignIn}
                    className="min-h-[48px] w-full rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                  >
                    <AppleIcon className="w-5 h-5 shrink-0" />
                    <span>Continue with Apple</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchUser(activeUser.id);
                    }}
                    className="min-h-[44px] w-full py-3 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    Continue as {activeUser.name}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalTab('LOGIN');
                      setIsAuthModalOpen(true);
                    }}
                    className="min-h-[44px] w-full py-3 rounded-full bg-stone-900 hover:bg-black dark:bg-white text-white dark:text-stone-900 text-xs font-extrabold shadow-sm transition-all"
                  >
                    More Sign In Options
                  </button>
                </div>
              </div>
            ) : (
              /* Logged-In Profile Screen (No Register or Sign-Up Prompts!) */
              <>
                <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-5 border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_6px_20px_-4px_rgba(0,0,0,0.5)] space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={activeUser.avatar}
                          alt={activeUser.name}
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-orange-500 shadow-[0_0_16px_rgba(234,88,12,0.3)]"
                        />
                        {activeUser.verified && (
                          <span
                            title="Verified Member"
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-stone-900"
                          >
                            <ShieldCheck className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h1 className="text-lg font-bold text-stone-950 dark:text-stone-100">
                            {activeUser.name}, {activeUser.age}
                          </h1>
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-[11px]">
                            {activeUser.skillBadge}
                          </span>
                        </div>

                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          {activeUser.neighborhood}
                        </p>

                        <p className="text-xs text-stone-600 dark:text-stone-300 mt-1.5 leading-relaxed">
                          {activeUser.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalTab('EDIT');
                          setIsAuthModalOpen(true);
                        }}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-700/60"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-stone-800 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-orange-500/30 transition-all">
                      <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                        {activeUser.reliabilityScore}%
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                        Show-Up Rate
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-stone-800 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-orange-500/30 transition-all">
                      <div className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        {activeUser.ratingAvg}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                        Rating ({activeUser.ratingCount})
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-stone-800 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-orange-500/30 transition-all">
                      <div className="text-base font-bold text-orange-600 dark:text-orange-400 drop-shadow-[0_0_8px_rgba(234,88,12,0.25)]">
                        {activeUser.meetupsAttended}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                        Meetups Joined
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#141210] border border-stone-200 dark:border-stone-800 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-orange-500/30 transition-all">
                      <div className="text-base font-bold text-stone-900 dark:text-stone-100">
                        {activeUser.hoursPlayed}h
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                        Hours Played
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Dark Mode & Appearance Toggle Card */}
                <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-4 border border-stone-200/90 dark:border-stone-800/90 shadow-2xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center shrink-0">
                        {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      </div>
                      <div>
                        <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          Appearance & Theme
                        </h2>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          {isDarkMode ? 'Dark warm stone palette' : 'Warm cream light mode'}
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsDarkMode(false)}
                        className={`min-h-[32px] px-3 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-all ${
                          !isDarkMode
                            ? 'bg-white text-stone-950 shadow-2xs'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <Sun className="w-3 h-3" />
                        <span>Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDarkMode(true)}
                        className={`min-h-[32px] px-3 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-all ${
                          isDarkMode
                            ? 'bg-orange-600 text-white shadow-2xs'
                            : 'text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        <Moon className="w-3 h-3" />
                        <span>Dark</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Language Picker */}
                <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-4 border border-stone-200 dark:border-stone-800/90 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                      Language / Мова / Język / Sprache / Langue
                    </h2>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">
                      {currentLang.toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLanguageSheetOpen(true)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700/80 text-stone-900 dark:text-stone-100 text-xs font-semibold flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400">
                        {currentLang.toUpperCase()}
                      </span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.nativeName}
                      </span>
                      <span className="text-stone-400 font-normal">
                        ({SUPPORTED_LANGUAGES.find((l) => l.code === currentLang)?.name})
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  </button>
                </section>

                <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-4 border border-stone-200 dark:border-stone-800/90 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                      {t('community_policies') || 'Community Policies & Safety Guidelines'}
                    </h2>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Review community standards, zero-tolerance flaking rules, and in-person verification standards.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPoliciesModalOpen(true)}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/70 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 text-xs font-bold border border-stone-200 dark:border-stone-700/80 transition flex items-center justify-between group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>{t('community_policies') || 'Community Policies & Safety Guidelines'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-200 transition-colors" />
                  </button>
                </section>

                <section className="bg-white dark:bg-[#1C1917] rounded-2xl p-4 border border-stone-200 dark:border-stone-800/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                        Switch Active Demo Account
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetDemoData}
                      className="min-h-[32px] px-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Demo</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {personas
                      .filter((p) => !p.name.includes('Adversarial') && !p.name.includes('Auditor'))
                      .map((persona) => {
                      const isSelected = persona.id === activeUser.id;
                      return (
                        <button
                          key={persona.id}
                          type="button"
                          onClick={() => handleSwitchUser(persona.id)}
                          className={`min-h-[48px] p-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                            isSelected
                              ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500'
                              : 'bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={persona.avatar}
                              alt={persona.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-stone-950 dark:text-stone-100 truncate">
                                {persona.name}, {persona.age}
                              </div>
                              <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                                {persona.skillBadge}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <UserCheck className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </main>

      {activeNav === 'EXPLORE' && (
        <div className="fixed bottom-20 left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-xl mx-auto px-4 flex justify-end">
            <button
              type="button"
              onClick={() => openHostModal({ startTime: 'Now' })}
              aria-label="Host Meetup"
              className="pointer-events-auto min-h-[46px] px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 active:scale-95 text-white text-xs font-bold shadow-[0_4px_24px_rgba(234,88,12,0.45),0_1px_2px_rgba(0,0,0,0.2)] border border-orange-300/30 inline-flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.8]" />
              <span>Host Meetup</span>
            </button>
          </div>
        </div>
      )}

      <BottomNav
        activeTab={activeNav}
        onChangeTab={(tab) => {
          if (tab === 'MY_MEETUPS' && isSignedOut) {
            showToast('Please sign in to view your meetups');
            setAuthModalTab('LOGIN');
            setIsAuthModalOpen(true);
            return;
          }
          setActiveNav(tab);
        }}
        unreadCount={unreadNotifCount}
        isDarkMode={isDarkMode}
        meetupsCount={myActiveRooms.length}
        hasPendingRequests={totalPendingRequestsForMe > 0}
        userAvatar={activeUser.avatar}
        userName={activeUser.name}
        isSignedOut={isSignedOut}
        language={currentLang}
      />

      {/* Meetup Detail, Live Arrival Check-In, Approval Queue, Ratings & Chat Modal */}
      <RoomDetailModal
        lobby={selectedLobby}
        activeUser={activeUser}
        isSignedOut={isSignedOut}
        onRequestAuth={() => {
          setAuthModalTab('LOGIN');
          setIsAuthModalOpen(true);
        }}
        onClose={() => setSelectedLobbyId(null)}
        onLobbyUpdated={async () => {
          await fetchLobbies();
        }}
        onLobbyDeleted={(deletedId) => {
          setRawLobbies((prev) => prev.filter((l) => l.id !== deletedId));
          showToast('Meetup closed and removed');
        }}
        onQuickRatePlayer={handleQuickFistBumpRate}
        onToggleRegularPartner={handleToggleRegularPartner}
      />

      {/* Host Meetup Modal */}
      <CreateLobbyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        activeUser={activeUser}
        personas={personas}
        initialCategory={createModalCategory}
        initialStartTime={createModalStartTime}
        initialCoHost={createModalCoHost}
        userLat={userCoords.lat}
        userLng={userCoords.lng}
        onCreated={async (newLobby) => {
          await fetchLobbies();
          setSelectedLobbyId(newLobby.id);
          triggerSensoryFeedback('SUCCESS', activeUser.settings);
          showToast(`Meetup "${newLobby.title}" is now LIVE!`);
        }}
      />

      {/* Edit Profile / Account Modal */}
      <AuthProfileModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
        activeUser={activeUser}
        personas={personas}
        onSelectUser={(persona) => {
          handleSwitchUser(persona.id);
        }}
        onUserCreatedOrUpdated={(persona, allPersonas, msg) => {
          setPersonas(allPersonas);
          handleSwitchUser(persona.id);
          triggerSensoryFeedback('SUCCESS', persona.settings);
          showToast(msg);
        }}
      />

      {/* Metrics, Reliability, Regular Partners & Player Ratings Modal */}
      <MetricsModal
        isOpen={isMetricsModalOpen}
        onClose={() => setIsMetricsModalOpen(false)}
        activeUser={activeUser}
        personas={personas}
        lobbies={lobbiesWithDistance}
        ratings={ratings}
        onRatePlayer={handleRatePlayer}
        onCoHostWithPartner={(partner) => {
          setIsMetricsModalOpen(false);
          openHostModal({
            category: partner.favoriteActivities[0] || 'Ping Pong',
            startTime: 'Now',
            coHost: partner,
          });
        }}
      />

      {/* Settings, Android/iOS Notifications & Blocked Players Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        activeUser={activeUser}
        personas={personas}
        onUpdateSettings={handleUpdateSettings}
        onBanOrUnbanUser={handleBanOrUnbanUser}
        onTriggerSimulatedMobilePush={(title, body) =>
          triggerSimulatedPush(title, body, filteredLobbies[0]?.id)
        }
        onResetDemoData={handleResetDemoData}
      />

      {/* Admin Account Management Modal */}
      <AdminAccountsModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        adminUser={activeUser}
        personas={personas}
        onPersonasUpdated={(updatedPersonas, toastMsg) => {
          setPersonas(updatedPersonas);
          showToast(toastMsg);
        }}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={myNotifications}
        onMarkAllRead={handleMarkNotificationsRead}
        onSelectLobby={(lobbyId) => setSelectedLobbyId(lobbyId)}
      />

      <AgeSelectorBottomSheet
        isOpen={isAgeSheetOpen}
        onClose={() => setIsAgeSheetOpen(false)}
        selectedAgeRanges={selectedAgeFilters}
        onApply={(ranges) => {
          setSelectedAgeFilters(ranges);
          triggerSensoryFeedback('SUCCESS', activeUser.settings);
        }}
        onHaptic={() => triggerSensoryFeedback('TAP', activeUser.settings)}
      />

      {/* Radius & Distance Filter Bottom Sheet */}
      {isRadiusSheetOpen && (
        <div className="fixed inset-0 z-[600] flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsRadiusSheetOpen(false)}
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
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  How far are you willing to travel from {userCoords.label.split(',')[0]}?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRadiusSheetOpen(false)}
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
                    onClick={() => {
                      setRadiusKm(opt.value);
                      triggerSensoryFeedback('TAP', activeUser.settings);
                    }}
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
                onClick={() => setIsRadiusSheetOpen(false)}
                className="min-h-[44px] flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-semibold shadow-xs transition"
              >
                Apply Distance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Type Category Filter Bottom Sheet */}
      {isCategorySheetOpen && (
        <div className="fixed inset-0 z-[600] flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsCategorySheetOpen(false)}
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
                onClick={() => setIsCategorySheetOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-2 overflow-y-auto">
              {(['All Categories', 'Sports & Fitness', 'Gaming & Strategy', 'Social & Hangout', 'Co-Working'] as const).map(
                (catName) => {
                  const isSelected = selectedBroadCategory === catName;
                  const catLabel = catName === 'All Categories' ? (t('all_activities') || 'All Meetups') : catName;
                  const count = categoryCounts[catName] || 0;
                  return (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => {
                        setSelectedBroadCategory(catName);
                        setIsCategorySheetOpen(false);
                        triggerSensoryFeedback('TAP', activeUser.settings);
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
                          <CategoryIcon category={catName === 'All Categories' ? 'All Rooms' : catName} className="w-4 h-4" />
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
                        {isSelected && <Check className="w-4 h-4 text-orange-600 dark:text-orange-400 stroke-[3]" />}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}

      {/* Community Policies & Safety Guidelines Modal (Closed by "I understand") */}
      {isPoliciesModalOpen && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsPoliciesModalOpen(false)}
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
                onClick={() => setIsPoliciesModalOpen(false)}
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
                  2. Public & Verified Venues Only
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
                  Hosts have discretion over their participant roster. Any player can block or report bad actors immediately via the player card. Reported violations are promptly investigated by moderation.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsPoliciesModalOpen(false)}
                className="w-full min-h-[48px] rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{t('i_understand') || 'I understand'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Custom Language Bottom Sheet (Replaces unstyled OS dropdown) */}
      {isLanguageSheetOpen && (
        <div className="fixed inset-0 z-[750] flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsLanguageSheetOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-sheet-title"
            className="relative z-10 w-full max-w-lg mx-auto bg-white dark:bg-[#1C1917] rounded-t-3xl border-t border-stone-200 dark:border-stone-800 p-5 sm:p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[80vh]"
          >
            <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mb-4 shrink-0" />

            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 shrink-0">
              <div>
                <h2
                  id="language-sheet-title"
                  className="text-base font-bold text-stone-900 dark:text-stone-100"
                >
                  Select Language
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Change the interface language across the app
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLanguageSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-2 overflow-y-auto">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      handleLanguageSelect(lang.code);
                      setIsLanguageSheetOpen(false);
                      triggerSensoryFeedback('TAP', activeUser.settings);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500 ring-1 ring-orange-500/40 shadow-xs'
                        : 'bg-stone-50/80 dark:bg-stone-900/60 border-stone-200/80 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-orange-600 text-white shadow-sm'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {lang.flag}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                          {lang.nativeName}
                        </div>
                        <div className="text-xs text-stone-500 dark:text-stone-400">
                          {lang.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
      )}
    </div>
  );
}
