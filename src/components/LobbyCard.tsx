'use client';

import React from 'react';
import {
  MapPin,
  MessageCircle,
  Check,
  Clock,
  Bookmark,
  ShieldCheck,
} from 'lucide-react';
import { LobbyWithDistance, UserPersona } from '@/types/lobby';
import { SupportedLanguage, getTranslation } from '@/lib/i18n';
import { resolveCoverImage } from '@/lib/geo';

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
  const hostPerson =
    lobby.participants.find((p) => p.id === lobby.hostId) ||
    lobby.participants[0];

  const coverSrc = resolveCoverImage(lobby.coverImage, lobby.category);

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
      className="group bg-white dark:bg-[#1C1917] rounded-2xl border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 overflow-hidden shadow-sm transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
    >
      <div className="relative h-44 sm:h-48 w-full bg-stone-900 overflow-hidden">
        <img
          src={coverSrc}
          alt={lobby.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917] via-black/40 to-black/15" />

        <div className="absolute top-3 left-3">
          <div className="bg-stone-950/75 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
            {lobby.computedStatus === 'LIVE' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Live</span>
              </>
            ) : lobby.computedStatus === 'FINISHED' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                <span>Ended</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-stone-300" />
                <span>{lobby.startTimeBadge || t('status_upcoming')}</span>
              </>
            )}
          </div>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <div className="px-2 py-0.5 rounded-full bg-stone-950/75 border border-white/10 backdrop-blur-md text-stone-200 text-[11px] font-semibold">
            {lobby.participants.length}/{lobby.maxParticipants}
          </div>

          {onToggleSave && (
            <button
              type="button"
              aria-label="Save meetup"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave?.(lobby.id, e);
              }}
              className={`p-1.5 rounded-full border backdrop-blur-md transition-colors ${
                isSaved
                  ? 'bg-white text-stone-950 border-white'
                  : 'bg-stone-950/75 border-white/10 text-stone-300 hover:text-white'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
          <span className="text-[11px] font-medium text-stone-300 mb-0.5 block">
            {lobby.category}
          </span>
          <h2 className="text-base font-bold text-white leading-snug line-clamp-1">
            {lobby.title}
          </h2>
          <p className="text-xs text-stone-300 font-normal mt-0.5 truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
            <span className="truncate">{lobby.venueName}</span>
            <span className="text-stone-400">·</span>
            <span className="shrink-0">{lobby.distanceLabel}</span>
          </p>
        </div>
      </div>

      <div className="p-3.5 flex items-center justify-between gap-3 bg-white dark:bg-[#1C1917] border-t border-stone-100 dark:border-stone-800/70">
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
                className="w-8 h-8 rounded-full border border-stone-200 dark:border-stone-700 object-cover bg-stone-100 dark:bg-stone-800"
              />
            )}
            {otherCount > 0 && (
              <div className="w-8 h-8 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center text-[11px] font-bold">
                +{otherCount}
              </div>
            )}
          </div>
          <div className="text-left min-w-0">
            <span className="block text-xs font-semibold text-stone-900 dark:text-stone-100 leading-tight truncate flex items-center gap-1">
              <span>{hostPerson?.name?.split(' ')[0] || 'Host'}</span>
              {Boolean((hostPerson as any)?.photoVerified) && (
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
              )}
            </span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium block truncate">
              Host · {lobby.participants.length} of {lobby.maxParticipants} joined
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
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:opacity-90 text-white dark:text-stone-950 text-xs font-semibold inline-flex items-center gap-1.5 transition active:scale-[0.98]"
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
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-xs font-semibold"
            >
              <Check className="w-3.5 h-3.5 inline mr-1" />
              {t('pending_approval')}
            </button>
          ) : isFull ? (
            <button
              type="button"
              disabled
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800/80 text-stone-400 dark:text-stone-500 text-xs font-semibold cursor-not-allowed border border-stone-200 dark:border-stone-700/50"
            >
              {isFinished ? t('finished') : t('spots_full')}
            </button>
          ) : (
            <button
              type="button"
              disabled={isJoining}
              onClick={(e) => onQuickJoin(lobby, e)}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition active:scale-[0.98]"
            >
              {lobby.joinMode === 'OPEN' ? t('join_spot') : t('request_spot')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
