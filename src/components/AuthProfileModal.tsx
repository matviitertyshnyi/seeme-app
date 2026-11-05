'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  Upload,
  Lock,
  MapPin,
  ChevronDown,
  Camera,
  Maximize2,
  AlertCircle,
} from 'lucide-react';
import { ActivityCategory, UserPersona } from '@/types/lobby';
import {
  ACTIVITY_GROUPS,
  GROUPED_ACTIVITIES,
  CategoryIcon,
} from '@/components/CategoryIcon';
import { CityPreset, POPULAR_CITIES } from '@/lib/cities';
import { PhotoLightboxModal } from '@/components/PhotoLightboxModal';
import { verifyHumanFace } from '@/lib/face-detection';

interface AuthProfileModalProps {
  isOpen: boolean;
  initialTab?: 'LOGIN' | 'EDIT';
  onClose: () => void;
  activeUser: UserPersona;
  personas: UserPersona[];
  onSelectUser: (persona: UserPersona) => void;
  onUserCreatedOrUpdated: (
    persona: UserPersona,
    allPersonas: UserPersona[],
    message: string
  ) => void;
  onSelectCity?: (city: { lat: number; lng: number; label: string }) => void;
}

export function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function AppleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.89.04-1.98.6-2.62 1.34-.57.65-1.07 1.71-1.01 2.76.99.08 2.01-.5 2.62-1.23z" />
    </svg>
  );
}

export function AuthProfileModal({
  isOpen,
  initialTab = 'EDIT',
  onClose,
  activeUser,
  personas,
  onSelectUser,
  onUserCreatedOrUpdated,
  onSelectCity,
}: AuthProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'EDIT'>(initialTab);
  const [loginError, setLoginError] = useState('');

  // Register / Edit Form State
  const [name, setName] = useState(activeUser.name);
  const [email, setEmail] = useState(activeUser.email || '');
  const [age, setAge] = useState<number>(activeUser.age && activeUser.age >= 18 ? activeUser.age : 21);
  const [cityInput, setCityInput] = useState(
    activeUser.neighborhood && activeUser.neighborhood !== 'Select your city'
      ? activeUser.neighborhood
      : ''
  );
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [selectedCityPreset, setSelectedCityPreset] = useState<CityPreset | null>(null);
  const [avatar, setAvatar] = useState(activeUser.avatar);
  const [tagline, setTagline] = useState(activeUser.tagline);
  const [favoriteActivities, setFavoriteActivities] = useState<ActivityCategory[]>(
    activeUser.favoriteActivities || ['Coffee', 'Park Walk']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faceChecking, setFaceChecking] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const prevIsOpen = useRef(false);
  const prevUserId = useRef(activeUser?.id);

  useEffect(() => {
    const justOpened = isOpen && !prevIsOpen.current;
    const userSwitched = isOpen && activeUser?.id !== prevUserId.current;
    prevIsOpen.current = isOpen;
    prevUserId.current = activeUser?.id;

    if (justOpened || userSwitched) {
      setActiveTab(initialTab);
      setLoginError('');
      setFaceError(null);
      setEditError(null);
      if (initialTab === 'EDIT') {
        setName(activeUser.name);
        setEmail(activeUser.email || '');
        setAge(activeUser.age && activeUser.age >= 18 ? activeUser.age : 21);
        const currentCity =
          activeUser.neighborhood && activeUser.neighborhood !== 'Select your city'
            ? activeUser.neighborhood
            : '';
        setCityInput(currentCity);
        const match = POPULAR_CITIES.find(
          (c) =>
            c.label.toLowerCase() === currentCity.toLowerCase() ||
            c.name.toLowerCase() === currentCity.toLowerCase()
        );
        setSelectedCityPreset(match || null);
        setIsCityDropdownOpen(false);
        setAvatar(activeUser.avatar);
        setTagline(activeUser.tagline);
        setFavoriteActivities(
          activeUser.favoriteActivities && activeUser.favoriteActivities.length > 0
            ? activeUser.favoriteActivities
            : ['Coffee', 'Park Walk']
        );
      }
    }
  }, [isOpen, initialTab, activeUser?.id]);

  const isAgeLocked = Boolean(activeUser?.onboarded === true && activeUser?.age && activeUser.age >= 18);
  const isMandatoryOnboarding = activeUser?.onboarded === false || !activeUser?.age || activeUser?.age < 18;

  const filteredCities = useMemo(() => {
    const q = cityInput.trim().toLowerCase();
    if (!q) return POPULAR_CITIES.slice(0, 14);
    return POPULAR_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.label.toLowerCase().includes(q)
    );
  }, [cityInput]);

  if (!isOpen) return null;

  const toggleActivity = (cat: ActivityCategory) => {
    setFavoriteActivities((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleGoogleAuth = async () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/google';
    }
  };

  const handleAppleAuth = async () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/apple';
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFaceChecking(true);
    setFaceError(null);
    setEditError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const size = 320;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setFaceChecking(false);
          return;
        }

        // Center-crop
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

        // Run Human Face Verification to reject shoes / non-human images
        try {
          const result = await verifyHumanFace(dataUrl);
          if (!result.isValidFace) {
            setFaceError(result.message);
            setFaceChecking(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
            return;
          }
          setAvatar(dataUrl);
          setFaceError(null);
        } catch {
          // If detection fails unexpectedly, keep image
          setAvatar(dataUrl);
        } finally {
          setFaceChecking(false);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectCityPreset = (preset: CityPreset) => {
    setCityInput(preset.label);
    setSelectedCityPreset(preset);
    setIsCityDropdownOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!name.trim()) {
      setEditError('Please enter your full name');
      return;
    }

    const parsedAge = Number(age);
    if (!parsedAge || isNaN(parsedAge) || parsedAge < 18 || parsedAge > 99) {
      setEditError('Please enter a valid age (must be between 18 and 99)');
      return;
    }

    const chosenCity = cityInput.trim();
    if (!chosenCity || chosenCity === 'Select your city') {
      setEditError('Please select or type your city');
      return;
    }

    const hasRealFacePhoto = Boolean(
      (avatar && avatar.startsWith('data:image/')) ||
      (activeUser as any)?.photoVerified
    );

    const initialLetter = (name.trim()[0] || 'M').toUpperCase();
    const fallbackAvatar = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="%23EA580C"/><text x="50%" y="54%" font-family="system-ui,-apple-system,sans-serif" font-weight="bold" font-size="54" fill="%23FFFFFF" text-anchor="middle" dominant-baseline="middle">${initialLetter}</text></svg>`;
    const finalAvatar = (avatar && avatar.trim()) || activeUser?.avatar || fallbackAvatar;

    setIsSubmitting(true);

    const matchingCityPreset =
      selectedCityPreset ||
      POPULAR_CITIES.find(
        (c) =>
          c.label.toLowerCase() === chosenCity.toLowerCase() ||
          c.name.toLowerCase() === chosenCity.toLowerCase()
      );

    if (matchingCityPreset && onSelectCity) {
      onSelectCity({
        lat: matchingCityPreset.lat,
        lng: matchingCityPreset.lng,
        label: matchingCityPreset.label,
      });
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
          Authorization: `Bearer ${activeUser.id}`,
        },
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          userId: activeUser.id,
          name: name.trim(),
          age: parsedAge,
          onboarded: true,
          photoVerified: hasRealFacePhoto,
          neighborhood: chosenCity,
          avatar: finalAvatar,
          tagline,
          favoriteActivities,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUserCreatedOrUpdated(
          data.persona,
          data.personas,
          'Profile setup saved!'
        );
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        setEditError(errData.error || 'Failed to save profile. Please try again.');
      }
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
        aria-label="Profile Setup"
        className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-t-[28px] sm:rounded-[28px] shadow-ambient-lg border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-stone-950 dark:text-white">
              {activeTab === 'EDIT' ? 'Edit Profile' : 'Sign In & Account'}
            </h2>
            <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
              {activeTab === 'EDIT'
                ? activeUser?.onboarded === false
                  ? 'Complete Your Profile Setup — Set your photo, age, and city to start using Leave The Room'
                  : 'Update your photo, city, bio, and favorite activities'
                : 'Switch account or sign in to Leave The Room'}
            </p>
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

        {/* Authentication header when user is signed out or switching accounts */}
        {activeTab !== 'EDIT' && (
          <div className="px-6 pt-3 bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 pb-3 shrink-0">
            <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
              Sign in with your verified Google or Apple account
            </p>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: SIGN IN */}
          {activeTab === 'LOGIN' && (
            <div className="space-y-5">
              {/* Modern OAuth (Google & Apple) */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleAuth}
                  className="min-h-[48px] w-full rounded-2xl bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                >
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleAppleAuth}
                  className="min-h-[48px] w-full rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-900 dark:hover:bg-neutral-100 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-3 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                >
                  <AppleIcon className="w-5 h-5 shrink-0" />
                  <span>Continue with Apple</span>
                </button>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold">
                  {loginError}
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 flex items-center gap-2 text-[11px] font-bold text-stone-600 dark:text-stone-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Verified 1-tap sign-in with your Google or Apple ID. Fast, secure, and permanent.</span>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT CURRENT PROFILE */}
          {activeTab === 'EDIT' && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Trust & Verification Summary Strip */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
                      Verified Player Profile · {activeUser.reliabilityScore}% Reliability
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                      {activeUser.ratingAvg} Avg Rating across {activeUser.ratingCount} reviews
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Photo Upload & Selfie Camera */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                  Profile Photo (Optional)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Clickable 72x72 Avatar preview */}
                  <div
                    onClick={() => setIsLightboxOpen(true)}
                    title="Click to view full-screen photo"
                    className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 shrink-0 shadow-sm cursor-pointer group hover:ring-2 hover:ring-orange-500 transition-all"
                  >
                    <img
                      src={avatar || activeUser?.avatar}
                      alt={name || 'Profile'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Maximize2 className="w-4 h-4 drop-shadow" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Upload Photo Button */}
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-white text-xs font-extrabold border border-stone-300 dark:border-stone-700 transition-colors shadow-sm">
                        <Upload className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                        <span>Upload Photo</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </label>

                      {/* Take Live Selfie Button */}
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-extrabold border border-orange-200 dark:border-orange-800 transition-colors shadow-sm">
                        <Camera className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        <span>Take Live Selfie (Camera)</span>
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="user"
                          className="hidden"
                          onChange={handlePhotoUpload}
                        />
                      </label>
                    </div>

                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                      JPG, PNG or WEBP · Resized & center-cropped to 256x256
                    </span>
                  </div>
                </div>

                {/* Real Human Verification Status Indicator */}
                <div className="mt-3 space-y-2">
                  {faceChecking && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-bold">
                      <span className="w-3.5 h-3.5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Verifying human face in photo...</span>
                    </div>
                  )}

                  {faceError && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block">Real Human Face Required</span>
                        <span>{faceError}</span>
                      </div>
                    </div>
                  )}

                  {!faceChecking && !faceError && (
                    (avatar && avatar.startsWith('data:image/')) || (activeUser as any)?.photoVerified ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>✓ Verified Human Face Photo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-stone-600 dark:text-stone-400 text-xs font-medium">
                        <span>Profile photo is optional. You can upload a photo or selfie anytime.</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Full Name"
                    className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                  />
                </div>

                {/* Age: Locked if already set, or editable once during onboarding */}
                {isAgeLocked ? (
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                      Age
                    </label>
                    <div className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 text-xs font-bold text-stone-600 dark:text-stone-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        <span>{activeUser.age}</span>
                      </span>
                      <span className="text-[10px] text-stone-500 font-medium">Permanent</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      min={18}
                      max={99}
                      value={age}
                      onChange={(e) => setAge(Math.max(18, Math.min(99, Number(e.target.value) || 18)))}
                      aria-label="Age"
                      className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                    />
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium mt-1">
                      Set once — cannot be changed later
                    </p>
                  </div>
                )}
              </div>

              {/* City Selection from POPULAR_CITIES + Custom City */}
              <div className="relative">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                  City
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => {
                      setCityInput(e.target.value);
                      setIsCityDropdownOpen(true);
                      const match = POPULAR_CITIES.find(
                        (c) =>
                          c.label.toLowerCase() === e.target.value.trim().toLowerCase() ||
                          c.name.toLowerCase() === e.target.value.trim().toLowerCase()
                      );
                      setSelectedCityPreset(match || null);
                    }}
                    onFocus={() => setIsCityDropdownOpen(true)}
                    placeholder="Search city (e.g. Kyiv, Warsaw, Berlin, London, New York...)"
                    aria-label="City"
                    className="min-h-[44px] w-full pl-9 pr-10 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                  />
                  <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setIsCityDropdownOpen((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                    aria-label="Toggle city list"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {isCityDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl py-1">
                    {filteredCities.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCityPreset(c)}
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-orange-50 dark:hover:bg-stone-700/70 flex items-center justify-between transition-colors text-stone-900 dark:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                            {c.flag || c.countryCode}
                          </span>
                          <span>{c.label}</span>
                        </span>
                        {cityInput === c.label && (
                          <Check className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                        )}
                      </button>
                    ))}
                    {cityInput.trim() &&
                      !filteredCities.some(
                        (c) => c.label.toLowerCase() === cityInput.trim().toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCityDropdownOpen(false);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-stone-700/70 border-t border-stone-100 dark:border-stone-700"
                        >
                          Use custom city: &ldquo;{cityInput.trim()}&rdquo;
                        </button>
                      )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                  Bio & Tagline
                </label>
                <textarea
                  rows={2}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  aria-label="Bio and Tagline"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                  Favorite Activities (Grouped by Category)
                </label>
                <div className="space-y-3">
                  {ACTIVITY_GROUPS.map((grp) => (
                    <div key={grp} className="space-y-1.5">
                      <div className="text-[11px] font-extrabold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CategoryIcon category={grp} className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                        <span>{grp}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {GROUPED_ACTIVITIES[grp].map((cat) => {
                          const selected = favoriteActivities.includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => toggleActivity(cat)}
                              className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                                selected
                                  ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                                  : 'bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                              }`}
                            >
                              <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                              <span>{cat}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {editError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                {!isMandatoryOnboarding && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] px-5 py-2.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-extrabold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || faceChecking}
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : isMandatoryOnboarding
                    ? 'Complete Profile & Enter App'
                    : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <PhotoLightboxModal
        isOpen={isLightboxOpen}
        imageUrl={avatar || activeUser?.avatar}
        name={name}
        age={age}
        verified={activeUser.verified}
        photoVerified={Boolean(
          avatar?.startsWith('data:image/') || (activeUser as any)?.photoVerified
        )}
        neighborhood={cityInput}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}
