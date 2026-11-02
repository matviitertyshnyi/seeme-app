'use client';

import React, { useState } from 'react';
import {
  X,
  Settings,
  Smartphone,
  Volume2,
  Vibrate,
  ShieldBan,
  Eye,
  BellRing,
  UserX,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { UserPersona, UserSettings } from '@/types/lobby';
import {
  fireNativeNotificationIfPermitted,
  requestMobilePushPermission,
  triggerSensoryFeedback,
} from '@/lib/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserPersona;
  personas: UserPersona[];
  onUpdateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  onBanOrUnbanUser: (
    targetUserId: string,
    action: 'BAN_USER' | 'UNBAN_USER'
  ) => Promise<void>;
  onTriggerSimulatedMobilePush: (title: string, body: string) => void;
  onResetDemoData: () => Promise<void>;
}

export function SettingsModal({
  isOpen,
  onClose,
  activeUser,
  personas,
  onUpdateSettings,
  onBanOrUnbanUser,
  onTriggerSimulatedMobilePush,
  onResetDemoData,
}: SettingsModalProps) {
  const [selectedUserToBan, setSelectedUserToBan] = useState<string>('');
  const [pushPermStatus, setPushPermStatus] = useState<string>('Ready');

  if (!isOpen) return null;

  const settings = activeUser.settings || {
    iosAndroidPush: true,
    soundEffects: true,
    hapticFeedback: true,
    distanceUnit: 'km',
    profileVisible: true,
    showReliabilityScore: true,
  };

  const bannedUsers = personas.filter((p) =>
    activeUser.bannedUserIds?.includes(p.id)
  );
  const unbannedOtherUsers = personas.filter(
    (p) => p.id !== activeUser.id && !activeUser.bannedUserIds?.includes(p.id)
  );

  const handleToggle = async (key: keyof UserSettings) => {
    const updatedValue = !settings[key];
    triggerSensoryFeedback('TAP', settings);
    await onUpdateSettings({ [key]: updatedValue });
  };

  const handleRequestDevicePush = async () => {
    const res = await requestMobilePushPermission();
    setPushPermStatus(
      res === 'granted'
        ? 'OS Permission Granted'
        : res === 'denied'
        ? 'Using In-App iOS/Android Banner'
        : 'Using In-App Banner'
    );
    fireNativeNotificationIfPermitted(
      'SeeMe Push Enabled',
      'You will now receive instant alerts for nearby meetups and check-ins.'
    );
    onTriggerSimulatedMobilePush(
      'SeeMe: iOS / Android Push Active',
      'Instant alerts enabled for join requests, "I\'m Here" check-ins, and radar matches.'
    );
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="App Settings, Notifications and Ban Management"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[28px] shadow-ambient-lg border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
                Settings, Notifications & Safety
              </h2>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Configure iOS/Android alerts, audio/haptics, privacy, and banned users
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. iOS & Android Mobile Push Notifications */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
                    iOS & Android Push Notifications
                  </h3>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Receive native lock-screen & top banner alerts for requests and check-ins
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.iosAndroidPush}
                onClick={() => handleToggle('iosAndroidPush')}
                className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-extrabold transition-all ${
                  settings.iosAndroidPush
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                }`}
              >
                {settings.iosAndroidPush ? 'Enabled' : 'Paused'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRequestDevicePush}
                className="min-h-[44px] px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm inline-flex items-center gap-1.5"
              >
                <BellRing className="w-4 h-4" />
                Test iOS / Android Push Banner
              </button>
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 px-2">
                Status: {pushPermStatus}
              </span>
            </div>
          </div>

          {/* 2. Sound Effects, Haptics & Units */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Sensory & Regional Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  <div>
                    <div className="text-xs font-extrabold text-slate-950 dark:text-white">
                      Sound Effects
                    </div>
                    <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Audio chimes on join & check-in
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('soundEffects')}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-extrabold ${
                    settings.soundEffects
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {settings.soundEffects ? 'On' : 'Off'}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Vibrate className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  <div>
                    <div className="text-xs font-extrabold text-slate-950 dark:text-white">
                      Haptic Vibration
                    </div>
                    <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Tactile feedback on mobile
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('hapticFeedback')}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-extrabold ${
                    settings.hapticFeedback
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {settings.hapticFeedback ? 'On' : 'Off'}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  <div>
                    <div className="text-xs font-extrabold text-slate-950 dark:text-white">
                      Open to Co-Host Strip
                    </div>
                    <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Show profile in nearby strip
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('profileVisible')}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-extrabold ${
                    settings.profileVisible
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {settings.profileVisible ? 'Visible' : 'Hidden'}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold text-slate-950 dark:text-white">
                    Distance Units
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Radar & card distance display
                  </div>
                </div>
                <div className="inline-flex rounded-full bg-slate-200 dark:bg-slate-700 p-1">
                  {(['km', 'mi'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => onUpdateSettings({ distanceUnit: unit })}
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                        settings.distanceUnit === unit
                          ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Banning, Blocking & Moderation Manager */}
          <div className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldBan className="w-5 h-5 text-rose-700 dark:text-rose-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
                    Moderation & Banned Players ({bannedUsers.length})
                  </h3>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Banned users are immediately removed from your meetups and cannot request or join your rooms.
                  </p>
                </div>
              </div>
            </div>

            {/* Ban a User Control */}
            {unbannedOtherUsers.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedUserToBan}
                  onChange={(e) => setSelectedUserToBan(e.target.value)}
                  aria-label="Select a player to ban"
                  className="min-h-[44px] flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-950 dark:text-white"
                >
                  <option value="">Select a player to ban/block from your meetups...</option>
                  {unbannedOtherUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.skillBadge} · {u.neighborhood})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedUserToBan}
                  onClick={async () => {
                    if (!selectedUserToBan) return;
                    await onBanOrUnbanUser(selectedUserToBan, 'BAN_USER');
                    setSelectedUserToBan('');
                  }}
                  className="min-h-[44px] px-5 py-2 rounded-full bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shrink-0"
                >
                  <UserX className="w-4 h-4" />
                  Ban Player
                </button>
              </div>
            )}

            {/* Banned Users List */}
            {bannedUsers.length === 0 ? (
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900 rounded-xl p-3 border border-rose-200/70 dark:border-rose-800">
                You have not banned or blocked any players.
              </div>
            ) : (
              <div className="space-y-2">
                {bannedUsers.map((banned) => (
                  <div
                    key={banned.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={banned.avatar}
                        alt={banned.name}
                        className="w-9 h-9 rounded-full object-cover grayscale"
                      />
                      <div>
                        <div className="text-xs font-extrabold text-slate-950 dark:text-white">
                          {banned.name}, {banned.age}
                        </div>
                        <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
                          Banned from joining your meetups
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onBanOrUnbanUser(banned.id, 'UNBAN_USER')}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-800 dark:hover:text-emerald-300 text-slate-800 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1 border border-slate-300 dark:border-slate-700"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Unban
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Demo Data Reset */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Restore initial demo meetups, ratings, and profiles
            </span>
            <button
              type="button"
              onClick={onResetDemoData}
              className="min-h-[44px] px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Demo Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
