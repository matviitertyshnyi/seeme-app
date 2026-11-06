'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  MapPin,
  Navigation,
  ExternalLink,
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
  Bookmark,
  ShieldBan,
  Copy,
  ThumbsUp,
  Users,
  Edit3,
} from 'lucide-react';
import {
  ArrivalStatus,
  ChatMessage,
  LobbyWithDistance,
  UserPersona,
} from '@/types/lobby';
import { CategoryIcon } from '@/components/CategoryIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { triggerSensoryFeedback } from '@/lib/sound';
import { getDefaultCoverForCategory } from '@/lib/geo';

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
  isSaved?: boolean;
  onToggleSave?: (lobbyId: string) => void;
  onOpenEditMeetup?: (lobby: LobbyWithDistance) => void;
  onClickParticipant?: (userId: string) => void;
  onOpenLightbox?: (
    imageUrl: string,
    name: string,
    age?: number,
    verified?: boolean
  ) => void;
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
  isSaved = false,
  onToggleSave,
  onOpenEditMeetup,
  onClickParticipant,
  onOpenLightbox,
}: RoomDetailModalProps) {
  const [mobileSection, setMobileSection] = useState<'DETAILS' | 'CHAT'>('DETAILS');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [spotClueInput, setSpotClueInput] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
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

  const coverImageUrl = useMemo(() => {
    if (!lobby?.coverImage || lobby.coverImage.includes('unsplash.com')) {
      return getDefaultCoverForCategory(lobby?.category || 'Coffee');
    }
    return lobby.coverImage;
  }, [lobby?.coverImage, lobby?.category]);

  const hasCustomHostNote = Boolean(
    lobby?.equipmentNote &&
    lobby.equipmentNote.trim().length > 0 &&
    !lobby.equipmentNote.startsWith('I have extra gear for ') &&
    !lobby.equipmentNote.startsWith('All equipment ready.')
  );

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

  const handleShareMeetup = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = `${window.location.origin}/?meetup=${encodeURIComponent(lobby.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${lobby.title} — Leave The Room`,
          text: `Join our ${lobby.category} meetup at ${lobby.venueName}!`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2200);
    }
  };

  const handleJoinOrRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
            src={coverImageUrl}
            alt={lobby.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-stone-950/20" />

          {/* Top Row: Status + Distance, Actions */}
          <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge
                status={lobby.computedStatus}
                timeLabel={lobby.startTimeBadge}
                variant="solid"
              />
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-950/80 border border-white/15 text-[11px] font-semibold text-stone-200 backdrop-blur-md">
                <Navigation className="w-3 h-3 text-stone-400" />
                {lobby.distanceLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onToggleSave && (
                <button
                  type="button"
                  onClick={() => onToggleSave(lobby.id)}
                  aria-label={isSaved ? 'Remove saved meetup' : 'Save meetup'}
                  title={isSaved ? 'Remove saved meetup' : 'Save meetup'}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md border border-white/15 cursor-pointer ${
                    isSaved
                      ? 'bg-white text-stone-950'
                      : 'bg-stone-950/80 hover:bg-stone-900 text-stone-200'
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`}
                  />
                </button>
              )}

              {isHost && onOpenEditMeetup && (
                <button
                  type="button"
                  onClick={() => onOpenEditMeetup(lobby)}
                  aria-label="Edit meetup details"
                  className="h-9 sm:h-10 px-3 rounded-full bg-stone-950/80 hover:bg-stone-900 text-stone-200 border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-colors backdrop-blur-md cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-stone-200" />
                  <span>Edit</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleShareMeetup}
                aria-label="Share meetup link"
                className="h-9 sm:h-10 px-3 rounded-full bg-stone-950/80 hover:bg-stone-900 text-stone-200 border border-white/15 text-xs font-semibold flex items-center gap-1.5 transition-colors backdrop-blur-md cursor-pointer"
              >
                {copiedShareLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5 text-stone-200" />
                    <span>Share</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close meetup details"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-950/80 hover:bg-stone-900 text-stone-200 border border-white/15 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-stone-200" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Category overline, Title */}
          <div className="absolute bottom-3.5 left-4 right-4 text-white">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-300 mb-0.5">
              <CategoryIcon category={lobby.category} className="w-3.5 h-3.5 text-stone-300" />
              <span>{lobby.category}</span>
              {lobby.joinMode === 'APPROVAL_REQUIRED' && (
                <span className="text-stone-400">· Approval Required</span>
              )}
            </div>
            <h2
              id="meetup-detail-title"
              className="text-xl sm:text-2xl font-bold text-white leading-tight truncate"
            >
              {lobby.title}
            </h2>
          </div>
        </div>

        {/* MOBILE SEGMENTED SWITCHER */}
        <div className="lg:hidden px-4 py-2 bg-stone-100 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 grid grid-cols-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileSection('DETAILS')}
            className={`min-h-[38px] rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mobileSection === 'DETAILS'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>
              Details ({lobby.participants.length}/{lobby.maxParticipants})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileSection('CHAT')}
            className={`min-h-[38px] rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mobileSection === 'CHAT'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              {isParticipant
                ? `Chat (${messages.length})`
                : 'Join Meetup'}
            </span>
          </button>
        </div>

        {/* BODY: 2 COLUMNS ON DESKTOP */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT PANEL */}
          <div
            className={`${
              mobileSection === 'DETAILS' ? 'flex' : 'hidden lg:flex'
            } lg:w-[55%] flex-col overflow-y-auto p-4 sm:p-6 space-y-4 lg:border-r border-stone-200 dark:border-stone-800`}
          >
            {/* Unjoined Banner */}
            {!isParticipant && !myPendingRequest && !isFull && (
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800/90 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {lobby.maxParticipants - lobby.participants.length} {lobby.maxParticipants - lobby.participants.length === 1 ? 'spot' : 'spots'} available
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {lobby.joinMode === 'OPEN'
                      ? 'Instant join: claim your spot in 1 tap'
                      : 'Host approval required'}
                  </p>
                </div>

                {lobby.joinMode === 'OPEN' ? (
                  <button
                    type="button"
                    disabled={isLoadingAction}
                    onClick={() => handleJoinOrRequest()}
                    className="min-h-[38px] px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition active:scale-[0.98] shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    Join Spot
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMobileSection('CHAT')}
                    className="min-h-[38px] px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition active:scale-[0.98] shrink-0 cursor-pointer"
                  >
                    Request Spot
                  </button>
                )}
              </div>
            )}

            {/* CARD 1: Location & Details */}
            <div className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800/90 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {lobby.venueName}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {lobby.venueAddress}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${lobby.lat},${lobby.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700/80 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  Google Maps
                </a>

                <a
                  href={`https://maps.apple.com/?ll=${lobby.lat},${lobby.lng}&q=${encodeURIComponent(
                    lobby.venueName
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700/80 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  Apple Maps
                </a>

                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700/80 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedAddress ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                      Copy Address
                    </>
                  )}
                </button>
              </div>

              {/* Host Note inside Location card if custom and non-generic */}
              {hasCustomHostNote && (
                <div className="pt-3 border-t border-stone-200/70 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  <span className="font-semibold text-stone-700 dark:text-stone-200 mr-1.5">Note:</span>
                  {lobby.equipmentNote}
                </div>
              )}
            </div>

            {/* CARD 2: Arrival Check-In (For confirmed participants) */}
            {isParticipant && (
              <div className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    Check-In Status
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Let the group know where you are
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
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 border-stone-900 dark:border-stone-100 font-semibold shadow-2xs'
                            : 'bg-white dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700/80 font-medium'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Spot clue description"
                    value={spotClueInput}
                    onChange={(e) => setSpotClueInput(e.target.value)}
                    placeholder='Spot clue (e.g. "Table 3, dark hoodie")'
                    className="min-h-[38px] flex-1 bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
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
                    className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 text-white text-xs font-semibold border border-stone-700 shrink-0 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* CARD 3: People — Single Clean List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  People ({lobby.participants.length}/{lobby.maxParticipants})
                </h4>
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                  {lobby.maxParticipants - lobby.participants.length === 0
                    ? 'Full'
                    : `${lobby.maxParticipants - lobby.participants.length} spots open`}
                </span>
              </div>

              <div className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800/90 rounded-2xl overflow-hidden divide-y divide-stone-200/70 dark:divide-stone-800">
                {lobby.participants.map((person) => {
                  const personIsHost = person.id === lobby.hostId;
                  const isSelf = person.id === activeUser.id;
                  const isRegular = activeUser.regularPartnerIds?.includes(person.id);

                  return (
                    <div
                      key={person.id}
                      className="p-3.5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          onClick={() => {
                            if (onClickParticipant) {
                              onClickParticipant(person.id);
                            } else if (onOpenLightbox) {
                              onOpenLightbox(person.avatar, person.name, person.age, Boolean((person as any).photoVerified));
                            }
                          }}
                          className={`flex items-center gap-3 min-w-0 ${
                            onClickParticipant || onOpenLightbox
                              ? 'cursor-pointer hover:opacity-80 transition-opacity'
                              : ''
                          }`}
                        >
                          <img
                            src={person.avatar}
                            alt={person.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-stone-200 dark:border-stone-700"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                                {person.name}, {person.age}
                              </span>
                              {Boolean((person as any).photoVerified) && (
                                <ShieldCheck className="w-3 h-3 text-stone-400 dark:text-stone-500 shrink-0" />
                              )}
                              {personIsHost && (
                                <span className="px-2 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-semibold">
                                  Host
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 text-[10px] font-medium border border-stone-200/60 dark:border-stone-700/60">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    person.arrivalStatus === 'ARRIVED'
                                      ? 'bg-emerald-400'
                                      : 'bg-stone-400'
                                  }`}
                                />
                                {person.arrivalStatus === 'ARRIVED'
                                  ? 'Here'
                                  : person.arrivalStatus === 'FIVE_MIN_OUT'
                                  ? '5m away'
                                  : person.arrivalStatus === 'LATE'
                                  ? '10m late'
                                  : 'On the way'}
                              </span>
                            </div>

                            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                              {person.reliabilityScore ?? 98}% show-up · ★ {person.ratingAvg ?? 5}
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
                                className="min-h-[34px] px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <ThumbsUp className="w-3 h-3 text-stone-500 dark:text-stone-400" />
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
                                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                                  isRegular
                                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 border-stone-900 dark:border-white'
                                    : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                                }`}
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {isHost && (
                              <button
                                type="button"
                                onClick={() => handleBanParticipant(person.id)}
                                title={`Kick and Ban ${person.name} from meetup`}
                                className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <ShieldBan className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {person.spotClue && (
                        <div className="bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-300 text-xs px-3 py-1.5 rounded-lg">
                          Spot clue: &ldquo;{person.spotClue}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HOST APPROVAL QUEUE */}
            {lobby.pendingRequests.length > 0 && (
              <div className="bg-stone-50 dark:bg-stone-900/60 rounded-2xl p-4 border border-stone-200 dark:border-stone-800/90 space-y-3">
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                  Pending Join Requests ({lobby.pendingRequests.length})
                </span>

                {lobby.pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-stone-800/80 rounded-xl p-3 border border-stone-200 dark:border-stone-700/80 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div
                        onClick={() => {
                          if (onClickParticipant) {
                            onClickParticipant(req.user.id);
                          } else if (onOpenLightbox) {
                            onOpenLightbox(req.user.avatar, req.user.name, req.user.age, Boolean((req.user as any).photoVerified));
                          }
                        }}
                        className={`flex items-center gap-2.5 min-w-0 ${
                          onClickParticipant || onOpenLightbox
                            ? 'cursor-pointer hover:opacity-80 transition-opacity'
                            : ''
                        }`}
                      >
                        <img
                          src={req.user.avatar}
                          alt={req.user.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-stone-200 dark:border-stone-700"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              {req.user.name}, {req.user.age}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                            {req.user.reliabilityScore ?? 96}% show-up · ★ {req.user.ratingAvg ?? 4.9}
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
                            className="min-h-[34px] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-stone-100 hover:opacity-90 text-white dark:text-stone-950 text-xs font-semibold cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={isLoadingAction}
                            onClick={() =>
                              handleHostDecision(req.id, 'DECLINE_REQUEST')
                            }
                            className="min-h-[34px] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-semibold border border-stone-200 dark:border-stone-700 cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Decline
                          </button>
                          <button
                            type="button"
                            disabled={isLoadingAction}
                            onClick={() => handleBanParticipant(req.user.id)}
                            title="Ban user"
                            className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-600 dark:text-stone-400 flex items-center justify-center border border-stone-200 dark:border-stone-700 cursor-pointer"
                          >
                            <ShieldBan className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {req.note && (
                      <p className="text-xs text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-900 rounded-lg px-3 py-2 font-medium">
                        &ldquo;{req.note}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* FOOTER BUTTON: End & Close Meetup / Leave Meetup */}
            <div className="pt-1 flex items-center justify-between gap-3">
              {isHost ? (
                <button
                  type="button"
                  onClick={handleDeleteLobby}
                  disabled={isLoadingAction}
                  className="text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 px-3.5 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  End & Close Meetup
                </button>
              ) : isParticipant || myPendingRequest ? (
                <button
                  type="button"
                  onClick={handleLeaveLobby}
                  disabled={isLoadingAction}
                  className="text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 px-3.5 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
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
                <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-stone-950 dark:text-white truncate">
                    Meetup Chat
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                    {isParticipant
                      ? 'Coordinate exact table, court, or arrival'
                      : 'Join this meetup to coordinate'}
                  </p>
                </div>
              </div>
            </div>

            {isParticipant ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                        No messages yet
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                        Say hello and let the group know when you will arrive.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === activeUser.id;
                      if (msg.isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <span className="px-3 py-1 rounded-full bg-white dark:bg-stone-900 text-[11px] font-medium text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 shadow-2xs text-center">
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
                            onClick={() => {
                              if (onClickParticipant) {
                                onClickParticipant(msg.senderId);
                              } else if (onOpenLightbox) {
                                onOpenLightbox(msg.senderAvatar, msg.senderName, undefined, false);
                              }
                            }}
                            className={`w-8 h-8 rounded-full object-cover shrink-0 border border-stone-200 dark:border-stone-800 ${
                              onClickParticipant || onOpenLightbox
                                ? 'cursor-pointer hover:scale-105 transition-transform'
                                : ''
                            }`}
                          />
                          <div
                            className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                              isMine
                                ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 rounded-br-sm shadow-2xs'
                                : 'bg-white dark:bg-stone-900 text-stone-950 dark:text-white rounded-bl-sm border border-stone-200 dark:border-stone-800 shadow-2xs'
                            }`}
                          >
                            {!isMine && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onClickParticipant) {
                                    onClickParticipant(msg.senderId);
                                  } else if (onOpenLightbox) {
                                    onOpenLightbox(msg.senderAvatar, msg.senderName, undefined, false);
                                  }
                                }}
                                className={`text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-0.5 text-left block ${
                                  onClickParticipant || onOpenLightbox
                                    ? 'hover:underline cursor-pointer'
                                    : ''
                                }`}
                              >
                                {msg.senderName}
                              </button>
                            )}
                            <p className="font-normal">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Quick replies */}
                <div className="px-4 py-2 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                  {QUICK_COORDINATION_REPLIES.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSendMessage(chip)}
                      className="min-h-[32px] px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800/80 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700/80 text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer"
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
                  className="p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    aria-label="Chat message text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder={`Message as ${activeUser.name.split(' ')[0]}...`}
                    className="min-h-[40px] flex-1 px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-950 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
                  />
                  <button
                    type="submit"
                    aria-label="Send message"
                    disabled={!newMessageText.trim() || isSendingMsg}
                    className="w-10 h-10 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>

                {myPendingRequest ? (
                  <div className="max-w-sm space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 text-xs font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      Request Sent to Host
                    </span>
                    <h4 className="text-lg font-bold text-stone-950 dark:text-white">
                      Waiting for host approval
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      Your note: &ldquo;{myPendingRequest.note}&rdquo;.
                    </p>
                  </div>
                ) : isFull ? (
                  <div className="max-w-sm space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700 text-xs font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      {isFinished
                        ? 'Meetup Finished'
                        : `${lobby.participants.length}/${lobby.maxParticipants} Full`}
                    </span>
                    <h4 className="text-lg font-bold text-stone-950 dark:text-white">
                      {isFinished
                        ? 'This meetup has ended'
                        : 'This meetup is full'}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {isFinished
                        ? 'Check out other meetups in Explore.'
                        : `All ${lobby.maxParticipants} seats have been claimed.`}
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleJoinOrRequest}
                    className="w-full max-w-sm space-y-3"
                  >
                    <h4 className="text-lg font-bold text-stone-950 dark:text-white">
                      {lobby.joinMode === 'OPEN'
                        ? 'Claim an Open Seat'
                        : 'Request a Seat from Host'}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      {lobby.joinMode === 'OPEN'
                        ? `Claim seat ${
                            lobby.participants.length + 1
                          } of ${lobby.maxParticipants} to unlock the group chat.`
                        : 'Add an optional note to send to the host.'}
                    </p>

                    {lobby.joinMode === 'APPROVAL_REQUIRED' && (
                      <textarea
                        rows={3}
                        aria-label="Optional note to the host"
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        placeholder="Optional note (e.g. 'Hey, 5 mins away!')"
                        className="w-full rounded-xl p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-950 dark:text-white placeholder:text-stone-400 focus:outline-none focus:border-stone-400"
                      />
                    )}

                    <button
                      type="submit"
                      disabled={isLoadingAction}
                      className="min-h-[42px] w-full py-2.5 px-5 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white text-xs font-semibold transition cursor-pointer"
                    >
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
