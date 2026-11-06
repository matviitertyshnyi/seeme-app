'use client';

import React from 'react';
import {
  Compass,
  Map as MapIcon,
  CalendarDays,
  User,
  Plus,
} from 'lucide-react';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';

export type NavigationTab = 'EXPLORE' | 'MAP' | 'MY_MEETUPS' | 'PROFILE';

export interface BottomNavProps {
  activeTab: NavigationTab;
  onChangeTab: (tab: NavigationTab) => void;
  onOpenHostModal?: () => void;
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
  onOpenHostModal,
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
      icon: CalendarDays,
      badge:
        !isSignedOut && meetupsCount > 0 ? (
          <span
            aria-label={`${meetupsCount} meetups`}
            className="absolute top-1 right-3 sm:right-4 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-stone-900 text-white dark:bg-white dark:text-stone-950"
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
                  ? 'ring-1.5 ring-stone-900 dark:ring-white'
                  : ''
              }`}
            />
          );
        }
        return (
          <User className="w-5 h-5" />
        );
      },
      badge:
        !isSignedOut && unreadCount > 0 ? (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute top-1.5 right-5 sm:right-6 w-2 h-2 rounded-full bg-stone-900 dark:bg-white ring-2 ring-white dark:ring-stone-900"
          />
        ) : null,
    },
  ];

  const renderNavItem = (item: (typeof navItems)[number]) => {
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
        className={`relative min-h-[50px] min-w-[44px] flex flex-col items-center justify-center gap-1 rounded-xl text-xs transition-colors duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
          isActive
            ? 'text-stone-950 dark:text-white font-semibold'
            : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-medium'
        }`}
      >
        {item.renderIcon ? (
          item.renderIcon()
        ) : (
          <Icon className="w-5 h-5 stroke-[2.2] transition-all" />
        )}
        <span className="leading-tight text-[11px] truncate max-w-[64px]">{item.label}</span>
        {item.badge}
      </button>
    );
  };

  return (
    <nav
      aria-label="Primary Navigation"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom, 0px))' }}
      className={`fixed bottom-0 inset-x-0 z-[500] bg-white/95 dark:bg-[#141210]/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800/90 px-3 pt-1.5 shadow-md dark:shadow-[0_-4px_24px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] ${className}`}
    >
      <div className="max-w-xl mx-auto grid grid-cols-5 gap-1 items-center">
        {/* Slot 1: Explore */}
        {renderNavItem(navItems[0])}

        {/* Slot 2: Map */}
        {renderNavItem(navItems[1])}

        {/* Slot 3 (Center): Prominent Host Meetup Button */}
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={onOpenHostModal}
            aria-label="Host a Meetup"
            className="relative -top-1.5 w-11 h-11 rounded-full bg-orange-600 hover:bg-orange-500 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all border-2 border-white dark:border-[#141210] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.8]" />
          </button>
          <span className="-mt-1 text-[10px] font-extrabold text-stone-700 dark:text-stone-300">
            Host
          </span>
        </div>

        {/* Slot 4: My Meetups */}
        {renderNavItem(navItems[2])}

        {/* Slot 5: Profile */}
        {renderNavItem(navItems[3])}
      </div>
    </nav>
  );
}
