'use client';

import React, { useState, useMemo } from 'react';
import {
  Crown,
  Users,
  Clock,
  Plus,
  UserPlus,
  ChevronRight,
  MessageCircle,
  Bell,
  Sparkles,
} from 'lucide-react';
import {
  ActivityCategory,
  LobbyWithDistance,
  StartTimeOption,
  UserPersona,
} from '@/types/lobby';
import { CategoryIcon } from '@/components/CategoryIcon';

export type MyMeetupsTab = 'HOSTING' | 'JOINED' | 'PAST';

export interface MyMeetupsViewProps {
  activeUser: UserPersona;
  lobbies: LobbyWithDistance[];
  selectedLobbyId: string | null;
  onSelectLobby: (lobbyId: string) => void;
  onOpenHostModal: (options?: { startTime?: StartTimeOption; category?: ActivityCategory }) => void;
  onQuickJoin?: (lobby: LobbyWithDistance, e: React.MouseEvent) => void;
  onNavigateExplore: () => void;
  nearestOpenMeetup?: LobbyWithDistance | null;
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
}: MyMeetupsViewProps) {
  const [activeTab, setActiveTab] = useState<MyMeetupsTab>('HOSTING');
  const [categoryFilter, setCategoryFilter] = useState<string | 'All'>('All');

  // 1. All meetups related to the active user
  const myAllRooms = useMemo(() => {
    return lobbies.filter(
      (lobby) =>
        lobby.hostId === activeUser.id ||
        lobby.participants.some((p) => p.id === activeUser.id) ||
        lobby.pendingRequests.some((r) => r.user.id === activeUser.id)
    );
  }, [lobbies, activeUser.id]);

  // 2. Active Hosted Meetups
  const myHostingRooms = useMemo(() => {
    return myAllRooms.filter(
      (lobby) =>
        lobby.hostId === activeUser.id &&
        lobby.computedStatus !== 'FINISHED'
    );
  }, [myAllRooms, activeUser.id]);

  // 3. Active Joined / Requested Meetups
  const myJoinedRooms = useMemo(() => {
    return myAllRooms.filter(
      (lobby) =>
        lobby.hostId !== activeUser.id &&
        (lobby.participants.some((p) => p.id === activeUser.id) ||
          lobby.pendingRequests.some((r) => r.user.id === activeUser.id)) &&
        lobby.computedStatus !== 'FINISHED'
    );
  }, [myAllRooms, activeUser.id]);

  // 4. Completed / Past Meetups
  const myPastRooms = useMemo(() => {
    return myAllRooms.filter(
      (lobby) =>
        lobby.computedStatus === 'FINISHED' &&
        (lobby.hostId === activeUser.id ||
          lobby.participants.some((p) => p.id === activeUser.id))
    );
  }, [myAllRooms, activeUser.id]);

  // 5. Total pending join requests on hosted meetups
  const totalPendingRequests = useMemo(() => {
    return myHostingRooms.reduce((acc, r) => acc + r.pendingRequests.length, 0);
  }, [myHostingRooms]);

  // Current tab items
  const currentTabRooms = useMemo(() => {
    switch (activeTab) {
      case 'HOSTING':
        return myHostingRooms;
      case 'JOINED':
        return myJoinedRooms;
      case 'PAST':
        return myPastRooms;
      default:
        return [];
    }
  }, [activeTab, myHostingRooms, myJoinedRooms, myPastRooms]);

  // Available categories within current tab
  const currentCategories = useMemo(() => {
    const set = new Set<ActivityCategory>();
    currentTabRooms.forEach((r) => set.add(r.category));
    return Array.from(set);
  }, [currentTabRooms]);

  // Filtered by category
  const filteredRooms = useMemo(() => {
    if (categoryFilter === 'All') return currentTabRooms;
    return currentTabRooms.filter((r) => r.category === categoryFilter);
  }, [currentTabRooms, categoryFilter]);

  const handleTabChange = (tab: MyMeetupsTab) => {
    setActiveTab(tab);
    setCategoryFilter('All');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white">
            My Meetups
          </h1>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Check in (&ldquo;I&apos;m Here&rdquo;), coordinate in chat, or manage player requests
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenHostModal({ startTime: 'Now' })}
          className="min-h-[44px] px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold shadow-sm inline-flex items-center gap-1.5 shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400"
        >
          <Plus className="w-4 h-4 stroke-[2.8]" />
          <span>Host</span>
        </button>
      </div>

      {/* Segmented Tab Controls */}
      <div
        role="tablist"
        aria-label="My Meetup Categories"
        className="grid grid-cols-3 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-inner"
      >
        <button
          type="button"
          role="tab"
          id="tab-hosting"
          aria-controls="panel-hosting"
          aria-selected={activeTab === 'HOSTING'}
          onClick={() => handleTabChange('HOSTING')}
          className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400 ${
            activeTab === 'HOSTING'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Crown className="w-3.5 h-3.5 shrink-0" />
          <span>Hosting</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'HOSTING'
                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {myHostingRooms.length}
          </span>
          {totalPendingRequests > 0 && (
            <span
              title={`${totalPendingRequests} pending join requests`}
              className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900 animate-pulse"
            />
          )}
        </button>

        <button
          type="button"
          role="tab"
          id="tab-joined"
          aria-controls="panel-joined"
          aria-selected={activeTab === 'JOINED'}
          onClick={() => handleTabChange('JOINED')}
          className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400 ${
            activeTab === 'JOINED'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>Joined</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'JOINED'
                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {myJoinedRooms.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-past"
          aria-controls="panel-past"
          aria-selected={activeTab === 'PAST'}
          onClick={() => handleTabChange('PAST')}
          className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-extrabold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400 ${
            activeTab === 'PAST'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Past</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'PAST'
                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {myPastRooms.length}
          </span>
        </button>
      </div>

      {/* Category Pills (Visible when more than 1 category exists in active tab) */}
      {currentCategories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setCategoryFilter('All')}
            className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-extrabold transition-colors ${
              categoryFilter === 'All'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
            }`}
          >
            All ({currentTabRooms.length})
          </button>
          {currentCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <CategoryIcon category={cat} className="w-3.5 h-3.5" />
              <span>{cat}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tab Panels */}
      <div role="tabpanel" id={`panel-${activeTab.toLowerCase()}`} aria-labelledby={`tab-${activeTab.toLowerCase()}`}>
        {filteredRooms.length === 0 ? (
          /* TAB EMPTY STATES */
          <div className="bg-white dark:bg-slate-900 rounded-[26px] p-8 text-center border border-slate-200 dark:border-slate-800 shadow-ambient space-y-4">
            {activeTab === 'HOSTING' && (
              <>
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                    You Are Not Hosting Any Meetups
                  </h2>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                    Host a spontaneous session for Chess, Ping Pong, Tennis, or Coffee. Set the venue and time, and players nearby can join or request entry.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenHostModal({ startTime: 'Now' })}
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold shadow-sm inline-flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400"
                >
                  <Plus className="w-4 h-4 stroke-[2.8]" />
                  <span>Host a Meetup Now</span>
                </button>
              </>
            )}

            {activeTab === 'JOINED' && (
              <>
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                    No Joined Meetups Yet
                  </h2>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                    You haven&apos;t joined any active games or sessions yet. Discover open meetups happening around you on the Explore feed or Map radar.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {nearestOpenMeetup && onQuickJoin && (
                    <button
                      type="button"
                      onClick={(e) => onQuickJoin(nearestOpenMeetup, e)}
                      className="min-h-[44px] px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold shadow-sm inline-flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>
                        Quick-Join {nearestOpenMeetup.category} ({nearestOpenMeetup.distanceLabel})
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onNavigateExplore}
                    className="min-h-[44px] px-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400"
                  >
                    Browse Explore Feed
                  </button>
                </div>
              </>
            )}

            {activeTab === 'PAST' && (
              <>
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mx-auto shadow-sm">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                    No Past Meetups Recorded
                  </h2>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                    Completed meetups, player ratings, and activity memories will appear here once your games finish.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateExplore}
                  className="min-h-[44px] px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold shadow-sm inline-flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Find Meetups to Play</span>
                </button>
              </>
            )}
          </div>
        ) : (
          /* ROOM LIST */
          <div className="space-y-3">
            {filteredRooms.map((room) => {
              const isRoomHost = room.hostId === activeUser.id;
              const isRoomMember = room.participants.some((p) => p.id === activeUser.id);
              const pendingCount = room.pendingRequests.length;

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onSelectLobby(room.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400 ${
                    selectedLobbyId === room.id
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={room.coverImage}
                        alt={room.title}
                        className="w-14 h-14 rounded-2xl object-cover bg-slate-200 dark:bg-slate-800"
                      />
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-extrabold">
                        {room.participants.length}/{room.maxParticipants}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          <CategoryIcon category={room.category} className="w-3 h-3" />
                          {room.category}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-extrabold ${
                            room.computedStatus === 'LIVE'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : room.computedStatus === 'UPCOMING'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              room.computedStatus === 'LIVE'
                                ? 'bg-emerald-500'
                                : room.computedStatus === 'UPCOMING'
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                          />
                          {room.startTimeBadge}
                        </span>
                      </div>

                      <div className="text-sm font-extrabold text-slate-950 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {room.title}
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {isRoomHost ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-extrabold">
                            <Crown className="w-2.5 h-2.5 text-amber-300" />
                            Hosting
                          </span>
                        ) : isRoomMember ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-[10px] font-extrabold">
                            <MessageCircle className="w-2.5 h-2.5" />
                            Joined
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 text-[10px] font-extrabold">
                            <Clock className="w-2.5 h-2.5" />
                            Pending Approval
                          </span>
                        )}

                        {isRoomHost && pendingCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                            <Bell className="w-2.5 h-2.5" />
                            {pendingCount} Request{pendingCount > 1 ? 's' : ''}
                          </span>
                        )}

                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">
                          · {room.distanceLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
