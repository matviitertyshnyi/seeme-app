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
import { ActivityCategory, UserPersona, hasRealProfilePhoto } from '@/types/lobby';
import {
  ACTIVITY_GROUPS,
  GROUPED_ACTIVITIES,
  CategoryIcon,
} from '@/components/CategoryIcon';
import { CityPreset, POPULAR_CITIES } from '@/lib/cities';
import { PhotoLightboxModal } from '@/components/PhotoLightboxModal';
import { verifyHumanFace } from '@/lib/face-detection';
import { OpenDoorLogo } from '@/components/OpenDoorLogo';

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
  const [customHobbyInput, setCustomHobbyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [faceChecking, setFaceChecking] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);
  const [isFaceVerified, setIsFaceVerified] = useState<boolean>(
    Boolean((activeUser as any)?.photoVerified && activeUser?.avatar && !activeUser.avatar.startsWith('data:image/svg'))
  );
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
        setIsFaceVerified(
          Boolean(hasRealProfilePhoto(activeUser))
        );
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
  const isMandatoryOnboarding =
    activeUser?.onboarded === false ||
    !activeUser?.age ||
    activeUser?.age < 18 ||
    !hasRealProfilePhoto(activeUser);

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

  const handleAddCustomHobby = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customHobbyInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 30) {
      setEditError('Custom hobby must be 30 characters or less');
      return;
    }
    if (!favoriteActivities.includes(trimmed)) {
      setFavoriteActivities((prev) => [...prev, trimmed]);
    }
    setCustomHobbyInput('');
    setEditError(null);
  };

  const handleRemoveCustomHobby = (hobby: string) => {
    setFavoriteActivities((prev) => prev.filter((c) => c !== hobby));
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFaceChecking(true);
    setFaceError(null);
    setEditError(null);

    try {
      let imageSource: ImageBitmap | HTMLImageElement;
      if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
        try {
          imageSource = await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
          imageSource = await new Promise<HTMLImageElement>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              if (typeof event.target?.result === 'string') {
                img.src = event.target.result;
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
      } else {
        imageSource = await new Promise<HTMLImageElement>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            if (typeof event.target?.result === 'string') {
              img.src = event.target.result;
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const canvas = document.createElement('canvas');
      const size = 320;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setFaceChecking(false);
        return;
      }

      const imgW = (imageSource as any).width || size;
      const imgH = (imageSource as any).height || size;
      const minDim = Math.min(imgW, imgH);
      const sx = (imgW - minDim) / 2;
      const sy = (imgH - minDim) / 2;

      ctx.drawImage(imageSource, sx, sy, minDim, minDim, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      const result = await verifyHumanFace(dataUrl);
      if (!result.isValidFace) {
        setFaceError(result.message);
        setIsFaceVerified(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        return;
      }
      setAvatar(dataUrl);
      setIsFaceVerified(true);
      setFaceError(null);
    } catch {
      setFaceError('Could not verify human face in photo. Please upload a clear portrait.');
      setIsFaceVerified(false);
    } finally {
      setFaceChecking(false);
    }
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
      isFaceVerified &&
      avatar &&
      !avatar.startsWith('data:image/svg') &&
      !avatar.includes('unsplash.com')
    );

    if (!hasRealFacePhoto) {
      setEditError(
        'A verified profile photo of your face is required to join or host meetups. Please upload a clear photo of your face or take a live selfie.'
      );
      return;
    }

    const finalAvatar = avatar.trim();

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
        className={`w-full ${activeTab === 'LOGIN' ? 'max-w-sm' : 'max-w-xl'} bg-white dark:bg-stone-900 rounded-t-[28px] sm:rounded-[28px] shadow-ambient-lg border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[92vh] flex flex-col`}
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-stone-950 dark:text-white">
              {activeTab === 'EDIT' ? 'Edit Profile' : 'Sign In'}
            </h2>
            {activeTab === 'EDIT' && (
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                {activeUser?.onboarded === false
                  ? 'Complete Your Profile Setup - Set your photo, age, and city to start using Leave The Room'
                  : 'Update your photo, city, bio, and favorite activities'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: SIGN IN */}
          {activeTab === 'LOGIN' && (
            <div className="space-y-5 text-center">
              <OpenDoorLogo className="w-11 h-11 mx-auto" size={44} />
              <p className="text-xs text-center text-stone-500 dark:text-stone-400">
                Continue with your Google or Apple account to join and host meetups.
              </p>

              {/* Cohesive OAuth (Google & Apple) */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleAuth}
                  className="min-h-[44px] w-full rounded-xl bg-stone-900 dark:bg-white hover:opacity-90 text-white dark:text-stone-950 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer"
                >
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleAppleAuth}
                  className="min-h-[44px] w-full rounded-xl bg-stone-100 dark:bg-stone-800/90 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700/80 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <AppleIcon className="w-4 h-4 shrink-0" />
                  <span>Continue with Apple</span>
                </button>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold text-left">
                  {loginError}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EDIT CURRENT PROFILE */}
          {activeTab === 'EDIT' && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Profile Photo Upload & Selfie Camera */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                  Profile Photo (Required)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Clickable 72x72 Avatar preview */}
                  <div
                    onClick={() => setIsLightboxOpen(true)}
                    title="Click to view full-screen photo"
                    className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 shrink-0 shadow-sm cursor-pointer group hover:ring-2 hover:ring-stone-400 dark:hover:ring-stone-600 transition-all"
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
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-white text-xs font-semibold border border-stone-300 dark:border-stone-700 transition-colors shadow-sm">
                        <Upload className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                        <span>Upload Photo</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                          }}
                          onChange={handlePhotoUpload}
                        />
                      </label>

                      {/* Take Live Selfie Button */}
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-white text-xs font-semibold border border-stone-300 dark:border-stone-700 transition-colors shadow-sm">
                        <Camera className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                        <span>Take Live Selfie (Camera)</span>
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="user"
                          className="hidden"
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                          }}
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
                    isFaceVerified && avatar && !avatar.startsWith('data:image/svg') ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>✓ Verified Human Face Photo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Real photo required — please upload a photo of your face or take a selfie to join and host meetups</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                      Full Name
                    </label>
                    <span className={`text-[10px] font-bold ${name.length > 25 ? 'text-amber-500' : 'text-stone-400'}`}>
                      {name.length}/30
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={30}
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 30))}
                    placeholder="Your name or nickname"
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
                      Set once - cannot be changed later
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
                  <MapPin className="w-4 h-4 text-stone-400 dark:text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                        className="w-full px-3.5 py-2 text-left text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-700/70 flex items-center justify-between transition-colors text-stone-900 dark:text-white"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                            {c.flag || c.countryCode}
                          </span>
                          <span>{c.label}</span>
                        </span>
                        {cityInput === c.label && (
                          <Check className="w-3.5 h-3.5 text-stone-900 dark:text-white shrink-0" />
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
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700/70 border-t border-stone-100 dark:border-stone-700"
                        >
                          Use custom city: &ldquo;{cityInput.trim()}&rdquo;
                        </button>
                      )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Bio & Tagline
                  </label>
                  <span className={`text-[10px] font-bold ${tagline.length > 180 ? 'text-amber-500' : 'text-stone-400'}`}>
                    {tagline.length}/200
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={200}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value.slice(0, 200))}
                  placeholder="Share a short bio, what you enjoy doing, or who you'd like to meet..."
                  aria-label="Bio and Tagline"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-950 dark:text-white focus:outline-none focus:border-orange-600"
                />
              </div>

              {/* Custom Hobbies Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Custom Hobbies & Interests
                  </label>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                    Add your own tags
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={30}
                    value={customHobbyInput}
                    onChange={(e) => setCustomHobbyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomHobby();
                      }
                    }}
                    placeholder="Add custom hobby (e.g. Bouldering, Pottery, Anime, Volleyball...)"
                    className="min-h-[40px] flex-1 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-semibold text-stone-950 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-orange-600"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomHobby}
                    disabled={!customHobbyInput.trim()}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-stone-900 dark:bg-white hover:opacity-90 text-white dark:text-stone-950 text-xs font-bold transition disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    + Add
                  </button>
                </div>

                {/* Render Custom Added Hobbies */}
                {favoriteActivities.filter((act) => !Object.values(GROUPED_ACTIVITIES).flat().includes(act)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {favoriteActivities
                      .filter((act) => !Object.values(GROUPED_ACTIVITIES).flat().includes(act))
                      .map((customHobby) => (
                        <span
                          key={customHobby}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-orange-600 text-white shadow-sm border border-orange-600"
                        >
                          <CategoryIcon category={customHobby} className="w-3.5 h-3.5 text-white" />
                          <span>{customHobby}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomHobby(customHobby)}
                            aria-label={`Remove ${customHobby}`}
                            className="w-4 h-4 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                  Favorite Activities (Grouped by Category)
                </label>
                <div className="space-y-3">
                  {ACTIVITY_GROUPS.map((grp) => (
                    <div key={grp} className="space-y-1.5">
                      <div className="text-[11px] font-extrabold text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CategoryIcon category={grp} className="w-3 h-3 text-stone-500 dark:text-stone-400" />
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
          isFaceVerified && avatar && !avatar.startsWith('data:image/svg')
        )}
        neighborhood={cityInput}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
}
