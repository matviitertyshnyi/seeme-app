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
import { attachAndSortByDistance, DEFAULT_USER_COORDS } from '@/lib/geo';
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
import {
  MobilePushBanner,
  NotificationDrawer,
} from '@/components/NotificationCenter';

const MapRadar = dynamic(() => import('@/components/MapRadar'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] rounded-[26px] bg-white dark:bg-slate-900 shadow-ambient border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
        <MapIcon className="w-6 h-6" />
      </div>
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        Loading Live Map Radar...
      </p>
    </div>
  ),
});

const DISTANCE_RADII = [2, 5, 15, 50];

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

  // Primary Bottom Navigation Destination (Explore, Map, My Meetups, Profile)
  const [activeNav, setActiveNav] = useState<NavDestination>('EXPLORE');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const isThemeInitialized = React.useRef(false);

  // Filters (Directly in Explore & Map)
  const [selectedBroadCategory, setSelectedBroadCategory] = useState<string>('All Categories');
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string>('Any');
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

      // Age preference filter
      if (selectedAgeFilter !== 'Any') {
        if (
          lobby.preferredAgeRange &&
          lobby.preferredAgeRange !== 'All Ages (18+)' &&
          lobby.preferredAgeRange !== selectedAgeFilter
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    lobbiesWithDistance,
    selectedBroadCategory,
    selectedAgeFilter,
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
        headers: { 'Content-Type': 'application/json' },
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
      }
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
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-pulse">
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
    <div className="min-h-screen bg-canvas text-ink flex flex-col transition-colors duration-200">
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
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[900] bg-slate-900 dark:bg-indigo-600 text-white px-5 py-3 rounded-full shadow-ambient-lg flex items-center gap-2.5 text-xs font-extrabold border border-white/15 max-w-[90vw]"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          MAIN CONTENT CONTAINER (Safe-area bottom padding prevents nav overlap)
         ===================================================================== */}
      <main className="w-full max-w-4xl mx-auto flex-1 px-4 sm:px-6 pt-4 pb-28">
        {/* ===================================================================
            DESTINATION 1: EXPLORE (Primary Meetup Discovery + Scannable Filters)
           =================================================================== */}
        {activeNav === 'EXPLORE' && (
          <div className="space-y-5">
            {/* Minimalist Editorial Discovery Strip (Starts immediately at top - Top bar eliminated) */}
            <section
              aria-label="Meetup Discovery Filters"
              className="bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-200 dark:border-slate-800 shadow-ambient space-y-3.5"
            >
              {/* Broad Category Tabs (5 broad categories, zero emojis) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {(['All Categories', 'Sports & Fitness', 'Gaming & Strategy', 'Social & Hangout', 'Co-Working'] as const).map(
                  (catName) => {
                    const isSelected = selectedBroadCategory === catName;
                    const catCount =
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
                        className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                          isSelected
                            ? 'bg-brand text-white border-brand shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span>{catName}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {catCount}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              {/* Age Preference & Location/Radius Filter Row */}
              <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                {/* Age Filter Selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0 uppercase tracking-wider">
                    Age:
                  </span>
                  {(['Any', '18–25', '20s & 30s', '25–35', '30+', '40+'] as const).map((ageOpt) => (
                    <button
                      key={ageOpt}
                      type="button"
                      onClick={() => setSelectedAgeFilter(ageOpt)}
                      className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 border ${
                        selectedAgeFilter === ageOpt
                          ? 'bg-brand text-white border-brand shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {ageOpt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleNearMeGps}
                    className="min-h-[36px] px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700"
                  >
                    <LocateFixed
                      className={`w-3.5 h-3.5 text-brand shrink-0 ${isLocating ? 'animate-spin' : ''}`}
                    />
                    <span className="truncate max-w-[120px]">{userCoords.label}</span>
                  </button>

                  {/* Distance Radius Selector */}
                  <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-300 dark:border-slate-700">
                    {DISTANCE_RADII.map((km) => (
                      <button
                        key={km}
                        type="button"
                        onClick={() => setRadiusKm(km)}
                        className={`min-h-[32px] px-3 py-1 rounded-full text-xs font-extrabold transition-all ${
                          radiusKm === km
                            ? 'bg-brand text-white shadow-sm'
                            : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                        }`}
                      >
                        {formatRadiusUnit(km)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>



              {/* 2. Meetup Status + Distance Radius Row */}
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                {/* Meetup Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`min-h-[44px] px-3.5 py-2 rounded-full text-xs font-extrabold border transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    All Status
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === 'LIVE' ? 'ALL' : 'LIVE'
                      )
                    }
                    className={`min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold border transition-all ${
                      statusFilter === 'LIVE'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        statusFilter === 'LIVE'
                          ? 'bg-white'
                          : 'bg-emerald-500'
                      }`}
                    />
                    Live Now
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === 'UPCOMING' ? 'ALL' : 'UPCOMING'
                      )
                    }
                    className={`min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold border transition-all ${
                      statusFilter === 'UPCOMING'
                        ? 'bg-amber-400 text-slate-950 border-amber-500'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Upcoming
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === 'FINISHED' ? 'ALL' : 'FINISHED'
                      )
                    }
                    className={`min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold border transition-all ${
                      statusFilter === 'FINISHED'
                        ? 'bg-rose-700 text-white border-rose-700'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        statusFilter === 'FINISHED'
                          ? 'bg-white'
                          : 'bg-rose-500'
                      }`}
                    />
                    Finished
                  </button>
                </div>

                {/* Distance Radius Selector */}
                <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-300 dark:border-slate-700">
                  {DISTANCE_RADII.map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => setRadiusKm(km)}
                      className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-extrabold transition-all ${
                        radiusKm === km
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                      }`}
                    >
                      {formatRadiusUnit(km)}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* EXPLORE RESULTS OR EMPTY STATE */}
            {filteredLobbies.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-[26px] p-8 sm:p-10 text-center shadow-ambient border border-slate-200 dark:border-slate-800 max-w-lg mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  {statusFilter === 'UPCOMING' ? (
                    <CalendarClock className="w-7 h-7" />
                  ) : (
                    <SearchX className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white">
                    {statusFilter === 'UPCOMING'
                      ? `No Upcoming ${
                          selectedCategory !== 'All'
                            ? selectedCategory
                            : selectedGroup !== 'All Activities'
                            ? selectedGroup
                            : ''
                        } Meetups`
                      : `No ${
                          selectedCategory !== 'All'
                            ? selectedCategory
                            : selectedGroup !== 'All Activities'
                            ? selectedGroup
                            : ''
                        } Meetups Within ${formatRadiusUnit(radiusKm)}`}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    No active meetups matched your current filters. Reset your
                    filters to view all nearby games, or start a new meetup in
                    2 taps.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
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
                    className="min-h-[44px] px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Host{' '}
                    {selectedCategory !== 'All'
                      ? selectedCategory
                      : selectedGroup !== 'All Activities'
                      ? selectedGroup
                      : 'a Meetup'}
                  </button>

                  {radiusKm < 50 && (
                    <button
                      type="button"
                      onClick={() => setRadiusKm(50)}
                      className="min-h-[44px] px-4 py-2.5 rounded-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-extrabold"
                    >
                      Expand to {formatRadiusUnit(50)}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGroup('All Activities');
                      setSelectedCategory('All');
                      setStatusFilter('ALL');
                      setRadiusKm(50);
                    }}
                    className="min-h-[44px] px-4 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-extrabold text-slate-900 dark:text-slate-200"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-7">
                {/* SECTION A: AVAILABLE MEETUPS TO JOIN */}
                {availableToJoinLobbies.length > 0 && (
                  <section className="space-y-3.5">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h2 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white">
                          Available Meetups ({availableToJoinLobbies.length})
                        </h2>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Sorted by Live status and nearest distance
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {availableToJoinLobbies.map((lobby) => (
                        <LobbyCard
                          key={lobby.id}
                          lobby={lobby}
                          activeUser={activeUser}
                          onSelectLobby={(item) => setSelectedLobbyId(item.id)}
                          onQuickJoin={handleQuickJoin}
                          isJoining={joiningLobbyId === lobby.id}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* SECTION B: MEETUPS YOU ARE IN */}
                {joinedFilteredLobbies.length > 0 && (
                  <section className="space-y-3.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h2 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          Meetups You Are In ({joinedFilteredLobbies.length})
                        </h2>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Tap any meetup to check in or open group chat
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {joinedFilteredLobbies.map((lobby) => (
                        <LobbyCard
                          key={lobby.id}
                          lobby={lobby}
                          activeUser={activeUser}
                          onSelectLobby={(item) => setSelectedLobbyId(item.id)}
                          onQuickJoin={handleQuickJoin}
                          isJoining={joiningLobbyId === lobby.id}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            DESTINATION 2: MAP (Direct Interactive Radar with Compact Filters)
           =================================================================== */}
        {activeNav === 'MAP' && (
          <div className="space-y-3.5">
            {/* Broad Category Filter Strip Above Map (Zero emojis, Top bar eliminated) */}
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
                      className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 border transition-all ${
                        isSelected
                          ? 'bg-brand text-white border-brand shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{catName}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Full-Height Interactive Map Radar (Isolated z-0 stacking context) */}
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

        {/* ===================================================================
            DESTINATION 3: MY MEETUPS (Joined & Hosted Rooms + 1-Tap Chat)
           =================================================================== */}
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

        {/* ===================================================================
            DESTINATION 4: PROFILE (Logged-In User Profile, Dark Mode, Metrics & Settings)
           =================================================================== */}
        {activeNav === 'PROFILE' && (
          <div className="space-y-5">
            {isSignedOut ? (
              /* Signed-Out State (Only shown if user explicitly signs out) */
              <div className="bg-white dark:bg-slate-900 rounded-[26px] p-8 text-center border border-slate-200 dark:border-slate-800 shadow-ambient space-y-4 max-w-md mx-auto mt-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-sm">
                  <Compass className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-950 dark:text-white">
                    Sign In to Leave The Room
                  </h1>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                    Sign in to your account to join meetups, check in, and chat
                    with players nearby.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="min-h-[48px] w-full rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    <GoogleIcon className="w-5 h-5 shrink-0" />
                    <span>Continue with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAppleSignIn}
                    className="min-h-[48px] w-full rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    <AppleIcon className="w-5 h-5 shrink-0" />
                    <span>Continue with Apple</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSwitchUser(activeUser.id);
                    }}
                    className="min-h-[44px] w-full py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm"
                  >
                    Continue as {activeUser.name}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalTab('LOGIN');
                      setIsAuthModalOpen(true);
                    }}
                    className="min-h-[44px] w-full py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-extrabold shadow-sm"
                  >
                    More Sign In Options
                  </button>
                </div>
              </div>
            ) : (
              /* Logged-In Profile Screen (No Register or Sign-Up Prompts!) */
              <>
                {/* 1. Logged-In User Identity Card */}
                <section className="bg-white dark:bg-slate-900 rounded-[26px] p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-ambient space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={activeUser.avatar}
                          alt={activeUser.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 ring-indigo-600"
                        />
                        {activeUser.verified && (
                          <span
                            title="Verified Player"
                            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h1 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white">
                            {activeUser.name}, {activeUser.age}
                          </h1>
                          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 text-xs font-extrabold">
                            {activeUser.skillBadge}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                          {activeUser.neighborhood}
                        </p>

                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                          {activeUser.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeUser.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => setIsAdminModalOpen(true)}
                          className="min-h-[44px] px-3.5 sm:px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-300" />
                          <span>Admin Console</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalTab('EDIT');
                          setIsAuthModalOpen(true);
                        }}
                        className="min-h-[44px] px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Edit Profile</span>
                      </button>
                    </div>
                  </div>

                  {/* Verification Status Banner */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    {activeUser.verified ? (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                        <span className="flex items-center gap-2 font-bold">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Verified Member Identity
                        </span>
                        <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 px-2 py-0.5 rounded-full font-extrabold">Active</span>
                      </div>
                    ) : activeUser.verificationStatus === 'PENDING' ? (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                        <span className="flex items-center gap-2 font-bold">
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          Verification Under Review by Admin
                        </span>
                        <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 px-2 py-0.5 rounded-full font-extrabold">Pending</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                        <div>
                          <p className="font-bold">Account Unverified</p>
                          <p className="text-[11px] text-slate-500">Request identity verification to get your verified badge.</p>
                        </div>
                        <button
                          type="button"
                          disabled={isRequestingVerification}
                          onClick={() => handleRequestVerification()}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
                        >
                          {isRequestingVerification ? 'Submitting...' : 'Request Verification'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Favorite Activities Chips */}
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
                      Plays:
                    </span>
                    {activeUser.favoriteActivities.map((act) => (
                      <span
                        key={act}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-extrabold"
                      >
                        <CategoryIcon
                          category={act}
                          className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"
                        />
                        {act}
                      </span>
                    ))}
                  </div>

                  {/* Reliability, Rating & Attendance Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <div className="text-lg font-extrabold text-emerald-900 dark:text-emerald-300">
                        {activeUser.reliabilityScore}%
                      </div>
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                        Show-Up Rate
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                      <div className="text-lg font-extrabold text-amber-950 dark:text-amber-300 flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                        {activeUser.ratingAvg}
                      </div>
                      <div className="text-xs font-bold text-amber-900 dark:text-amber-400">
                        Player Rating ({activeUser.ratingCount})
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                      <div className="text-lg font-extrabold text-indigo-950 dark:text-indigo-200">
                        {activeUser.meetupsAttended}
                      </div>
                      <div className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                        Meetups Joined
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="text-lg font-extrabold text-slate-950 dark:text-white">
                        {activeUser.hoursPlayed}h
                      </div>
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Hours Played
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Dark Mode & Appearance Toggle Card */}
                <section className="bg-white dark:bg-slate-900 rounded-[26px] p-5 border border-slate-200 dark:border-slate-800 shadow-ambient">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        {isDarkMode ? (
                          <Moon className="w-5 h-5" />
                        ) : (
                          <Sun className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-950 dark:text-white">
                          Appearance & Dark Mode
                        </h2>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {isDarkMode
                            ? 'Dark theme active: high-contrast night palette'
                            : 'Light theme active: switch to Dark Mode anytime'}
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsDarkMode(false)}
                        className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 transition-all ${
                          !isDarkMode
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDarkMode(true)}
                        className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 transition-all ${
                          isDarkMode
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-950'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        Dark
                      </button>
                    </div>
                  </div>
                </section>

                {/* 3. "Want-to-Play" Availability Beacon (Cleanly Housed in Profile) */}
                <section className="bg-white dark:bg-slate-900 rounded-[26px] p-5 border border-slate-200 dark:border-slate-800 shadow-ambient">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          activeUser.beacon?.active
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Radio className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm sm:text-base font-extrabold text-slate-950 dark:text-white">
                            Want-to-Play Alerts
                          </h2>
                          {activeUser.beacon?.active && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 text-[10px] font-extrabold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Get notified when a matching{' '}
                          {activeUser.favoriteActivities.join(' or ')} meetup
                          starts nearby
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleBeacon}
                      className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-extrabold shrink-0 transition-all ${
                        activeUser.beacon?.active
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {activeUser.beacon?.active ? 'Alerts ON' : 'Turn On'}
                    </button>
                  </div>
                </section>

                {/* 4. Logged-In Profile & Account Actions List */}
                <section className="bg-white dark:bg-slate-900 rounded-[26px] border border-slate-200 dark:border-slate-800 shadow-ambient divide-y divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsMetricsModalOpen(true)}
                    className="w-full min-h-[56px] px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-950 dark:text-white">
                          Metrics, Ratings & Regular Partners
                        </div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Rate players you met and view activity stats
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsNotifDrawerOpen(true)}
                    className="w-full min-h-[56px] px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-950 dark:text-white">
                            Notifications
                          </span>
                          {unreadNotifCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold">
                              {unreadNotifCount} New
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Join requests, check-ins & mobile push alerts
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="w-full min-h-[56px] px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-950 dark:text-white">
                          App Settings, Push & Blocked Players
                        </div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Distance units ({distanceUnit}), audio/haptics, and
                          ban list
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </section>

                {/* 1-Tap Language Picker Card (EN, UK, PL, DE, FR - Zero Emojis) */}
                <section className="bg-white dark:bg-slate-900 rounded-[26px] p-5 border border-slate-200 dark:border-slate-800 shadow-ambient space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Language / Мова / Język / Sprache / Langue
                    </h2>
                    <span className="text-xs font-extrabold text-brand uppercase">
                      {currentLang.toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={`min-h-[44px] px-3 py-2 rounded-2xl border text-center font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                          currentLang === lang.code
                            ? 'bg-brand text-white border-brand shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-extrabold text-[11px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10">
                          {lang.flag}
                        </span>
                        <span>{lang.nativeName}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Community Policies & In-Person Safety Section */}
                <section className="bg-white dark:bg-slate-900 rounded-[26px] p-5 border border-slate-200 dark:border-slate-800 shadow-ambient space-y-3">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Community Policies & In-Person Safety
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <h3 className="font-extrabold text-slate-950 dark:text-white mb-1">Community Guidelines</h3>
                      <p className="text-slate-600 dark:text-slate-400">Respectful, inclusive in-person interaction. Zero tolerance for harassment or flaking.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <h3 className="font-extrabold text-slate-950 dark:text-white mb-1">In-Person Safety</h3>
                      <p className="text-slate-600 dark:text-slate-400">All meetups occur at verified public parks, cafes, and venues. Check in upon arrival.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <h3 className="font-extrabold text-slate-950 dark:text-white mb-1">Terms of Service</h3>
                      <p className="text-slate-600 dark:text-slate-400">Verified identity standards, reliable attendance ratings, and participant accountability.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <h3 className="font-extrabold text-slate-950 dark:text-white mb-1">Privacy Policy</h3>
                      <p className="text-slate-600 dark:text-slate-400">Precise location is never shared with third parties. No advertising tracking.</p>
                    </div>
                  </div>
                </section>

                {/* 5. Demo Perspective Switcher & Sign Out */}
                <section className="bg-white dark:bg-slate-900 rounded-[26px] p-5 border border-slate-200 dark:border-slate-800 shadow-ambient space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Switch Active Demo Account
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetDemoData}
                      className="min-h-[36px] px-2.5 inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Demo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {personas.map((persona) => {
                      const isSelected = persona.id === activeUser.id;
                      return (
                        <button
                          key={persona.id}
                          type="button"
                          onClick={() => handleSwitchUser(persona.id)}
                          className={`min-h-[52px] p-2.5 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-600'
                              : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={persona.avatar}
                              alt={persona.name}
                              className="w-9 h-9 rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-950 dark:text-white truncate">
                                {persona.name}, {persona.age}
                              </div>
                              <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                                {persona.skillBadge}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="min-h-[44px] px-5 py-2 rounded-full text-xs font-extrabold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </main>

      {/* Ergonomic thumb-friendly Floating Action Button (FAB) for hosting meetups */}
      <button
        type="button"
        onClick={() => openHostModal({ startTime: 'Now' })}
        aria-label="Host Meetup"
        className="fixed bottom-20 right-4 z-40 min-h-[52px] px-5 py-3 rounded-full bg-brand hover:bg-brand-hover active:scale-95 text-white text-sm font-extrabold shadow-ambient-lg inline-flex items-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Plus className="w-5 h-5 stroke-[2.8]" />
        <span>Host Meetup</span>
      </button>

      {/* =====================================================================
          PERSISTENT BOTTOM NAVIGATION (Explore, Map, My Meetups, Profile)
          >= 44x44px Touch Targets, No Cards Tab, No Top Nav Bar
         ===================================================================== */}
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
    </div>
  );
}
