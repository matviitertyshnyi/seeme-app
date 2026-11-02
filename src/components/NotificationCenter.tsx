'use client';

import React from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Compass,
  MapPin,
  Star,
  UserPlus,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { AppNotification } from '@/types/lobby';

interface MobilePushBannerProps {
  pushAlert: { title: string; body: string; lobbyId?: string } | null;
  onDismiss: () => void;
  onOpenLobby?: (lobbyId: string) => void;
}

export function MobilePushBanner({
  pushAlert,
  onDismiss,
  onOpenLobby,
}: MobilePushBannerProps) {
  if (!pushAlert) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      onClick={() => {
        if (pushAlert.lobbyId && onOpenLobby) {
          onOpenLobby(pushAlert.lobbyId);
        }
        onDismiss();
      }}
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[430px] z-[1100] bg-slate-950/95 backdrop-blur-xl text-white rounded-[24px] p-4 shadow-ambient-lg border border-white/15 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Compass className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
              <span>Leave The Room Push · iOS / Android</span>
              <span>•</span>
              <span>Now</span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
              {pushAlert.title}
            </div>
            <p className="text-xs text-slate-300 font-medium line-clamp-2 mt-0.5">
              {pushAlert.body}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Dismiss notification"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onSelectLobby: (lobbyId: string) => void;
  onMarkAllRead: () => Promise<void>;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onSelectLobby,
  onMarkAllRead,
}: NotificationDrawerProps) {
  if (!isOpen) return null;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'REQUEST':
        return <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'CHECK_IN':
        return <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'BEACON_MATCH':
        return <Radio className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'RATING':
        return <Star className="w-4 h-4 fill-amber-400 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notifications"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[28px] shadow-ambient-lg border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
              Notifications ({notifications.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="min-h-[40px] px-3 rounded-xl text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 inline-flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark Read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="w-10 h-10 rounded-full bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                All caught up!
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Join requests, arrival check-ins, and radar matches will appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.lobbyId) {
                    onSelectLobby(item.lobbyId);
                  }
                  onClose();
                }}
                className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-start gap-3 ${
                  !item.read
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/30'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-950 dark:text-white truncate">
                      {item.title}
                    </span>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
