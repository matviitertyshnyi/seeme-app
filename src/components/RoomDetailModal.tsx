'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MapPin,
  Navigation,
  ExternalLink,
  Zap,
  ShieldCheck,
  Send,
  Check,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  LogOut,
  Lock,
  MessageSquare,
  Crown,
  Star,
  Bookmark,
  ShieldBan,
  Copy,
  CheckCircle2,
  ThumbsUp,
  Users,
} from 'lucide-react';
import {
  ArrivalStatus,
  ChatMessage,
  LobbyWithDistance,
  UserPersona,
} from '@/types/lobby';
import { CategoryIcon } from '@/components/CategoryIcon';
import { SeatBubbles } from '@/components/SeatBubbles';
import { StatusBadge } from '@/components/StatusBadge';
import { triggerSensoryFeedback } from '@/lib/sound';

interface RoomDetailModalProps {
  lobby: LobbyWithDistance | null;
  activeUser: UserPersona;
  onClose: () => void;
  isSignedOut?: boolean;
  onRequestAuth?: () => void;
  onLobbyUpdated: (updatedLobbyId?: string) => Promise<void>;
  onLobbyDeleted: (deletedId: string) => void;
  onQuickRatePlayer?: (
    toUserId: string,
    lobbyId: string,
    name: string
  ) => Promise<void>;
  onToggleRegularPartner?: (partnerId: string, name: string) => Promise<void>;
}

const QUICK_COORDINATION_REPLIES = [
  'On my way, about 5 mins out.',
  'I am here at the spot now.',
  'Which table or court are you at?',
  'Bringing extra gear, see you soon.',
];

const ARRIVAL_OPTIONS: { status: ArrivalStatus; label: string }[] = [
  { status: 'ARRIVED', label: "I'm Here!" },
  { status: 'FIVE_MIN_OUT', label: '5m Away' },
  { status: 'ON_MY_WAY', label: 'On My Way' },
  { status: 'LATE', label: '10m Late' },
];

export function RoomDetailModal({
  lobby,
  activeUser,
  onClose,
  isSignedOut = false,
  onRequestAuth,
  onLobbyUpdated,
  onLobbyDeleted,
  onQuickRatePlayer,
  onToggleRegularPartner,
}: RoomDetailModalProps) {
  const [mobileSection, setMobileSection] = useState<'DETAILS' | 'CHAT'>(
    'DETAILS'
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [spotClueInput, setSpotClueInput] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const myParticipantRecord = lobby
    ? lobby.participants.find((p) => p.id === activeUser.id)
    : undefined;
  const isParticipant = Boolean(myParticipantRecord);
  const isHost = lobby ? lobby.hostId === activeUser.id : false;
  const myPendingRequest = lobby
    ? lobby.pendingRequests.find((r) => r.user.id === activeUser.id)
    : undefined;
  const isFinished = lobby ? lobby.computedStatus === 'FINISHED' : false;
  const isFull = lobby
    ? lobby.participants.length >= lobby.maxParticipants || isFinished
    : false;

  useEffect(() => {
    if (myParticipantRecord?.spotClue) {
      setSpotClueInput(myParticipantRecord.spotClue);
    } else {
      setSpotClueInput('');
    }
  }, [myParticipantRecord?.spotClue, lobby?.id]);

  useEffect(() => {
    setMobileSection('DETAILS');
  }, [lobby?.id]);

  useEffect(() => {
    if (!lobby) return;
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/lobbies/${lobby.id}/messages`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } catch {
        // Ignore transient network errors
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [lobby?.id, lobby?.participants.length]);

  useEffect(() => {
    if (mobileSection === 'CHAT') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, mobileSection]);

  if (!lobby) return null;

  const handleCheckInUpdate = async (
    newArrivalStatus?: ArrivalStatus,
    customClue?: string
  ) => {
    if (isLoadingAction) return;
    setIsLoadingAction(true);
    triggerSensoryFeedback('CHECK_IN', activeUser.settings);
    try {
      const res = await fetch(`/api/lobbies/${lobby.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
          Authorization: `Bearer ${activeUser.id}`,
        },
        body: JSON.stringify({
          action: 'CHECK_IN',
          targetUserId: activeUser.id,
          arrivalStatus:
            newArrivalStatus ||
            myParticipantRecord?.arrivalStatus ||
            'ARRIVED',
          spotClue: customClue !== undefined ? customClue : spotClueInput,
        }),
      });
      if (res.ok) {
        await onLobbyUpdated(lobby.id);
      }
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleBanParticipant = async (targetUserId: string) => {
    if (isLoadingAction) return;
    setIsLoadingAction(true);
    try {
      const res = await fetch(`/api/lobbies/${lobby.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
          Authorization: `Bearer ${activeUser.id}`,
        },
        body: JSON.stringify({
          action: 'BAN_FROM_LOBBY',
          targetUserId,
        }),
      });
      if (res.ok) {
        await onLobbyUpdated(lobby.id);
      }
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleCopyAddress = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`${lobby.venueName}, ${lobby.venueAddress}`);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleJoinOrRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoadingAction) return;
    if (isSignedOut) {
      if (onRequestAuth) onRequestAuth();
      return;
    }
    setIsLoadingAction(true);
    triggerSensoryFeedback('JOIN', activeUser.settings);
    try {
      const res = await fetch(`/api/lobbies/${lobby.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
          Authorization: `Bearer ${activeUser.id}`,
        },
        body: JSON.stringify({
          action: 'JOIN_OR_REQUEST',
          user: {
            id: activeUser.id,
            name: activeUser.name,
            age: activeUser.age,
            avatar: activeUser.avatar,
            skillBadge: activeUser.skillBadge,
            tagline: activeUser.tagline,
            reliabilityScore: activeUser.reliabilityScore,
            ratingAvg: activeUser.ratingAvg,
            joinedAt: new Date().toISOString(),
          },
          note: requestNote,
        }),
      });
      if (res.ok) {
        setRequestNote('');
        await onLobbyUpdated(lobby.id);
      }
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleHostDecision = async (
    requestId: string,
    decision: 'ACCEPT_REQUEST' | 'DECLINE_REQUEST'
  ) => {
    if (isLoadingAction) return;
    setIsLoadingAction(true);
    triggerSensoryFeedback('SUCCESS', activeUser.settings);
    try {
      const res = await fetch(`/api/lobbies/${lobby.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
          Authorization: `Bearer ${activeUser.id}`,
        },
        body: JSON.stringify({
          action: decision,
          requestId,
        }),
      });
      if (res.ok) {
        await onLobbyUpdated(lobby.id);
      }
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleLeaveLobby = async () => {
    if (isLoadingAction) return;
    setIsLoadingAction(true);
    try {
      const res = await fetch(`/api/lobbies/${lobby.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
          Authorization: `Bearer ${activeUser.id}`,
        },
        body: JSON.stringify({
          action: 'LEAVE',
          targetUserId: activeUser.id,
        }),
      });
      if (res.ok) {
        await onLobbyUpdated(lobby.id);
      }
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleDeleteLobby = async () => {
    if (isLoadingAction) return;
    setIsLoadingAction(true);
    try {
      const res = await fetch(`/api/lobbies/${lobby.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': activeUser.id,
          Authorization: `Bearer ${activeUser.id}`,
        },
      });
      if (res.ok) {
        onLobbyDeleted(lobby.id);
        onClose();
      }
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? newMessageText).trim();
    if (!content || isSendingMsg || !isParticipant) return;
    setIsSendingMsg(true);
    triggerSensoryFeedback('TAP', activeUser.settings);
    try {
      const res = await fetch(`/api/lobbies/${lobby.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
          Authorization: `Bearer ${activeUser.id}`,
        },
        body: JSON.stringify({
          senderId: activeUser.id,
          senderName: activeUser.name,
          senderAvatar: activeUser.avatar,
          text: content,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
        if (!textToSend) {
          setNewMessageText('');
        }
      }
    } finally {
      setIsSendingMsg(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-stone-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meetup-detail-title"
        className="w-full max-w-5xl bg-white dark:bg-[#1C1917] rounded-t-[28px] sm:rounded-[28px] shadow-ambient-lg overflow-hidden border border-stone-200 dark:border-stone-800 flex flex-col max-h-[92vh]"
      >
        {/* TOP HERO BANNER */}
        <div className="relative h-40 sm:h-48 w-full shrink-0 bg-stone-900">
          <img
            src={lobby.coverImage}
            alt={lobby.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-stone-950/20" />

          <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge
                status={lobby.computedStatus}
                timeLabel={lobby.startTimeBadge}
                variant="solid"
              />
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-stone-900/85 text-xs font-extrabold text-white backdrop-blur-md">
                <Navigation className="w-3.5 h-3.5 text-orange-300" />
                {lobby.distanceLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close meetup details"
              className="w-11 h-11 rounded-full bg-stone-900/80 hover:bg-stone-900 text-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-3.5 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-600 text-white text-xs font-extrabold">
                <CategoryIcon category={lobby.category} className="w-3.5 h-3.5" />
                {lobby.category}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900/80 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider">
                {lobby.joinMode === 'OPEN' ? (
                  <>
                    <Zap className="w-3 h-3 text-emerald-300 fill-current" />
                    Instant Join
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-amber-300" />
                    Host Approval
                  </>
                )}
              </span>
            </div>
            <h2
              id="meetup-detail-title"
              className="text-lg sm:text-2xl font-extrabold leading-snug truncate"
            >
              {lobby.title}
            </h2>
          </div>
        </div>

        {/* MOBILE SEGMENTED SWITCHER (Prevents vertical stacking overlap on phones) */}
        <div className="lg:hidden px-4 py-2.5 bg-stone-100 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSection('DETAILS')}
            className={`min-h-[44px] rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-all ${
              mobileSection === 'DETAILS'
                ? 'bg-white dark:bg-stone-800 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-stone-700 dark:text-stone-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>
              Details & Roster ({lobby.participants.length}/
              {lobby.maxParticipants})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileSection('CHAT')}
            className={`min-h-[44px] rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-all ${
              mobileSection === 'CHAT'
                ? 'bg-white dark:bg-stone-800 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-stone-700 dark:text-stone-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              {isParticipant
                ? `Group Chat (${messages.length})`
                : 'Join Meetup'}
            </span>
          </button>
        </div>

        {/* BODY: 2 COLUMNS ON DESKTOP, CLEAN SINGLE ACTIVE VIEW ON MOBILE */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT PANEL: Meetup Details, Check-In, Venue, Roster & Approval Queue */}
          <div
            className={`${
              mobileSection === 'DETAILS' ? 'flex' : 'hidden lg:flex'
            } lg:w-[55%] flex-col overflow-y-auto p-4 sm:p-6 space-y-5 lg:border-r border-stone-200 dark:border-stone-800`}
          >
            {/* Primary Join CTA Banner on Mobile if user is not yet in the meetup */}
            {!isParticipant && !myPendingRequest && !isFull && (
              <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-extrabold text-orange-950 dark:text-orange-200">
                    {lobby.maxParticipants - lobby.participants.length} open{' '}
                    {lobby.maxParticipants - lobby.participants.length === 1
                      ? 'seat'
                      : 'seats'}{' '}
                    available
                  </div>
                  <p className="text-[11px] font-semibold text-orange-800 dark:text-orange-300">
                    {lobby.joinMode === 'OPEN'
                      ? 'Instant join: claim your spot in 1 tap'
                      : 'Host approval required'}
                  </p>
                </div>

                {lobby.joinMode === 'OPEN' ? (
                  <button
                    type="button"
                    disabled={isLoadingAction}
                    onClick={handleJoinOrRequest}
                    className="min-h-[44px] px-5 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-sm shrink-0 inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    Join Now
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMobileSection('CHAT')}
                    className="min-h-[44px] px-5 py-2.5 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold shadow-sm shrink-0"
                  >
                    Request Spot
                  </button>
                )}
              </div>
            )}

            {/* LIVE ARRIVAL CHECK-IN & VISUAL SPOT CLUE BAR (For Confirmed Participants) */}
            {isParticipant && (
              <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    Live Arrival Check-In
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                    Updates your roster badge
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ARRIVAL_OPTIONS.map((opt) => {
                    const isCurrent =
                      (myParticipantRecord?.arrivalStatus || 'ON_MY_WAY') ===
                      opt.status;
                    return (
                      <button
                        key={opt.status}
                        type="button"
                        disabled={isLoadingAction}
                        onClick={() => handleCheckInUpdate(opt.status)}
                        className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                          isCurrent
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                            : 'bg-white dark:bg-stone-900 hover:bg-emerald-100/60 text-stone-900 dark:text-stone-100 border-emerald-300 dark:border-emerald-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    aria-label="Spot clue description"
                    value={spotClueInput}
                    onChange={(e) => setSpotClueInput(e.target.value)}
                    placeholder='Spot clue (e.g. "Table 3, dark green hoodie")'
                    className="min-h-[44px] flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 text-xs font-semibold text-stone-950 dark:text-white placeholder:text-stone-500"
                  />
                  <button
                    type="button"
                    disabled={isLoadingAction}
                    onClick={() =>
                      handleCheckInUpdate(
                        myParticipantRecord?.arrivalStatus || 'ARRIVED',
                        spotClueInput
                      )
                    }
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-900 dark:bg-orange-600 hover:bg-stone-800 text-white text-xs font-extrabold shrink-0"
                  >
                    Save Clue
                  </button>
                </div>
              </div>
            )}

            {/* Real-Life Venue + Map Links */}
            <div className="bg-stone-50 dark:bg-stone-800/70 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    Meetup Location
                  </div>
                  <div className="text-sm font-extrabold text-stone-950 dark:text-white">
                    {lobby.venueName}
                  </div>
                  <div className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    {lobby.venueAddress}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${lobby.lat},${lobby.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-stone-900 hover:bg-stone-100 text-stone-950 dark:text-white border border-stone-300 dark:border-stone-700 text-xs font-extrabold shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  Google Maps
                </a>

                <a
                  href={`https://maps.apple.com/?ll=${lobby.lat},${lobby.lng}&q=${encodeURIComponent(
                    lobby.venueName
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-stone-900 hover:bg-stone-100 text-stone-950 dark:text-white border border-stone-300 dark:border-stone-700 text-xs font-extrabold shadow-sm"
                >
                  <Navigation className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  Apple Maps
                </a>

                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-stone-900 hover:bg-stone-100 text-stone-900 dark:text-white border border-stone-300 dark:border-stone-700 text-xs font-extrabold"
                >
                  {copiedAddress ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                      Copy Address
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Equipment & Activity Note */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                Equipment & Activity Note
              </h4>
              <p className="text-sm text-stone-800 dark:text-stone-200 font-medium leading-relaxed bg-stone-50 dark:bg-stone-800/70 rounded-2xl p-4 border border-stone-200 dark:border-stone-700">
                {lobby.equipmentNote}
              </p>
            </div>

            {/* Roster with Arrival Status, Spot Clues, Ratings & Host Ban */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Players ({lobby.participants.length}/{lobby.maxParticipants})
                </h4>
                <span className="text-xs font-extrabold text-orange-700 dark:text-orange-400">
                  {lobby.maxParticipants - lobby.participants.length === 0
                    ? 'All Seats Filled'
                    : `${lobby.maxParticipants - lobby.participants.length} Open`}
                </span>
              </div>

              <div className="bg-stone-50 dark:bg-stone-800/60 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 space-y-4">
                <SeatBubbles
                  participants={lobby.participants}
                  maxParticipants={lobby.maxParticipants}
                  hostId={lobby.hostId}
                  activeUserId={activeUser.id}
                  showSkillBadges
                />

                <div className="pt-3 border-t border-stone-200 dark:border-stone-700 space-y-2.5">
                  {lobby.participants.map((person) => {
                    const personIsHost = person.id === lobby.hostId;
                    const isSelf = person.id === activeUser.id;
                    const isRegular = activeUser.regularPartnerIds?.includes(
                      person.id
                    );

                    return (
                      <div
                        key={person.id}
                        className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-200 dark:border-stone-800 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={person.avatar}
                              alt={person.name}
                              className="w-11 h-11 rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-extrabold text-stone-950 dark:text-white">
                                  {person.name}, {person.age}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-200 text-[10px] font-extrabold border border-orange-200 dark:border-orange-800">
                                  {person.skillBadge || 'Active'}
                                </span>
                                {personIsHost && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-900 dark:bg-orange-600 text-white text-[10px] font-extrabold uppercase">
                                    <Crown className="w-2.5 h-2.5 text-amber-300" />
                                    Host
                                  </span>
                                )}
                                {person.arrivalStatus === 'ARRIVED' && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold">
                                    Arrived
                                  </span>
                                )}
                                {person.arrivalStatus === 'FIVE_MIN_OUT' && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-950 text-[10px] font-extrabold">
                                    5m Away
                                  </span>
                                )}
                                {person.arrivalStatus === 'LATE' && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 text-[10px] font-extrabold">
                                    10m Late
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700 dark:text-stone-300 mt-0.5">
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  {person.reliabilityScore ?? 98}% Shows Up
                                </span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                  {person.ratingAvg ?? 4.9}
                                </span>
                              </div>
                            </div>
                          </div>

                          {!isSelf && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {onQuickRatePlayer && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onQuickRatePlayer(
                                      person.id,
                                      lobby.id,
                                      person.name
                                    )
                                  }
                                  title={`Give ${person.name} a 5-Star rating`}
                                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-extrabold inline-flex items-center gap-1"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                  <span>5.0</span>
                                </button>
                              )}

                              {onToggleRegularPartner && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onToggleRegularPartner(
                                      person.id,
                                      person.name
                                    )
                                  }
                                  title={
                                    isRegular
                                      ? 'Saved in Regular Partners'
                                      : 'Save to Regular Partners'
                                  }
                                  className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
                                    isRegular
                                      ? 'bg-orange-600 text-white border-orange-600'
                                      : 'bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700'
                                  }`}
                                >
                                  <Bookmark className="w-4 h-4" />
                                </button>
                              )}

                              {isHost && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleBanParticipant(person.id)
                                  }
                                  title={`Kick and Ban ${person.name} from meetup`}
                                  className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center justify-center transition-colors"
                                >
                                  <ShieldBan className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {person.spotClue && (
                          <div className="text-xs font-bold text-orange-950 dark:text-orange-200 bg-orange-50/80 dark:bg-orange-950/60 rounded-lg px-3 py-1.5 border border-orange-200 dark:border-orange-800">
                            Spot clue: &ldquo;{person.spotClue}&rdquo;
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* HOST APPROVAL QUEUE */}
            {lobby.pendingRequests.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-2xl p-4 border border-amber-300 dark:border-amber-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-950 dark:text-amber-200">
                    Pending Join Requests ({lobby.pendingRequests.length})
                  </span>
                </div>

                {lobby.pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-stone-900 rounded-xl p-3.5 shadow-sm border border-amber-200 dark:border-amber-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={req.user.avatar}
                          alt={req.user.name}
                          className="w-11 h-11 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-extrabold text-stone-950 dark:text-white truncate">
                              {req.user.name}, {req.user.age}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-200 text-[10px] font-extrabold">
                              {req.user.skillBadge || 'Active'}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <span>
                              {req.user.reliabilityScore ?? 96}% Reliable ·
                            </span>
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            <span>{req.user.ratingAvg ?? 4.9}</span>
                          </div>
                        </div>
                      </div>

                      {isHost && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isLoadingAction || isFull}
                            onClick={() =>
                              handleHostDecision(req.id, 'ACCEPT_REQUEST')
                            }
                            className="min-h-[44px] inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-sm"
                          >
                            <UserCheck className="w-4 h-4" />
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={isLoadingAction}
                            onClick={() =>
                              handleHostDecision(req.id, 'DECLINE_REQUEST')
                            }
                            className="min-h-[44px] inline-flex items-center gap-1 px-3 py-2 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 text-xs font-extrabold"
                          >
                            <UserX className="w-4 h-4" />
                            Decline
                          </button>
                          <button
                            type="button"
                            disabled={isLoadingAction}
                            onClick={() => handleBanParticipant(req.user.id)}
                            title="Ban user"
                            className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 flex items-center justify-center"
                          >
                            <ShieldBan className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {req.note && (
                      <p className="text-xs text-stone-800 dark:text-stone-200 bg-stone-50 dark:bg-stone-800 rounded-lg px-3 py-2 font-medium">
                        &ldquo;{req.note}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-3">
              {isHost ? (
                <button
                  type="button"
                  onClick={handleDeleteLobby}
                  disabled={isLoadingAction}
                  className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-700 dark:text-rose-400 hover:text-rose-800 px-4 py-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  End & Close Meetup
                </button>
              ) : isParticipant || myPendingRequest ? (
                <button
                  type="button"
                  onClick={handleLeaveLobby}
                  disabled={isLoadingAction}
                  className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-extrabold text-stone-700 dark:text-stone-300 hover:text-rose-700 px-4 py-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {isParticipant ? 'Leave Meetup' : 'Cancel Join Request'}
                </button>
              ) : null}
            </div>
          </div>

          {/* RIGHT PANEL: Live Meetup Chat OR Join/Request Gate */}
          <div
            className={`${
              mobileSection === 'CHAT' ? 'flex' : 'hidden lg:flex'
            } lg:w-[45%] flex-col bg-stone-50 dark:bg-stone-950 flex-1 min-h-[380px]`}
          >
            <div className="flex px-4 sm:px-6 py-3.5 sm:py-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-stone-950 dark:text-white truncate">
                    Live Meetup Chat
                  </h3>
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate">
                    {isParticipant
                      ? 'Coordinate exact table, court, or arrival'
                      : 'Join this meetup to coordinate'}
                  </p>
                </div>
              </div>

              {isParticipant && (
                <button
                  type="button"
                  onClick={() => handleCheckInUpdate('ARRIVED')}
                  disabled={isLoadingAction || myParticipantRecord?.arrivalStatus === 'ARRIVED'}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 inline-flex items-center gap-1.5 ${
                    myParticipantRecord?.arrivalStatus === 'ARRIVED'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-brand hover:bg-brand-hover active:scale-95 text-white shadow-sm'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{myParticipantRecord?.arrivalStatus === 'ARRIVED' ? 'Checked In' : "I'm Here!"}</span>
                </button>
              )}
            </div>

            {isParticipant ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <p className="text-xs font-extrabold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                        No messages yet
                      </p>
                      <p className="text-xs font-medium text-stone-600 dark:text-stone-400 mt-1">
                        Say hello and let the group know what you are wearing or
                        when you will arrive.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === activeUser.id;
                      if (msg.isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <span className="px-3.5 py-1 rounded-full bg-white dark:bg-stone-900 text-xs font-bold text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 shadow-sm text-center">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2.5 ${
                            isMine ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <img
                            src={msg.senderAvatar}
                            alt={msg.senderName}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-white dark:border-stone-800 shadow-sm"
                          />
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                              isMine
                                ? 'bg-orange-600 text-white rounded-br-sm shadow-sm'
                                : 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white rounded-bl-sm border border-stone-200 dark:border-stone-800 shadow-sm'
                            }`}
                          >
                            {!isMine && (
                              <div className="text-[11px] font-extrabold text-orange-700 dark:text-orange-400 mb-0.5">
                                {msg.senderName}
                              </div>
                            )}
                            <p className="font-medium">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="px-4 py-2 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                  {QUICK_COORDINATION_REPLIES.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSendMessage(chip)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-orange-50 dark:hover:bg-orange-950 hover:text-orange-800 dark:hover:text-orange-300 border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-800 dark:text-stone-200 whitespace-nowrap transition-colors shrink-0"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3.5 sm:p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    aria-label="Chat message text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder={`Message as ${activeUser.name.split(' ')[0]}...`}
                    className="min-h-[44px] flex-1 px-4 py-2.5 rounded-full bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-950 dark:text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-600"
                  />
                  <button
                    type="submit"
                    aria-label="Send message"
                    disabled={!newMessageText.trim() || isSendingMsg}
                    className="w-11 h-11 rounded-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white flex items-center justify-center shadow-sm transition-all shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400 flex items-center justify-center mb-4">
                  {lobby.joinMode === 'OPEN' ? (
                    <Zap className="w-7 h-7" />
                  ) : (
                    <ShieldCheck className="w-7 h-7" />
                  )}
                </div>

                {myPendingRequest ? (
                  <div className="max-w-sm space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-950 text-xs font-extrabold">
                      <Check className="w-3.5 h-3.5" />
                      Request Sent to Host
                    </span>
                    <h4 className="text-xl font-extrabold text-stone-950 dark:text-white">
                      Waiting for host approval
                    </h4>
                    <p className="text-xs font-medium text-stone-700 dark:text-stone-300 leading-relaxed">
                      Your note: &ldquo;{myPendingRequest.note}&rdquo;.
                    </p>
                  </div>
                ) : isFull ? (
                  <div className="max-w-sm space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-900 text-xs font-extrabold">
                      <Lock className="w-3.5 h-3.5" />
                      {isFinished
                        ? 'Meetup Finished'
                        : `${lobby.participants.length}/${lobby.maxParticipants} Full`}
                    </span>
                    <h4 className="text-xl font-extrabold text-stone-950 dark:text-white">
                      {isFinished
                        ? 'This meetup has ended'
                        : 'This meetup is full'}
                    </h4>
                    <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                      {isFinished
                        ? 'Check out Live or Upcoming meetups in Explore.'
                        : `All ${lobby.maxParticipants} seats have been claimed.`}
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleJoinOrRequest}
                    className="w-full max-w-sm space-y-4"
                  >
                    <h4 className="text-xl font-extrabold text-stone-950 dark:text-white">
                      {lobby.joinMode === 'OPEN'
                        ? 'Claim an Open Seat Instantly'
                        : 'Request a Seat from the Host'}
                    </h4>
                    <p className="text-xs font-medium text-stone-700 dark:text-stone-300 leading-relaxed">
                      {lobby.joinMode === 'OPEN'
                        ? `Tap below to claim seat ${
                            lobby.participants.length + 1
                          } of ${lobby.maxParticipants} and unlock the group chat.`
                        : 'Add a short note below and the host can 1-tap accept your request.'}
                    </p>

                    {lobby.joinMode === 'APPROVAL_REQUIRED' && (
                      <textarea
                        rows={3}
                        aria-label="Optional note to the host"
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        placeholder="Optional note (e.g. 'Hey! I am 5 mins away and have extra balls')"
                        className="w-full rounded-2xl p-3.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-950 dark:text-white placeholder:text-stone-500 focus:outline-none focus:border-orange-600"
                      />
                    )}

                    <button
                      type="submit"
                      disabled={isLoadingAction}
                      className="min-h-[48px] w-full py-3.5 px-6 rounded-full bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-sm font-extrabold shadow-sm inline-flex items-center justify-center gap-2 transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      {lobby.joinMode === 'OPEN'
                        ? `Join Meetup (${lobby.participants.length}/${lobby.maxParticipants})`
                        : 'Send Join Request'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
