'use client';

import React from 'react';
import {
  MapPin,
  MessageCircle,
  Check,
  Lock,
  Zap,
  Users,
  Calendar,
  ShieldCheck,
  Clock,
  Bookmark,
} from 'lucide-react';
import { LobbyWithDistance, UserPersona } from '@/types/lobby';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';

interface LobbyCardProps {
  lobby: LobbyWithDistance;
  activeUser: UserPersona;
  onSelectLobby: (lobby: LobbyWithDistance) => void;
  onQuickJoin: (lobby: LobbyWithDistance, e: React.MouseEvent) => void;
  isJoining?: boolean;
  language?: SupportedLanguage;
  isSaved?: boolean;
  onToggleSave?: (lobbyId: string, e: React.MouseEvent) => void;
  onClickUser?: (userId: string, e: React.MouseEvent) => void;
}

export function LobbyCard({
  lobby,
  activeUser,
  onSelectLobby,
  onQuickJoin,
  isJoining = false,
  language = 'en',
  isSaved = false,
  onToggleSave,
  onClickUser,
}: LobbyCardProps) {
  const t = (key: any, params?: any) => getTranslation(language, key, params);
  const isParticipant = lobby.participants.some((p) => p.id === activeUser.id);
  const isHost = lobby.hostId === activeUser.id;
  const hasPendingRequest = lobby.pendingRequests.some(
    (r) => r.user.id === activeUser.id
  );
  const isFinished = lobby.computedStatus === 'FINISHED';
  const isFull =
    lobby.participants.length >= lobby.maxParticipants || isFinished;
  const spotsLeft = Math.max(
    0,
    lobby.maxParticipants - lobby.participants.length
  );
  const hostPerson =
    lobby.participants.find((p) => p.id === lobby.hostId) ||
    lobby.participants[0];

  const otherCount = Math.max(0, lobby.participants.length - 1);

  return (
    <article
      onClick={() => onSelectLobby(lobby)}
      tabIndex={0}
      role="button"
      aria-label={`${lobby.title} at ${lobby.venueName}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectLobby(lobby);
        }
      }}
      className="group bg-white dark:bg-[#1C1917] rounded-2xl border border-stone-200 dark:border-stone-800/90 hover:border-orange-500/40 dark:hover:border-orange-500/50 overflow-hidden shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_6px_24px_-4px_rgba(0,0,0,0.5)] hover:shadow-md dark:hover:shadow-[0_8px_30px_rgba(234,88,12,0.15)] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:focus-visible:ring-orange-400"
    >
      <div className="relative h-44 sm:h-48 w-full bg-stone-900 overflow-hidden">
        <img
          src={lobby.coverImage}
          alt={lobby.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917] via-black/40 to-black/15" />

        <div className="absolute top-3 left-3">
          {lobby.computedStatus === 'LIVE' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t('live_now')}</span>
            </div>
          ) : lobby.computedStatus === 'FINISHED' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-stone-300 text-[10px] font-semibold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-stone-400" />
              <span>{t('finished')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-semibold tracking-wide uppercase">
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{lobby.startTimeBadge || t('status_upcoming')}</span>
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap justify-end">
          {onToggleSave && (
            <button
              type="button"
              aria-label="Save meetup"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave?.(lobby.id, e);
              }}
              className={`p-1.5 rounded-md border backdrop-blur-md transition-colors ${
                isSaved
                  ? 'bg-orange-500/30 border-orange-400/60 text-orange-400'
                  : 'bg-black/60 border-white/10 text-stone-300 hover:text-white hover:bg-black/80'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-orange-400 text-orange-400' : ''}`} />
            </button>
          )}

          {lobby.joinMode === 'OPEN' && lobby.computedStatus !== 'FINISHED' && !isFull && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/40 backdrop-blur-md text-emerald-300 text-[10px] font-semibold tracking-wide">
              <Zap className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
              <span>{t('instant_join')}</span>
            </div>
          )}

          {lobby.preferredAgeRange && lobby.preferredAgeRange !== 'No preference' && lobby.preferredAgeRange !== 'All Ages (18+)' && (
            <div className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 backdrop-blur-md text-stone-200 text-[10px] font-medium">
              {lobby.preferredAgeRange}
            </div>
          )}

          {/* Recurring Event Tag */}
          {lobby.isRecurring && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-950/80 border border-orange-500/40 backdrop-blur-md text-orange-300 text-[10px] font-semibold">
              <Calendar className="w-2.5 h-2.5" />
              <span>{lobby.recurringSchedule ? lobby.recurringSchedule.replace('Every ', '') : t('recurring_weekly')}</span>
            </div>
          )}

          {/* Capacity Fraction Tag (e.g. 1/2, 3/4) */}
          <div
            className={`px-2 py-0.5 rounded-md border backdrop-blur-md text-[10px] font-semibold tracking-wide ${
              isFull
                ? 'bg-stone-900/80 border-stone-700 text-stone-300'
                : spotsLeft <= 1
                ? 'bg-amber-950/85 border-amber-500/50 text-amber-300'
                : 'bg-black/60 border-white/10 text-stone-200'
            }`}
          >
            {lobby.participants.length}/{lobby.maxParticipants}
          </div>
        </div>

        <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
          <span className="text-[10px] uppercase tracking-wider font-bold text-orange-300 block mb-0.5">
            {lobby.category}
          </span>
          <h2 className="text-base font-bold text-white leading-snug line-clamp-1 group-hover:text-orange-200 transition-colors">
            {lobby.title}
          </h2>
          <p className="text-xs text-stone-200/90 font-normal mt-0.5 truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="truncate">{lobby.venueName}</span>
            <span className="text-stone-400">·</span>
            <span className="shrink-0">{lobby.distanceLabel}</span>
          </p>
        </div>
      </div>

      <div className="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-[#1C1917] border-t border-stone-100 dark:border-stone-800/70 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div
          onClick={
            onClickUser && hostPerson
              ? (e) => {
                  e.stopPropagation();
                  onClickUser(hostPerson.id, e);
                }
              : undefined
          }
          className={`flex items-center gap-2.5 min-w-0 ${
            onClickUser && hostPerson ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''
          }`}
        >
          <div className="flex items-center -space-x-2 shrink-0">
            {hostPerson && (
              <img
                src={hostPerson.avatar}
                alt={hostPerson.name}
                className="w-8 h-8 rounded-full border-2 border-white dark:border-stone-800 object-cover"
              />
            )}
            {otherCount > 0 && (
              <div className="w-8 h-8 rounded-full border-2 border-white dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center text-[11px] font-bold">
                +{otherCount}
              </div>
            )}
          </div>
          <div className="text-left min-w-0">
            <span className="block text-xs font-semibold text-stone-900 dark:text-stone-100 leading-tight truncate flex items-center gap-1">
              <span>{hostPerson?.name?.split(' ')[0] || 'Member'}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[10px] font-normal text-stone-400">
                {isHost ? '(You)' : '(Host)'}
              </span>
            </span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium block truncate">
              {hostPerson?.reliabilityScore || 98}% Reliability
            </span>
          </div>
        </div>

        <div className="shrink-0">
          {isParticipant ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectLobby(lobby);
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition active:scale-[0.98] shadow-[0_2px_12px_rgba(16,185,129,0.35)] border border-emerald-400/30 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{isHost && lobby.pendingRequests.length > 0 ? `${t('pending_approval')} (${lobby.pendingRequests.length})` : t('open_chat')}</span>
            </button>
          ) : hasPendingRequest ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectLobby(lobby);
              }}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Check className="w-3.5 h-3.5 inline mr-1" />
              {t('pending_approval')}
            </button>
          ) : isFull ? (
            <button
              type="button"
              disabled
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800/80 text-stone-400 dark:text-stone-500 text-xs font-semibold cursor-not-allowed border border-stone-200 dark:border-stone-700/50"
            >
              {isFinished ? t('finished') : t('spots_full')}
            </button>
          ) : (
            <button
              type="button"
              disabled={isJoining}
              onClick={(e) => onQuickJoin(lobby, e)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white text-xs font-bold tracking-tight transition active:scale-[0.98] shadow-[0_2px_14px_rgba(234,88,12,0.38)] border border-orange-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {lobby.joinMode === 'OPEN' ? t('join_spot') : t('request_spot')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
