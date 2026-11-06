'use client';

import React, { useState, useMemo } from 'react';
import {
  Crown,
  Users,
  Clock,
  Plus,
  Compass,
  MessageCircle,
  Bell,
  MapPin,
  Calendar,
  Bookmark,
} from 'lucide-react';
import {
  ActivityCategory,
  LobbyWithDistance,
  StartTimeOption,
  UserPersona,
} from '@/types/lobby';

export type MyMeetupsTab = 'HOSTING' | 'JOINED' | 'SAVED' | 'PAST';

export interface MyMeetupsViewProps {
  activeUser: UserPersona;
  lobbies: LobbyWithDistance[];
  selectedLobbyId: string | null;
  onSelectLobby: (lobbyId: string) => void;
  onOpenHostModal: (options?: { startTime?: StartTimeOption; category?: ActivityCategory }) => void;
  onQuickJoin?: (lobby: LobbyWithDistance, e: React.MouseEvent) => void;
  onNavigateExplore: () => void;
  nearestOpenMeetup?: LobbyWithDistance | null;
  savedLobbyIds?: string[];
}

export function MyMeetupsView({
  activeUser,
  lobbies,
  selectedLobbyId,
  onSelectLobby,
  onOpenHostModal,
  onQuickJoin,
  onNavigateExplore,
  nearestOpenMeetup,
  savedLobbyIds = [],
}: MyMeetupsViewProps) {
  const [activeTab, setActiveTab] = useState<MyMeetupsTab>('HOSTING');

  const myAllRooms = useMemo(() => {
    return lobbies.filter(
      (lobby) =>
        lobby.hostId === activeUser.id ||
        lobby.participants.some((p) => p.id === activeUser.id) ||
        lobby.pendingRequests.some((r) => r.user.id === activeUser.id)
    );
  }, [lobbies, activeUser.id]);

  const myHostingRooms = useMemo(() => {
    return myAllRooms.filter(
      (lobby) =>
        lobby.hostId === activeUser.id &&
        lobby.computedStatus !== 'FINISHED'
    );
  }, [myAllRooms, activeUser.id]);

  const myJoinedRooms = useMemo(() => {
    return myAllRooms.filter(
      (lobby) =>
        lobby.hostId !== activeUser.id &&
        (lobby.participants.some((p) => p.id === activeUser.id) ||
          lobby.pendingRequests.some((r) => r.user.id === activeUser.id)) &&
        lobby.computedStatus !== 'FINISHED'
    );
  }, [myAllRooms, activeUser.id]);

  const myPastRooms = useMemo(() => {
    return myAllRooms.filter(
      (lobby) =>
        lobby.computedStatus === 'FINISHED' &&
        (lobby.hostId === activeUser.id ||
          lobby.participants.some((p) => p.id === activeUser.id))
    );
  }, [myAllRooms, activeUser.id]);

  const mySavedRooms = useMemo(() => {
    if (!savedLobbyIds || savedLobbyIds.length === 0) return [];
    return lobbies.filter((lobby) => savedLobbyIds.includes(lobby.id));
  }, [lobbies, savedLobbyIds]);

  const totalPendingRequests = useMemo(() => {
    return myHostingRooms.reduce((acc, r) => acc + r.pendingRequests.length, 0);
  }, [myHostingRooms]);

  const currentTabRooms = useMemo(() => {
    switch (activeTab) {
      case 'HOSTING':
        return myHostingRooms;
      case 'JOINED':
        return myJoinedRooms;
      case 'SAVED':
        return mySavedRooms;
      case 'PAST':
        return myPastRooms;
      default:
        return [];
    }
  }, [activeTab, myHostingRooms, myJoinedRooms, mySavedRooms, myPastRooms]);

  return (
    <div className="space-y-4">
      <div className="pt-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          My Meetups
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Coordinate with players, manage join requests, and open active chats.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="My Meetup Categories"
        className="grid grid-cols-4 p-1.5 rounded-2xl bg-stone-100 dark:bg-[#141210] border border-stone-200 dark:border-stone-800/90 shadow-inner dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] text-xs font-semibold"
      >
        <button
          type="button"
          role="tab"
          id="tab-hosting"
          aria-controls="panel-hosting"
          aria-selected={activeTab === 'HOSTING'}
          onClick={() => setActiveTab('HOSTING')}
          className={`min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'HOSTING'
              ? 'bg-white dark:bg-[#1C1917] text-stone-950 dark:text-white shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.4)] border border-stone-200/80 dark:border-stone-700/80'
              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 border border-transparent'
          }`}
        >
          <Crown className="w-3.5 h-3.5 shrink-0 text-current" />
          <span>Hosting</span>
          <span className="text-[11px] font-bold text-stone-400">
            ({myHostingRooms.length})
          </span>
          {totalPendingRequests > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-joined"
          aria-controls="panel-joined"
          aria-selected={activeTab === 'JOINED'}
          onClick={() => setActiveTab('JOINED')}
          className={`min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'JOINED'
              ? 'bg-white dark:bg-[#1C1917] text-stone-950 dark:text-white shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.4)] border border-stone-200/80 dark:border-stone-700/80'
              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 border border-transparent'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0 text-current" />
          <span>Joined</span>
          <span className="text-[11px] font-bold text-stone-400">
            ({myJoinedRooms.length})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-saved"
          aria-controls="panel-saved"
          aria-selected={activeTab === 'SAVED'}
          onClick={() => setActiveTab('SAVED')}
          className={`min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'SAVED'
              ? 'bg-white dark:bg-[#1C1917] text-stone-950 dark:text-white shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.4)] border border-stone-200/80 dark:border-stone-700/80'
              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 border border-transparent'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 shrink-0 text-current" />
          <span>Saved</span>
          <span className="text-[11px] font-bold text-stone-400">
            ({mySavedRooms.length})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-past"
          aria-controls="panel-past"
          aria-selected={activeTab === 'PAST'}
          onClick={() => setActiveTab('PAST')}
          className={`min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'PAST'
              ? 'bg-white dark:bg-[#1C1917] text-stone-950 dark:text-white shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.4)] border border-stone-200/80 dark:border-stone-700/80'
              : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 border border-transparent'
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0 text-current" />
          <span>Past</span>
          <span className="text-[11px] font-bold text-stone-400">
            ({myPastRooms.length})
          </span>
        </button>
      </div>

      <div role="tabpanel" id={`panel-${activeTab.toLowerCase()}`} aria-labelledby={`tab-${activeTab.toLowerCase()}`}>
        {currentTabRooms.length === 0 ? (
          <div className="bg-white dark:bg-[#1C1917] rounded-3xl p-8 text-center border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_28px_rgba(0,0,0,0.5)] space-y-4">
            {activeTab === 'HOSTING' && (
              <>
                <div className="w-11 h-11 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center justify-center mx-auto">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-950 dark:text-stone-100">
                    You Are Not Hosting Any Meetups
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                    Host a spontaneous session for Chess, Ping Pong, Tennis, or Coffee. Set the venue and time, and nearby members can join.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenHostModal({ startTime: 'Now' })}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Host a Meetup Now</span>
                </button>
              </>
            )}

            {activeTab === 'JOINED' && (
              <>
                <div className="w-11 h-11 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-950 dark:text-stone-100">
                    No Joined Meetups Yet
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                    You haven&apos;t joined any active sessions yet. Find open meetups happening nearby right now on the Explore feed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateExplore}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm transition active:scale-[0.98] inline-flex items-center gap-1.5"
                >
                  <Compass className="w-4 h-4" />
                  <span>Discover Open Meetups</span>
                </button>
              </>
            )}

            {activeTab === 'SAVED' && (
              <>
                <div className="w-11 h-11 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center justify-center mx-auto">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-950 dark:text-stone-100">
                    No Saved Meetups
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                    You haven&apos;t saved any meetups yet. Bookmark interesting meetups in Explore to easily access them here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateExplore}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-sm transition active:scale-[0.98] inline-flex items-center gap-1.5"
                >
                  <Compass className="w-4 h-4" />
                  <span>Discover Open Meetups</span>
                </button>
              </>
            )}

            {activeTab === 'PAST' && (
              <>
                <div className="w-11 h-11 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-950 dark:text-stone-100">
                    No Past Meetups
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                    Completed meetups and mutual sportsmanship ratings will appear here after games conclude.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateExplore}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold border border-stone-200 dark:border-stone-700 transition active:scale-[0.98]"
                >
                  Find Meetups to Play
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {currentTabRooms.map((room) => {
              const isRoomHost = room.hostId === activeUser.id;
              const isJoined = room.participants.some((p) => p.id === activeUser.id);
              const pendingCount = room.pendingRequests.length;

              return (
                <article
                  key={room.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#1C1917] border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_6px_20px_-4px_rgba(0,0,0,0.5)] hover:border-orange-500/30 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-orange-600 dark:text-orange-400 uppercase tracking-wide text-[10px] font-bold">
                        {isRoomHost
                          ? 'Your Hosted Meetup'
                          : isJoined
                          ? 'Joined Session'
                          : 'Saved Meetup'} · {room.category}
                      </span>
                      {room.isRecurring && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-orange-950/70 border border-orange-500/30 text-orange-300 text-[10px] font-semibold">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{room.recurringSchedule ? room.recurringSchedule.replace('Every ', '') : 'Weekly'}</span>
                        </span>
                      )}
                    </div>
                    {pendingCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[11px] font-semibold border border-amber-200 dark:border-amber-800">
                        {pendingCount} Join Request{pendingCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-stone-400">
                        {room.participants.length}/{room.maxParticipants} spots filled
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="font-bold text-base text-stone-950 dark:text-stone-100 leading-snug">
                      {room.title}
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                      <span>{room.venueName}</span>
                      <span>·</span>
                      <span>{room.startTimeBadge || 'Today'}</span>
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectLobby(room.id)}
                      className="flex-1 min-h-[42px] py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 text-xs font-bold border border-stone-200 dark:border-stone-700/60 transition active:scale-[0.98]"
                    >
                      {isRoomHost ? 'Manage Players' : 'Meetup Details'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectLobby(room.id)}
                      className="flex-1 min-h-[42px] py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-[0_2px_10px_rgba(234,88,12,0.35)] border border-orange-400/30 transition flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Open Chat</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
