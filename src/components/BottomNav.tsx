'use client';

import React from 'react';
import {
  Compass,
  Map as MapIcon,
  MessageCircle,
  User,
} from 'lucide-react';

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
      label: 'Explore',
      icon: Compass,
    },
    {
      key: 'MAP',
      label: 'Map',
      icon: MapIcon,
    },
    {
      key: 'MY_MEETUPS',
      label: 'My Meetups',
      icon: MessageCircle,
      badge:
        !isSignedOut && meetupsCount > 0 ? (
          <span
            aria-label={`${meetupsCount} meetups`}
            className={`absolute top-1 right-3 sm:right-4 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center transition-all ${
              hasPendingRequests
                ? 'bg-amber-400 text-slate-950 animate-pulse'
                : 'bg-emerald-700 text-white'
            }`}
          >
            {hasPendingRequests ? '!' : meetupsCount}
          </span>
        ) : null,
    },
    {
      key: 'PROFILE',
      label: 'Profile',
      icon: User,
      renderIcon: () => {
        if (!isSignedOut && userAvatar) {
          return (
            <img
              src={userAvatar}
              alt={userName}
              className={`w-5 h-5 rounded-full object-cover transition-all ${
                activeTab === 'PROFILE'
                  ? 'ring-2 ring-indigo-600 dark:ring-indigo-400'
                  : ''
              }`}
            />
          );
        }
        return <User className="w-5 h-5" />;
      },
      badge:
        !isSignedOut && unreadCount > 0 ? (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute top-1.5 right-5 sm:right-6 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white dark:ring-slate-900"
          />
        ) : null,
    },
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom, 0px))' }}
      className={`fixed bottom-0 inset-x-0 z-[500] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-border dark:border-border-dark px-2 pt-1.5 shadow-ambient-lg ${className}`}
    >
      <div className="max-w-lg mx-auto grid grid-cols-4 gap-1">
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
              className={`relative min-h-[50px] min-w-[44px] flex flex-col items-center justify-center gap-1 rounded-2xl text-xs font-extrabold transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:focus-visible:ring-brand-accent ${
                isActive
                  ? 'text-brand dark:text-brand-accent bg-brand-soft/90 dark:bg-brand-surface-dark/70 shadow-sm'
                  : 'text-ink-muted dark:text-ink-muted-dark hover:text-slate-900 dark:hover:text-slate-100 hover:bg-stone-100/80 dark:hover:bg-stone-800/80'
              }`}
            >
              {item.renderIcon ? item.renderIcon() : <Icon className="w-5 h-5 stroke-[2.2]" />}
              <span className="leading-tight">{item.label}</span>
              {item.badge}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
