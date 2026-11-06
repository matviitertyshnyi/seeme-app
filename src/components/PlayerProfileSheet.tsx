'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  MapPin,
  Maximize2,
  Star,
  MessageCircle,
  UserPlus,
  UserCheck,
  UserMinus,
  Clock,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { UserPersona } from '@/types/lobby';
import { CategoryIcon } from '@/components/CategoryIcon';
import { getUserTag } from '@/lib/user-handle';

export interface PlayerProfileSheetProps {
  user: UserPersona | null;
  activeUser: UserPersona;
  isOpen: boolean;
  onClose: () => void;
  onOpenLightbox: (
    imageUrl: string,
    name: string,
    age?: number,
    verified?: boolean,
    neighborhood?: string
  ) => void;
  onSendFriendRequest: (targetUserId: string) => Promise<void>;
  onAcceptFriendRequest: (targetUserId: string) => Promise<void>;
  onRemoveFriend: (targetUserId: string) => Promise<void>;
  onOpenDirectChat: (targetUser: UserPersona) => void;
  onBlockUser?: (targetUserId: string) => void;
}

export function PlayerProfileSheet({
  user,
  activeUser,
  isOpen,
  onClose,
  onOpenLightbox,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onRemoveFriend,
  onOpenDirectChat,
  onBlockUser,
}: PlayerProfileSheetProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowRemoveConfirm(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const isMe = user.id === activeUser.id;
  const isPhotoVerified = Boolean((user as any).photoVerified);

  const activeFriendIds: string[] = (activeUser as any).friendIds || [];
  const activeOutgoingIds: string[] =
    (activeUser as any).outgoingFriendRequestIds || [];
  const activeIncomingIds: string[] =
    (activeUser as any).incomingFriendRequestIds || [];

  const isFriend = activeFriendIds.includes(user.id);
  const isOutgoing = activeOutgoingIds.includes(user.id);
  const isIncoming = activeIncomingIds.includes(user.id);

  const handleSendRequest = async () => {
    setIsBusy(true);
    try {
      await onSendFriendRequest(user.id);
    } finally {
      setIsBusy(false);
    }
  };

  const handleAcceptRequest = async () => {
    setIsBusy(true);
    try {
      await onAcceptFriendRequest(user.id);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    setIsBusy(true);
    try {
      await onRemoveFriend(user.id);
      setShowRemoveConfirm(false);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${user.name}'s Profile`}
      className="fixed inset-0 z-[1100] bg-stone-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header / Close button */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Player Profile
            </span>
            {isPhotoVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                Real Human · Photo Verified
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main User Card (Tinder / Yubo / Badoo style) */}
          <div className="flex flex-col items-center sm:items-start sm:flex-row gap-5">
            {/* 96x96 Clickable Avatar with Zoom Icon */}
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() =>
                  onOpenLightbox(
                    user.avatar,
                    user.name,
                    user.age,
                    isPhotoVerified,
                    user.neighborhood
                  )
                }
                title="Tap to view photo full-screen"
                className="relative block w-24 h-24 rounded-3xl overflow-hidden ring-1 ring-stone-200 dark:ring-stone-700 shadow-md transition-all cursor-pointer focus:outline-none"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <span className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-black/75 text-white backdrop-blur-xs group-hover:bg-black transition-colors shadow">
                  <Maximize2 className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-2xl font-black text-stone-950 dark:text-white">
                  {user.name}, {user.age}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-mono text-xs font-semibold">
                  {getUserTag(user)}
                </span>
                {isPhotoVerified && (
                  <ShieldCheck
                    className="w-5 h-5 text-emerald-500 shrink-0"
                    aria-label="Verified Human Photo"
                  />
                )}
              </div>

              {user.neighborhood && (
                <div className="flex items-center justify-center sm:justify-start gap-1 text-xs font-semibold text-stone-500 dark:text-stone-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{user.neighborhood}</span>
                </div>
              )}

              {user.tagline && (
                <p className="text-xs text-stone-700 dark:text-stone-300 mt-2 font-medium leading-relaxed italic bg-stone-50 dark:bg-stone-800/50 p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-800">
                  &ldquo;{user.tagline}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* 3 Stats Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 text-center">
              <div className="text-lg font-bold text-stone-950 dark:text-stone-100">
                {user.reliabilityScore}%
              </div>
              <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                Show-Up Rate
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 text-center">
              <div className="text-lg font-bold text-stone-950 dark:text-stone-100 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-current text-stone-900 dark:text-stone-100" />
                <span>{user.ratingAvg || 5.0}</span>
              </div>
              <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                Rating
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 text-center">
              <div className="text-lg font-bold text-stone-950 dark:text-stone-100">
                {user.meetupsAttended || 0}
              </div>
              <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                Meetups
              </div>
            </div>
          </div>

          {/* Favorite Activities */}
          {user.favoriteActivities && user.favoriteActivities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Favorite Activities
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {user.favoriteActivities.map((act) => (
                  <span
                    key={act}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-200"
                  >
                    <CategoryIcon category={act} className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                    <span>{act}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Block / Report User option */}
          {!isMe && onBlockUser && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => onBlockUser(user.id)}
                className="text-xs font-semibold text-stone-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Block or report user</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Action Bar (if not viewing own profile) */}
        {!isMe && (
          <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 shrink-0">
            {isFriend ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDirectChat(user);
                  }}
                  className="flex-1 min-h-[46px] rounded-2xl bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </button>

                {showRemoveConfirm ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleRemove}
                      className="min-h-[46px] px-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Remove'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRemoveConfirm(false)}
                      className="min-h-[46px] px-3 rounded-2xl bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRemoveConfirm(true)}
                    className="min-h-[46px] px-4 rounded-2xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Click to remove from friends"
                  >
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span>Friends ✓</span>
                  </button>
                )}
              </div>
            ) : isIncoming ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleAcceptRequest}
                  className="flex-1 min-h-[46px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Accept Friend Request</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDirectChat(user);
                  }}
                  className="min-h-[46px] px-4 rounded-2xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </button>
              </div>
            ) : isOutgoing ? (
              <div className="flex items-center gap-2.5">
                <div className="flex-1 min-h-[46px] rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 px-3">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Request Sent · Pending</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDirectChat(user);
                  }}
                  className="min-h-[46px] px-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleSendRequest}
                  className="flex-1 min-h-[46px] rounded-2xl bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Add Friend</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDirectChat(user);
                  }}
                  className="min-h-[46px] px-4 rounded-2xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerProfileSheet;
