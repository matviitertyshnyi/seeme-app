'use client';

import React from 'react';
import {
  Navigation,
  MapPin,
  Zap,
  ShieldCheck,
  MessageCircle,
  Check,
  UserPlus,
  Lock,
  Bell,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { LobbyWithDistance, UserPersona } from '@/types/lobby';
import { CategoryIcon } from '@/components/CategoryIcon';
import { SeatBubbles } from '@/components/SeatBubbles';
import { StatusBadge } from '@/components/StatusBadge';

interface LobbyCardProps {
  lobby: LobbyWithDistance;
  activeUser: UserPersona;
  onSelectLobby: (lobby: LobbyWithDistance) => void;
  onQuickJoin: (lobby: LobbyWithDistance, e: React.MouseEvent) => void;
  isJoining?: boolean;
}

export function LobbyCard({
  lobby,
  activeUser,
  onSelectLobby,
  onQuickJoin,
  isJoining = false,
}: LobbyCardProps) {
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
      className={`group rounded-[26px] p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
        isParticipant
          ? 'bg-white dark:bg-slate-900 ring-2 ring-emerald-600 dark:ring-emerald-500 shadow-ambient'
          : isFinished
          ? 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800'
          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-ambient hover:border-indigo-400 dark:hover:border-indigo-500'
      }`}
    >
      <div>
        {/* Distinct Membership Banner for Meetups the User is Already In */}
        {isParticipant && (
          <div className="mb-3 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-950 dark:text-emerald-200">
              {isHost ? (
                <>
                  <Crown className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>Hosting Meetup</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>Joined Meetup</span>
                </>
              )}
            </div>

            {isHost && lobby.pendingRequests.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold">
                <Bell className="w-3 h-3" />
                {lobby.pendingRequests.length} Pending
              </span>
            )}
          </div>
        )}

        {/* Cover Image Container */}
        <div className="relative h-40 sm:h-44 w-full rounded-[20px] overflow-hidden bg-slate-200 dark:bg-slate-800">
          <img
            src={lobby.coverImage}
            alt={lobby.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-slate-950/15" />

          {/* Top Row: Status Color Badge + Join Mode */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <StatusBadge
              status={lobby.computedStatus}
              timeLabel={lobby.startTimeBadge}
              variant="solid"
            />

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-900/90 text-white backdrop-blur-md">
              {lobby.joinMode === 'OPEN' ? (
                <>
                  <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                  Instant Join
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  Approval
                </>
              )}
            </span>
          </div>

          {/* Bottom Overlay: Activity Pill + Distance Pill */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-950 text-xs font-extrabold shadow-sm">
              <CategoryIcon
                category={lobby.category}
                className="w-3.5 h-3.5 text-indigo-700"
              />
              {lobby.category}
            </span>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/90 text-white text-xs font-extrabold backdrop-blur-md">
              <Navigation className="w-3 h-3 text-indigo-300" />
              {lobby.distanceLabel}
            </span>
          </div>
        </div>

        {/* Structured Typography & Location Metadata */}
        <div className="pt-3.5 space-y-2">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {lobby.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 text-slate-900 dark:text-slate-200">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              {lobby.venueName}
            </span>
            {hostPerson && (
              <span className="text-slate-600 dark:text-slate-400">
                · Host: <strong className="text-slate-900 dark:text-slate-200">{hostPerson.name.split(' ')[0]}</strong> (
                {hostPerson.skillBadge || 'Host'})
              </span>
            )}
            {lobby.preferredAgeRange && lobby.preferredAgeRange !== 'All Ages (18+)' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60 font-semibold text-[11px]">
                {lobby.preferredAgeRange}
              </span>
            )}
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-200/80 dark:border-slate-700/80">
            {lobby.equipmentNote}
          </p>
        </div>
      </div>

      {/* Bottom Footer: Player Seats + 44x44px Primary Action Button */}
      <div className="pt-3.5 mt-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Seats ({lobby.participants.length}/{lobby.maxParticipants})
            </span>
            {!isFinished && spotsLeft > 0 ? (
              <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400">
                · {spotsLeft} open
              </span>
            ) : (
              <span className="text-xs font-extrabold text-rose-700 dark:text-rose-400">
                · {isFinished ? 'Ended' : 'Full'}
              </span>
            )}
          </div>

          <SeatBubbles
            participants={lobby.participants}
            maxParticipants={lobby.maxParticipants}
            hostId={lobby.hostId}
            activeUserId={activeUser.id}
            showSkillBadges
            onEmptySeatClick={(e) => {
              e.stopPropagation();
              if (!isParticipant && !hasPendingRequest && !isFull) {
                onQuickJoin(lobby, e);
              } else {
                onSelectLobby(lobby);
              }
            }}
          />
        </div>

        {/* Standardized Action Button (>= 44x44px) */}
        <div className="shrink-0">
          {isParticipant ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectLobby(lobby);
              }}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-extrabold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <MessageCircle className="w-4 h-4" />
              {isHost && lobby.pendingRequests.length > 0 ? 'Review' : 'Open Chat'}
            </button>
          ) : hasPendingRequest ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectLobby(lobby);
              }}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-400 dark:border-amber-700/80 text-xs font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <Check className="w-4 h-4" />
              Requested
            </button>
          ) : isFull ? (
            <button
              type="button"
              disabled
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-xs font-extrabold cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              {isFinished ? 'Finished' : 'Full'}
            </button>
          ) : (
            <button
              type="button"
              disabled={isJoining}
              onClick={(e) => onQuickJoin(lobby, e)}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <UserPlus className="w-4 h-4" />
              {lobby.joinMode === 'OPEN' ? 'Join Meetup' : 'Request Spot'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
