'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Plus,
  Map as MapIcon,
} from 'lucide-react';
import { OpenDoorLogo } from '@/components/OpenDoorLogo';
import {
  ActivityCategory,
  ActivityGroup,
  AppNotification,
  DirectMessage,
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
  GROUPED_ACTIVITIES,
  getBroadCategory,
} from '@/components/CategoryIcon';
import {
  SupportedLanguage,
  getTranslation,
} from '@/lib/i18n';
import { ToastNotification } from '@/components/ToastNotification';
import { ExploreView } from '@/components/ExploreView';
import { ProfileView } from '@/components/ProfileView';
import { RadiusSelectorBottomSheet } from '@/components/RadiusSelectorBottomSheet';
import { CitySelectorBottomSheet } from '@/components/CitySelectorBottomSheet';
import { POPULAR_CITIES } from '@/lib/cities';
import { CategoryFilterBottomSheet } from '@/components/CategoryFilterBottomSheet';
import { CommunityPoliciesModal } from '@/components/CommunityPoliciesModal';
import { LanguageSelectorBottomSheet } from '@/components/LanguageSelectorBottomSheet';
import { RoomDetailModal } from '@/components/RoomDetailModal';
import { CreateLobbyModal } from '@/components/CreateLobbyModal';
import { AuthProfileModal } from '@/components/AuthProfileModal';
import { MetricsModal } from '@/components/MetricsModal';
import { SettingsModal } from '@/components/SettingsModal';
import { AdminAccountsModal } from '@/components/AdminAccountsModal';
import { BottomNav } from '@/components/BottomNav';
import { MyMeetupsView } from '@/components/MyMeetupsView';
import { AgeSelectorBottomSheet } from '@/components/AgeSelectorBottomSheet';
import {
  MobilePushBanner,
  NotificationDrawer,
} from '@/components/NotificationCenter';
import { PhotoLightboxModal } from '@/components/PhotoLightboxModal';
import { PlayerProfileSheet } from '@/components/PlayerProfileSheet';
import { FriendsChatDrawer } from '@/components/FriendsChatDrawer';
import { EditMeetupModal } from '@/components/EditMeetupModal';

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
    DEMO_PERSONAS[0]?.id || ''
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
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
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false);
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

  // Social, Lightbox, Bookmarks & Edit Meetup States
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [isFriendsDrawerOpen, setIsFriendsDrawerOpen] = useState(false);
  const [activeChatPartnerId, setActiveChatPartnerId] = useState<string | null>(null);
  const [inspectedUserId, setInspectedUserId] = useState<string | null>(null);
  const [editingLobbyId, setEditingLobbyId] = useState<string | null>(null);
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    name?: string;
    age?: number;
    verified?: boolean;
    photoVerified?: boolean;
    neighborhood?: string;
  }>({ isOpen: false, imageUrl: null });

  const [sessionUser, setSessionUser] = useState<UserPersona | null>(null);

  const GUEST_FALLBACK_USER: UserPersona = useMemo(() => ({
    id: 'guest',
    name: 'Explorer',
    age: 0,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    skillBadge: 'New Member',
    tagline: 'Ready to discover meetups',
    neighborhood: 'Select your city',
    onboarded: false,
    verified: false,
    photoVerified: false,
    role: 'USER',
    isBanned: false,
    favoriteActivities: ['Coffee', 'Park Walk'],
    reliabilityScore: 100,
    meetupsAttended: 0,
    hoursPlayed: 0,
    ratingAvg: 5.0,
    ratingCount: 0,
    streakWeeks: 1,
    bannedUserIds: [],
    regularPartnerIds: [],
    friendIds: [],
    incomingFriendRequestIds: [],
    outgoingFriendRequestIds: [],
    savedLobbyIds: [],
    settings: {
      iosAndroidPush: true,
      soundEffects: true,
      hapticFeedback: true,
      distanceUnit: 'km',
      profileVisible: true,
      showReliabilityScore: true,
    },
  }), []);

  const activeUser = useMemo(
    () =>
      personas.find((p) => p.id === activePersonaId) ||
      (sessionUser && sessionUser.id === activePersonaId ? sessionUser : null) ||
      personas[0] ||
      GUEST_FALLBACK_USER,
    [personas, activePersonaId, sessionUser, GUEST_FALLBACK_USER]
  );

  const hasPromptedOnboarding = useRef(false);
  useEffect(() => {
    if (
      !hasPromptedOnboarding.current &&
      activeUser &&
      (activeUser.onboarded === false ||
        !activeUser.age ||
        activeUser.age < 18 ||
        activeUser.neighborhood === 'Select your city' ||
        !activeUser.neighborhood) &&
      !isSignedOut
    ) {
      hasPromptedOnboarding.current = true;
      setAuthModalTab('EDIT');
      setIsAuthModalOpen(true);
    }
  }, [activeUser, isSignedOut]);

  // Initialize theme from localStorage or default to dark
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored =
        localStorage.getItem('leavetheroom_theme') ||
        localStorage.getItem('seeme_theme');
      if (stored === 'light') {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      } else {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
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
        setPersonas((prev) => {
          const merged = [...data.personas];
          prev.forEach((existing) => {
            if (
              (existing.id === activePersonaId || existing.authProvider === 'google' || existing.authProvider === 'apple') &&
              !merged.some((p: UserPersona) => p.id === existing.id)
            ) {
              merged.unshift(existing);
            }
          });
          return merged;
        });
      }
      if (Array.isArray(data.ratings)) {
        setRatings(data.ratings);
      }
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
      if (Array.isArray(data.directMessages)) {
        setDirectMessages(data.directMessages);
      }
      try {
        const usersRes = await fetch('/api/users', { cache: 'no-store' });
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (Array.isArray(usersData.personas) && usersData.personas.length > 0) {
            setPersonas((prev) => {
              const merged = [...usersData.personas];
              prev.forEach((existing) => {
                if (
                  (existing.id === activePersonaId || existing.authProvider === 'google' || existing.authProvider === 'apple') &&
                  !merged.some((p: UserPersona) => p.id === existing.id)
                ) {
                  merged.unshift(existing);
                }
              });
              return merged;
            });
          }
          if (Array.isArray(usersData.directMessages)) {
            setDirectMessages(usersData.directMessages);
          }
          if (Array.isArray(usersData.notifications)) {
            setNotifications(usersData.notifications);
          }
        }
      } catch {}
    } catch {
      // Fallback to local seed state
    }
  }, []);

  useEffect(() => {
    fetchLobbies();
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchLobbies();
      }
    }, 12000);
    return () => clearInterval(intervalId);
  }, [fetchLobbies]);

  // Load persistent user session from server cookie or localStorage
  useEffect(() => {
    async function checkSession() {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const authStatus = url.searchParams.get('auth');
        const authError = url.searchParams.get('auth_error') || url.searchParams.get('oauth_error');
        const sharedMeetupId = url.searchParams.get('meetup') || url.searchParams.get('room');
        if (sharedMeetupId) {
          setSelectedLobbyId(sharedMeetupId);
        }
        if (authStatus === 'success') {
          showToast('Signed in successfully!');
          url.searchParams.delete('auth');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        } else if (authError) {
          showToast(`Sign in error: ${authError}`);
          setTimeout(() => showToast(`Sign in error: ${authError}`), 150);
          url.searchParams.delete('auth_error');
          url.searchParams.delete('oauth_error');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        }

        let loggedInUser: UserPersona | null = null;
        try {
          const res = await fetch('/api/auth/session', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data.authenticated && data.user) {
              const authedUser: UserPersona = data.user;
              loggedInUser = authedUser;
              setSessionUser(authedUser);
              setPersonas((prev) => {
                const without = prev.filter((p) => p.id !== authedUser.id);
                return [authedUser, ...without];
              });
              setActivePersonaId(authedUser.id);
              setIsSignedOut(false);
              localStorage.setItem('leavetheroom_session_user_id', authedUser.id);
              localStorage.setItem('seeme_session_user_id', authedUser.id);
              if (authedUser.onboarded === false || authedUser.neighborhood === 'Select your city') {
                setAuthModalTab('EDIT');
                setIsAuthModalOpen(true);
              }
            }
          }
        } catch {
          // fallback to localStorage
        }

        if (!loggedInUser) {
          const savedSession =
            localStorage.getItem('leavetheroom_session_user_id') ||
            localStorage.getItem('seeme_session_user_id');
          if (savedSession && savedSession !== 'signed_out') {
            setActivePersonaId(savedSession);
            setIsSignedOut(false);
            const foundInList = personas.find((p) => p.id === savedSession);
            if (foundInList) loggedInUser = foundInList;
          } else {
            setIsSignedOut(true);
          }
        }

        // Load saved city location if available, or initialize from user's chosen city
        const savedLoc = localStorage.getItem('leavetheroom_user_location');
        if (savedLoc) {
          try {
            const parsed = JSON.parse(savedLoc);
            if (parsed.lat && parsed.lng && parsed.label) {
              setUserCoords({
                lat: parsed.lat,
                lng: parsed.lng,
                label: parsed.label,
                isLiveGps: false,
              });
            }
          } catch {}
        } else if (loggedInUser) {
          const userCity = loggedInUser.neighborhood;
          if (userCity && userCity !== 'Greenwich Village') {
            const matchedPreset = POPULAR_CITIES.find(
              (c) =>
                c.label.toLowerCase().includes(userCity.toLowerCase()) ||
                c.name.toLowerCase() === userCity.toLowerCase()
            );
            if (matchedPreset) {
              const newCoords = {
                lat: matchedPreset.lat,
                lng: matchedPreset.lng,
                label: matchedPreset.label,
                isLiveGps: false,
              };
              setUserCoords(newCoords);
              localStorage.setItem('leavetheroom_user_location', JSON.stringify(newCoords));
            } else {
              setIsCitySelectorOpen(true);
            }
          } else {
            // First time login with no city selected -> prompt user to select their city
            setIsCitySelectorOpen(true);
          }
        }

        setHasCheckedSession(true);
      }
    }
    checkSession();
  }, [showToast]);

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
    fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'LOGOUT' }),
    }).catch(() => {});
    showToast('Signed out of Leave The Room');
  };

  const handleGoogleSignIn = async () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/google';
    }
  };

  const handleAppleSignIn = async () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/apple';
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

      if (showSavedOnly) {
        const savedIds = activeUser.savedLobbyIds || [];
        if (!savedIds.includes(lobby.id)) {
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
    showSavedOnly,
    activeUser.savedLobbyIds,
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
      showToast('Please sign in to join or interact with meetups');
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
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': activeUser.id,
        Authorization: `Bearer ${activeUser.id}`,
      },
      body: JSON.stringify({
        action: 'TOGGLE_BEACON',
        userId: activeUser.id,
        beacon: {
          active: nextActive,
          categories: beaconCats,
          radiusKm,
          note: `Open to play ${beaconCats.join(', ')} nearby`,
        },
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

  const handleSelectCity = async (city: { lat: number; lng: number; label: string }) => {
    setUserCoords({
      lat: city.lat,
      lng: city.lng,
      label: city.label,
      isLiveGps: false,
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('leavetheroom_user_location', JSON.stringify(city));
    }
    // Update active user's neighborhood in memory and persist to DB
    if (!isSignedOut && activeUser?.id) {
      setPersonas((prev) =>
        prev.map((p) => (p.id === activeUser.id ? { ...p, neighborhood: city.label } : p))
      );
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'UPDATE_PROFILE',
            userId: activeUser.id,
            neighborhood: city.label,
          }),
        });
      } catch {}
    }
    showToast(`Location set to ${city.label}`);
    triggerSensoryFeedback('TAP', activeUser.settings);
  };

  const handleNearMeGps = () => {
    if (userCoords.isLiveGps) {
      setUserCoords({
        lat: DEFAULT_USER_COORDS.lat,
        lng: DEFAULT_USER_COORDS.lng,
        label: DEFAULT_USER_COORDS.label,
        isLiveGps: false,
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('leavetheroom_user_location');
      }
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
        const newCoords = {
          lat: latitude,
          lng: longitude,
          label: 'Current GPS Location',
          isLiveGps: true,
        };
        setUserCoords(newCoords);
        if (typeof window !== 'undefined') {
          localStorage.setItem('leavetheroom_user_location', JSON.stringify(newCoords));
        }
        showToast('Updated to your current GPS location');
      },
      () => {
        setIsLocating(false);
        showToast('GPS unavailable. You can choose your city manually.');
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
      showToast('Please sign in to join or interact with meetups');
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

  // Social: Open Lightbox
  const handleOpenLightbox = useCallback(
    (
      imageUrl: string,
      name?: string,
      age?: number,
      verified?: boolean,
      neighborhood?: string
    ) => {
      if (!imageUrl) return;
      setLightboxData({
        isOpen: true,
        imageUrl,
        name,
        age,
        verified,
        photoVerified: verified,
        neighborhood,
      });
    },
    []
  );

  // Social: Friend Requests & Direct Messages
  const handleSendFriendRequest = async (targetUserId: string) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': activeUser.id,
        Authorization: `Bearer ${activeUser.id}`,
      },
      body: JSON.stringify({
        action: 'SEND_FRIEND_REQUEST',
        targetUserId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.personas)) setPersonas(data.personas);
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      triggerSensoryFeedback('SUCCESS', activeUser.settings);
      showToast('Friend request sent!');
    }
  };

  const handleAcceptFriendRequest = async (targetUserId: string) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': activeUser.id,
        Authorization: `Bearer ${activeUser.id}`,
      },
      body: JSON.stringify({
        action: 'ACCEPT_FRIEND_REQUEST',
        targetUserId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.personas)) setPersonas(data.personas);
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      triggerSensoryFeedback('SUCCESS', activeUser.settings);
      showToast('Friend request accepted!');
    }
  };

  const handleRemoveOrDeclineFriend = async (targetUserId: string) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': activeUser.id,
        Authorization: `Bearer ${activeUser.id}`,
      },
      body: JSON.stringify({
        action: 'DECLINE_OR_REMOVE_FRIEND',
        targetUserId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.personas)) setPersonas(data.personas);
      showToast('Updated friend list');
    }
  };

  const handleSendDirectMessage = async (
    toUserId: string,
    text: string,
    lobbyInviteId?: string
  ) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': activeUser.id,
        Authorization: `Bearer ${activeUser.id}`,
      },
      body: JSON.stringify({
        action: 'SEND_DIRECT_MESSAGE',
        toUserId,
        text,
        lobbyInviteId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.directMessages)) {
        setDirectMessages(data.directMessages);
      }
      triggerSensoryFeedback('TAP', activeUser.settings);
    }
  };

  const handleToggleSaveLobby = async (lobbyId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSignedOut) {
      showToast('Please sign in to join or interact with meetups');
      setAuthModalTab('LOGIN');
      setIsAuthModalOpen(true);
      return;
    }
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': activeUser.id,
        Authorization: `Bearer ${activeUser.id}`,
      },
      body: JSON.stringify({
        action: 'TOGGLE_SAVE_LOBBY',
        lobbyId,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.personas)) setPersonas(data.personas);
      const isNowSaved = data.persona?.savedLobbyIds?.includes(lobbyId);
      triggerSensoryFeedback('TAP', activeUser.settings);
      showToast(isNowSaved ? 'Meetup saved to Bookmarks' : 'Removed from Saved');
    }
  };

  const inspectedUser = useMemo(
    () => (inspectedUserId ? personas.find((p) => p.id === inspectedUserId) || null : null),
    [personas, inspectedUserId]
  );

  const editingLobby = useMemo(
    () => (editingLobbyId ? lobbiesWithDistance.find((l) => l.id === editingLobbyId) || null : null),
    [lobbiesWithDistance, editingLobbyId]
  );

  const activeHostedLobby = useMemo(
    () =>
      lobbiesWithDistance.find(
        (l) => l.hostId === activeUser.id && l.computedStatus !== 'FINISHED'
      ) || null,
    [lobbiesWithDistance, activeUser.id]
  );


  if (!hasCheckedSession) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="animate-pulse">
          <OpenDoorLogo className="w-16 h-16 drop-shadow-sm" size={64} />
        </div>
      </div>
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
      <ToastNotification message={toastMessage} />

      <main className={`w-full max-w-xl mx-auto flex-1 px-4 pt-3 ${activeNav === 'MAP' ? 'pb-20' : 'pb-24'}`}>
        {/* Sleek sticky top guest bar when signed out (EXPLORE view only) */}
        {isSignedOut && activeNav === 'EXPLORE' && (
          <div className="sticky top-2 z-40 mb-3 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-[#1C1917]/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <OpenDoorLogo className="w-8 h-8 shrink-0" size={32} />
              <div className="min-w-0">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate block">
                  Leave The Room
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate block">
                  Browse live meetups nearby. Sign in to join or host.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthModalTab('LOGIN');
                setIsAuthModalOpen(true);
              }}
              className="shrink-0 min-h-[32px] px-3.5 py-1.5 rounded-xl bg-stone-900 dark:bg-white hover:opacity-90 text-white dark:text-stone-950 text-xs font-semibold transition cursor-pointer"
            >
              Sign In
            </button>
          </div>
        )}

        {activeNav === 'EXPLORE' && (
          <ExploreView
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery('')}
            selectedBroadCategory={selectedBroadCategory}
            categoryCounts={categoryCounts}
            totalLobbiesCount={lobbiesWithDistance.length}
            onOpenCategorySheet={() => setIsCategorySheetOpen(true)}
            userLocationLabel={userCoords.label}
            onNearMeGps={handleNearMeGps}
            onOpenCitySelector={() => setIsCitySelectorOpen(true)}
            radiusKm={radiusKm}
            formatRadiusUnit={formatRadiusUnit}
            onOpenRadiusSheet={() => setIsRadiusSheetOpen(true)}
            onSelectRadius={(km) => setRadiusKm(km)}
            selectedAgeFilters={selectedAgeFilters}
            onOpenAgeSheet={() => setIsAgeSheetOpen(true)}
            onToggleAgeFilter={(ageId) => {
              setSelectedAgeFilters((prev) =>
                prev.includes(ageId) ? prev.filter((id) => id !== ageId) : [...prev, ageId]
              );
            }}
            onClearAgeFilters={() => setSelectedAgeFilters([])}
            statusFilter={statusFilter}
            onToggleStatusFilter={() =>
              setStatusFilter(statusFilter === 'LIVE' ? 'ALL' : 'LIVE')
            }
            filteredLobbiesCount={filteredLobbies.length}
            availableToJoinLobbies={availableToJoinLobbies}
            joinedFilteredLobbies={joinedFilteredLobbies}
            activeUser={activeUser}
            isSignedOut={isSignedOut}
            personas={personas}
            onClickUser={(userId) => {
              if (isSignedOut) {
                showToast('Please sign in to join or interact with meetups');
                setAuthModalTab('LOGIN');
                setIsAuthModalOpen(true);
                return;
              }
              setInspectedUserId(userId);
            }}
            onToggleBeacon={handleToggleBeacon}
            savedLobbyIds={activeUser.savedLobbyIds || []}
            onToggleSaveLobby={handleToggleSaveLobby}
            showSavedOnly={showSavedOnly}
            onToggleSavedOnly={() => setShowSavedOnly((prev) => !prev)}
            onSelectLobby={(lobbyId) => {
              if (isSignedOut) {
                showToast('Please sign in to join or interact with meetups');
                setAuthModalTab('LOGIN');
                setIsAuthModalOpen(true);
                return;
              }
              setSelectedLobbyId(lobbyId);
            }}
            onQuickJoin={handleQuickJoin}
            joiningLobbyId={joiningLobbyId}
            currentLang={currentLang}
            onOpenHostModal={() =>
              openHostModal({
                category:
                  selectedCategory !== 'All'
                    ? selectedCategory
                    : selectedGroup !== 'All Activities'
                    ? GROUPED_ACTIVITIES[selectedGroup][0]
                    : 'Coffee',
                startTime: statusFilter === 'UPCOMING' ? 'In 30 mins' : 'Now',
              })
            }
            onResetFilters={() => {
              setSelectedBroadCategory('All Categories');
              setSelectedCategory('All');
              setStatusFilter('ALL');
              setRadiusKm(50);
              setSelectedAgeFilters([]);
              setShowSavedOnly(false);
            }}
          />
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
                          ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 border-stone-900 dark:border-white shadow-xs'
                          : 'bg-white dark:bg-[#1C1917] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span>{catName === 'All Categories' ? 'All Meetups' : catName}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSelected
                            ? 'bg-stone-800 text-stone-200 dark:bg-stone-200 dark:text-stone-800'
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
              isSignedOut={isSignedOut}
              onRequestSignIn={() => {
                setAuthModalTab('LOGIN');
                setIsAuthModalOpen(true);
              }}
              onSelectLobby={(item) => {
                if (isSignedOut) {
                  showToast('Please sign in to join or interact with meetups');
                  setAuthModalTab('LOGIN');
                  setIsAuthModalOpen(true);
                  return;
                }
                setSelectedLobbyId(item.id);
              }}
              onQuickJoin={handleQuickJoin}
            />
          </div>
        )}

        {activeNav === 'MY_MEETUPS' && (
          <MyMeetupsView
            activeUser={activeUser}
            lobbies={lobbiesWithDistance}
            savedLobbyIds={activeUser.savedLobbyIds || []}
            selectedLobbyId={selectedLobbyId}
            onSelectLobby={(id) => setSelectedLobbyId(id)}
            onOpenHostModal={openHostModal}
            onQuickJoin={handleQuickJoin}
            onNavigateExplore={() => setActiveNav('EXPLORE')}
            nearestOpenMeetup={nearestOpenMeetup}
          />
        )}

        {activeNav === 'PROFILE' && (
          <ProfileView
            isSignedOut={isSignedOut}
            activeUser={activeUser}
            personas={personas}
            isDarkMode={isDarkMode}
            currentLang={currentLang}
            onGoogleSignIn={handleGoogleSignIn}
            onAppleSignIn={handleAppleSignIn}
            onSwitchUser={handleSwitchUser}
            onOpenAuthModal={() => {
              setAuthModalTab('LOGIN');
              setIsAuthModalOpen(true);
            }}
            onOpenEditProfile={() => {
              setAuthModalTab('EDIT');
              setIsAuthModalOpen(true);
            }}
            onToggleDarkMode={(isDark) => setIsDarkMode(isDark)}
            onOpenLanguageSheet={() => setIsLanguageSheetOpen(true)}
            onOpenPoliciesModal={() => setIsPoliciesModalOpen(true)}
            onResetDemoData={handleResetDemoData}
            onSignOut={handleSignOut}
            onToggleBeacon={handleToggleBeacon}
            onOpenCitySelector={() => setIsCitySelectorOpen(true)}
            onOpenLightbox={(url, name) =>
              handleOpenLightbox(url, name, activeUser.age, Boolean(activeUser.photoVerified), activeUser.neighborhood)
            }
            onOpenFriendsDrawer={() => setIsFriendsDrawerOpen(true)}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeNav}
        onOpenHostModal={() => openHostModal({ startTime: 'Now' })}
        onChangeTab={(tab) => {
          if (tab === 'MY_MEETUPS' && isSignedOut) {
            showToast('Please sign in to join or interact with meetups');
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
        isSaved={Boolean(selectedLobby && activeUser.savedLobbyIds?.includes(selectedLobby.id))}
        onToggleSave={(lobbyId) => handleToggleSaveLobby(lobbyId)}
        onOpenEditMeetup={(lobbyToEdit) => setEditingLobbyId(lobbyToEdit.id)}
        onClickParticipant={(userId) => setInspectedUserId(userId)}
        onOpenLightbox={handleOpenLightbox}
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

      {/* Host Edit Meetup Modal */}
      {editingLobby && (
        <EditMeetupModal
          isOpen={Boolean(editingLobby)}
          onClose={() => setEditingLobbyId(null)}
          lobby={editingLobby}
          activeUser={activeUser}
          onUpdated={async () => {
            await fetchLobbies();
            showToast('Meetup details updated!');
          }}
        />
      )}

      {/* Player Profile Sheet (Tinder / Badoo / Yubo Style) */}
      <PlayerProfileSheet
        user={inspectedUser}
        activeUser={activeUser}
        isOpen={Boolean(inspectedUser)}
        onClose={() => setInspectedUserId(null)}
        onOpenLightbox={handleOpenLightbox}
        onSendFriendRequest={handleSendFriendRequest}
        onAcceptFriendRequest={handleAcceptFriendRequest}
        onRemoveFriend={handleRemoveOrDeclineFriend}
        onOpenDirectChat={(targetUser) => {
          setInspectedUserId(null);
          setActiveChatPartnerId(targetUser.id);
          setIsFriendsDrawerOpen(true);
        }}
        onBlockUser={(targetUserId) => {
          setInspectedUserId(null);
          handleBanOrUnbanUser(targetUserId, 'BAN_USER');
        }}
      />

      {/* Friends & 1-on-1 Direct Messages Drawer */}
      <FriendsChatDrawer
        isOpen={isFriendsDrawerOpen}
        onClose={() => setIsFriendsDrawerOpen(false)}
        activeUser={activeUser}
        personas={personas}
        directMessages={directMessages}
        activeChatPartnerId={activeChatPartnerId}
        onSelectChatPartner={(uid) => setActiveChatPartnerId(uid)}
        onSendDirectMessage={handleSendDirectMessage}
        onAcceptFriendRequest={handleAcceptFriendRequest}
        onDeclineFriendRequest={handleRemoveOrDeclineFriend}
        onSendFriendRequest={handleSendFriendRequest}
        onOpenPlayerProfile={(user) => setInspectedUserId(user.id)}
        onOpenLightbox={(url, name) => handleOpenLightbox(url, name)}
        activeHostedLobbyId={activeHostedLobby?.id || null}
      />

      {/* Full-Screen Profile Photo Lightbox */}
      <PhotoLightboxModal
        isOpen={lightboxData.isOpen}
        imageUrl={lightboxData.imageUrl}
        name={lightboxData.name}
        age={lightboxData.age}
        verified={lightboxData.verified}
        photoVerified={lightboxData.photoVerified}
        neighborhood={lightboxData.neighborhood}
        onClose={() => setLightboxData((prev) => ({ ...prev, isOpen: false }))}
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
        onSelectCity={handleSelectCity}
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
      <RadiusSelectorBottomSheet
        isOpen={isRadiusSheetOpen}
        onClose={() => setIsRadiusSheetOpen(false)}
        radiusKm={radiusKm}
        onSelectRadius={(val) => {
          setRadiusKm(val);
          triggerSensoryFeedback('TAP', activeUser.settings);
        }}
        userLocationLabel={userCoords.label}
        onOpenCitySelector={() => setIsCitySelectorOpen(true)}
      />

      {/* City & Country Location Selector Bottom Sheet */}
      <CitySelectorBottomSheet
        isOpen={isCitySelectorOpen}
        onClose={() => setIsCitySelectorOpen(false)}
        currentLocationLabel={userCoords.label}
        onSelectCity={handleSelectCity}
        onUseCurrentGps={handleNearMeGps}
        isLocating={isLocating}
      />

      {/* Activity Type Category Filter Bottom Sheet */}
      <CategoryFilterBottomSheet
        isOpen={isCategorySheetOpen}
        onClose={() => setIsCategorySheetOpen(false)}
        selectedBroadCategory={selectedBroadCategory}
        onSelectCategory={(catName) => {
          setSelectedBroadCategory(catName);
          triggerSensoryFeedback('TAP', activeUser.settings);
        }}
        categoryCounts={categoryCounts}
        currentLang={currentLang}
      />

      {/* Community Policies & Safety Guidelines Modal */}
      <CommunityPoliciesModal
        isOpen={isPoliciesModalOpen}
        onClose={() => setIsPoliciesModalOpen(false)}
        currentLang={currentLang}
      />

      {/* Sleek Custom Language Bottom Sheet */}
      <LanguageSelectorBottomSheet
        isOpen={isLanguageSheetOpen}
        onClose={() => setIsLanguageSheetOpen(false)}
        currentLang={currentLang}
        onSelectLanguage={(langCode) => {
          handleLanguageSelect(langCode);
          triggerSensoryFeedback('TAP', activeUser.settings);
        }}
      />
    </div>
  );
}
