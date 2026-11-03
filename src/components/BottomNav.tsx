'use client';

import React from 'react';
import {
  Compass,
  Map as MapIcon,
  MessageCircle,
  User,
} from 'lucide-react';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';

export type NavigationTab = 'EXPLORE' | 'MAP' | 'MY_MEETUPS' | 'PROFILE';

export interface BottomNavProps {
  activeTab: NavigationTab;
  onChangeTab: (tab: NavigationTab) => void;
  unreadCount?: number;
  isDarkMode: boolean;
  meetupsCount?: number;
  hasPendingRequests?: boolean;
  userAvatar?: string;
  userName?: string;
  isSignedOut?: boolean;
  language?: SupportedLanguage;
  className?: string;
}

export function BottomNav({
  activeTab,
  onChangeTab,
  unreadCount = 0,
  isDarkMode: _isDarkMode,
  meetupsCount = 0,
  hasPendingRequests = false,
  userAvatar,
  userName = 'User',
  isSignedOut = false,
  language = 'en',
  className = '',
}: BottomNavProps) {
  const navItems: Array<{
    key: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: React.ReactNode;
    renderIcon?: () => React.ReactNode;
  }> = [
    {
      key: 'EXPLORE',
      label: getTranslation(language, 'nav_explore') || 'Explore',
      icon: Compass,
    },
    {
      key: 'MAP',
      label: getTranslation(language, 'nav_map') || 'Map',
      icon: MapIcon,
    },
    {
      key: 'MY_MEETUPS',
      label: getTranslation(language, 'nav_meetups') || 'My Meetups',
      icon: MessageCircle,
      badge:
        !isSignedOut && meetupsCount > 0 ? (
          <span
            aria-label={`${meetupsCount} meetups`}
            className="absolute top-1 right-3 sm:right-4 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_8px_rgba(234,88,12,0.5)]"
          >
            {meetupsCount}
          </span>
        ) : null,
    },
    {
      key: 'PROFILE',
      label: getTranslation(language, 'nav_profile') || 'Profile',
      icon: User,
      renderIcon: () => {
        if (!isSignedOut && userAvatar) {
          return (
            <img
              src={userAvatar}
              alt={userName}
              className={`w-5 h-5 rounded-full object-cover transition-all ${
                activeTab === 'PROFILE'
                  ? 'ring-2 ring-orange-600 dark:ring-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                  : ''
              }`}
            />
          );
        }
        return (
          <User
            className={`w-5 h-5 ${
              activeTab === 'PROFILE' ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : ''
            }`}
          />
        );
      },
      badge:
        !isSignedOut && unreadCount > 0 ? (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute top-1.5 right-5 sm:right-6 w-2 h-2 rounded-full bg-orange-600 ring-2 ring-white dark:ring-stone-900 shadow-[0_0_6px_rgba(234,88,12,0.8)]"
          />
        ) : null,
    },
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom, 0px))' }}
      className={`fixed bottom-0 inset-x-0 z-[500] bg-white/95 dark:bg-[#141210]/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800/90 px-3 pt-1.5 shadow-md dark:shadow-[0_-4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] ${className}`}
    >
      <div className="max-w-xl mx-auto grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChangeTab(item.key)}
              className={`relative min-h-[50px] min-w-[44px] flex flex-col items-center justify-center gap-1 rounded-xl text-xs transition-colors duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${
                isActive
                  ? 'text-orange-600 dark:text-orange-400 font-bold'
                  : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-medium'
              }`}
            >
              {item.renderIcon ? (
                item.renderIcon()
              ) : (
                <Icon
                  className={`w-5 h-5 stroke-[2.2] transition-all ${
                    isActive ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : ''
                  }`}
                />
              )}
              <span className="leading-tight text-[11px]">{item.label}</span>
              {item.badge}
              {isActive && (
                <span className="absolute bottom-1 w-6 h-1 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
