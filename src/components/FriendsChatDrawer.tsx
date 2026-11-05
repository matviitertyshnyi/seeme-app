'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Send,
  UserPlus,
  UserCheck,
  MessageCircle,
  Users,
  Search,
  Check,
  CalendarPlus,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { UserPersona } from '@/types/lobby';
import { CategoryIcon } from '@/components/CategoryIcon';

export interface FriendsChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserPersona;
  personas: UserPersona[];
  directMessages: any[];
  activeChatPartnerId: string | null;
  onSelectChatPartner: (userId: string | null) => void;
  onSendDirectMessage: (
    toUserId: string,
    text: string,
    lobbyInviteId?: string
  ) => Promise<void>;
  onAcceptFriendRequest: (targetUserId: string) => Promise<void>;
  onDeclineFriendRequest: (targetUserId: string) => Promise<void>;
  onSendFriendRequest: (targetUserId: string) => Promise<void>;
  onOpenPlayerProfile: (user: UserPersona) => void;
  onOpenLightbox: (imageUrl: string, name: string) => void;
  activeHostedLobbyId?: string | null;
}

type DrawerTab = 'MESSAGES' | 'REQUESTS' | 'FIND';

const ICEBREAKERS = [
  'Hey! Down for coffee or a meetup soon?',
  'Are you free later today?',
  'Would love to hang out or play this week!',
];

export function FriendsChatDrawer({
  isOpen,
  onClose,
  activeUser,
  personas,
  directMessages,
  activeChatPartnerId,
  onSelectChatPartner,
  onSendDirectMessage,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onSendFriendRequest,
  onOpenPlayerProfile,
  onOpenLightbox,
  activeHostedLobbyId,
}: FriendsChatDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('MESSAGES');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [busyUserIds, setBusyUserIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeChatPartnerId) {
          onSelectChatPartner(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeChatPartnerId, onClose, onSelectChatPartner]);

  // Scroll to bottom when new messages arrive or chat partner opens
  useEffect(() => {
    if (activeChatPartnerId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatPartnerId, directMessages]);

  if (!isOpen) return null;

  const partner = activeChatPartnerId
    ? personas.find((p) => p.id === activeChatPartnerId)
    : null;

  const activeFriendIds: string[] = (activeUser as any).friendIds || [];
  const activeIncomingIds: string[] =
    (activeUser as any).incomingFriendRequestIds || [];
  const activeOutgoingIds: string[] =
    (activeUser as any).outgoingFriendRequestIds || [];

  // Filter messages for current partner
  const conversationMessages = activeChatPartnerId
    ? (directMessages || []).filter((msg) => {
        const from = msg.senderId || msg.fromUserId;
        const to = msg.recipientId || msg.toUserId;
        return (
          (from === activeUser.id && to === activeChatPartnerId) ||
          (from === activeChatPartnerId && to === activeUser.id)
        );
      })
    : [];

  const handleSend = async (customText?: string, inviteId?: string) => {
    const textToSend = (customText !== undefined ? customText : messageText).trim();
    if (!textToSend || !activeChatPartnerId || isSending) return;

    setIsSending(true);
    try {
      await onSendDirectMessage(activeChatPartnerId, textToSend, inviteId);
      if (customText === undefined) {
        setMessageText('');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSendFriendAction = async (targetId: string) => {
    setBusyUserIds((prev) => ({ ...prev, [targetId]: true }));
    try {
      await onSendFriendRequest(targetId);
    } finally {
      setBusyUserIds((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  const handleAcceptFriendAction = async (targetId: string) => {
    setBusyUserIds((prev) => ({ ...prev, [targetId]: true }));
    try {
      await onAcceptFriendRequest(targetId);
    } finally {
      setBusyUserIds((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  const handleDeclineFriendAction = async (targetId: string) => {
    setBusyUserIds((prev) => ({ ...prev, [targetId]: true }));
    try {
      await onDeclineFriendRequest(targetId);
    } finally {
      setBusyUserIds((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  // Find people filtered by search
  const filteredPersonas = personas
    .filter((p) => p.id !== activeUser.id)
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.neighborhood && p.neighborhood.toLowerCase().includes(q)) ||
        (p.favoriteActivities &&
          p.favoriteActivities.some((act) => act.toLowerCase().includes(q)))
      );
    });

  // Conversation list users (friends or anyone with a direct message history)
  const conversationUserIds = Array.from(
    new Set([
      ...activeFriendIds,
      ...(directMessages || [])
        .map((m) => {
          const from = m.senderId || m.fromUserId;
          const to = m.recipientId || m.toUserId;
          if (from === activeUser.id) return to;
          if (to === activeUser.id) return from;
          return null;
        })
        .filter(Boolean),
    ])
  ) as string[];

  const conversationUsers = conversationUserIds
    .map((uid) => personas.find((p) => p.id === uid))
    .filter(Boolean) as UserPersona[];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Friends and Direct Messages"
      className="fixed inset-0 z-[1050] bg-stone-950/70 backdrop-blur-sm flex justify-end animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* VIEW 1: ACTIVE CHAT CONVERSATION */}
        {activeChatPartnerId && partner ? (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 bg-stone-50/80 dark:bg-stone-900/80 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectChatPartner(null)}
                  className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-300 transition-colors shrink-0 cursor-pointer"
                  title="Back to conversation list"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div
                  className="relative cursor-pointer shrink-0"
                  onClick={() => onOpenLightbox(partner.avatar, partner.name)}
                  title="Tap to view photo"
                >
                  <img
                    src={partner.avatar}
                    alt={partner.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-orange-500/30"
                  />
                  {(partner as any).photoVerified || partner.verified ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-stone-900">
                      <ShieldCheck className="w-2.5 h-2.5" />
                    </span>
                  ) : null}
                </div>

                <div
                  className="min-w-0 cursor-pointer"
                  onClick={() => onOpenPlayerProfile(partner)}
                  title="View profile"
                >
                  <div className="flex items-center gap-1 font-bold text-sm text-stone-900 dark:text-white truncate">
                    <span className="truncate">{partner.name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                    <span className="truncate">{partner.neighborhood || 'Nearby'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {activeHostedLobbyId && (
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() =>
                      handleSend(
                        'Hey! Join my meetup here in Leave The Room!',
                        activeHostedLobbyId
                      )
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 hover:bg-orange-200 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 text-xs font-bold flex items-center gap-1 transition-colors border border-orange-200 dark:border-orange-800 cursor-pointer"
                    title="Send meetup invitation"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Invite to My Meetup</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {conversationMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      Start chatting with {partner.name}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-xs">
                      Say hello or use one of the quick icebreakers below to plan an activity.
                    </p>
                  </div>
                </div>
              ) : (
                conversationMessages.map((msg, idx) => {
                  const from = msg.senderId || msg.fromUserId;
                  const isMine = from === activeUser.id;
                  const hasInvite = Boolean(msg.lobbyInviteId || msg.meetupId);

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium shadow-xs ${
                          isMine
                            ? 'bg-orange-600 text-white rounded-br-xs'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-bl-xs border border-stone-200/50 dark:border-stone-700/50'
                        }`}
                      >
                        {hasInvite && (
                          <div
                            className={`mb-2 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                              isMine
                                ? 'bg-orange-700/60 text-orange-100'
                                : 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                            }`}
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>Meetup Invitation</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>

                      {msg.createdAt && (
                        <span className="text-[10px] text-stone-400 mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Icebreakers */}
            <div className="px-3 pt-2 pb-1 bg-stone-50 dark:bg-stone-900/60 border-t border-stone-200 dark:border-stone-800 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                <span className="text-[10px] font-extrabold uppercase text-stone-400 flex items-center gap-1 shrink-0 mr-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Quick:
                </span>
                {ICEBREAKERS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMessageText(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold border border-stone-200 dark:border-stone-700 whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input Bar */}
            <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Message ${partner.name}...`}
                  className="flex-1 min-h-[44px] px-4 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim() || isSending}
                  className="w-11 h-11 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* VIEW 2: TABS (MESSAGES / REQUESTS / FIND PEOPLE) */
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                <h2 className="text-base font-extrabold text-stone-950 dark:text-white">
                  Friends & Messages
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Tabs */}
            <div className="flex items-center border-b border-stone-200 dark:border-stone-800 px-4 bg-stone-50/50 dark:bg-stone-900/50 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('MESSAGES')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer ${
                  activeTab === 'MESSAGES'
                    ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
              >
                Chats & Friends
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('REQUESTS')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition-colors relative cursor-pointer ${
                  activeTab === 'REQUESTS'
                    ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
              >
                <span>Requests</span>
                {activeIncomingIds.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white">
                    {activeIncomingIds.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('FIND')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer ${
                  activeTab === 'FIND'
                    ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                }`}
              >
                Find People
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* TAB 1: CHATS & FRIENDS */}
              {activeTab === 'MESSAGES' && (
                <div className="space-y-2">
                  {conversationUsers.length === 0 ? (
                    <div className="text-center py-12 px-4 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                          No friends or chats yet
                        </h4>
                        <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                          Connect with verified people nearby to chat and join meetups together!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('FIND')}
                        className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Find People Nearby</span>
                      </button>
                    </div>
                  ) : (
                    conversationUsers.map((user) => {
                      // Get last message in conversation if any
                      const lastMsg = (directMessages || [])
                        .filter((m) => {
                          const f = m.senderId || m.fromUserId;
                          const t = m.recipientId || m.toUserId;
                          return (
                            (f === activeUser.id && t === user.id) ||
                            (f === user.id && t === activeUser.id)
                          );
                        })
                        .slice(-1)[0];

                      return (
                        <div
                          key={user.id}
                          className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200/70 dark:border-stone-700/70 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                          onClick={() => onSelectChatPartner(user.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="relative shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPlayerProfile(user);
                              }}
                              title="View profile"
                            >
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-11 h-11 rounded-full object-cover ring-2 ring-stone-200 dark:ring-stone-700"
                              />
                              {((user as any).photoVerified || user.verified) && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-stone-900">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1 font-bold text-sm text-stone-900 dark:text-white truncate">
                                <span className="truncate">{user.name}</span>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              </div>
                              <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                                {lastMsg ? lastMsg.text : user.neighborhood || 'Verified Member'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectChatPartner(user.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: REQUESTS */}
              {activeTab === 'REQUESTS' && (
                <div className="space-y-4">
                  {/* Incoming */}
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 mb-2">
                      Incoming Friend Requests ({activeIncomingIds.length})
                    </h3>
                    {activeIncomingIds.length === 0 ? (
                      <p className="text-xs text-stone-500 py-3 italic">
                        No pending incoming requests.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {activeIncomingIds.map((requesterId) => {
                          const requester = personas.find((p) => p.id === requesterId);
                          if (!requester) return null;
                          const isBusy = busyUserIds[requester.id];

                          return (
                            <div
                              key={requester.id}
                              className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 flex items-center justify-between gap-3"
                            >
                              <div
                                className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                                onClick={() => onOpenPlayerProfile(requester)}
                              >
                                <img
                                  src={requester.avatar}
                                  alt={requester.name}
                                  className="w-10 h-10 rounded-full object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate flex items-center gap-1">
                                    <span>{requester.name}</span>
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  </div>
                                  <div className="text-[11px] text-stone-500 truncate">
                                    {requester.neighborhood}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleAcceptFriendAction(requester.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isBusy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Accept</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleDeclineFriendAction(requester.id)}
                                  className="p-1.5 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 text-stone-700 dark:text-stone-300 text-xs font-bold transition-all cursor-pointer"
                                  title="Decline"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Outgoing */}
                  {activeOutgoingIds.length > 0 && (
                    <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 mb-2">
                        Sent Requests ({activeOutgoingIds.length})
                      </h3>
                      <div className="space-y-2">
                        {activeOutgoingIds.map((targetId) => {
                          const target = personas.find((p) => p.id === targetId);
                          if (!target) return null;

                          return (
                            <div
                              key={target.id}
                              className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 flex items-center justify-between gap-3 text-xs text-stone-600 dark:text-stone-300"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <img
                                  src={target.avatar}
                                  alt={target.name}
                                  className="w-7 h-7 rounded-full object-cover shrink-0"
                                />
                                <span className="font-semibold truncate">{target.name}</span>
                              </div>
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                                Pending
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FIND PEOPLE */}
              {activeTab === 'FIND' && (
                <div className="space-y-3">
                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, city, or activity..."
                      className="w-full min-h-[42px] pl-9 pr-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>

                  {filteredPersonas.length === 0 ? (
                    <div className="text-center py-8 text-xs text-stone-500">
                      No members match your search.
                    </div>
                  ) : (
                    filteredPersonas.map((p) => {
                      const isFriend = activeFriendIds.includes(p.id);
                      const isOutgoing = activeOutgoingIds.includes(p.id);
                      const isIncoming = activeIncomingIds.includes(p.id);
                      const isBusy = busyUserIds[p.id];

                      return (
                        <div
                          key={p.id}
                          className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/70 dark:border-stone-700/70 flex flex-col gap-2.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div
                              className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                              onClick={() => onOpenPlayerProfile(p)}
                            >
                              <img
                                src={p.avatar}
                                alt={p.name}
                                className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-stone-200 dark:ring-stone-700"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate flex items-center gap-1">
                                  <span>{p.name}, {p.age}</span>
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                </div>
                                <div className="text-[11px] text-stone-500 truncate flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                                  <span>{p.neighborhood || 'Nearby'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isFriend ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectChatPartner(p.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>Message</span>
                                </button>
                              ) : isIncoming ? (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleAcceptFriendAction(p.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                >
                                  {isBusy ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Accept</span>
                                    </>
                                  )}
                                </button>
                              ) : isOutgoing ? (
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Pending
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleSendFriendAction(p.id)}
                                    className="px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold border border-stone-200 dark:border-stone-700 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                  >
                                    {isBusy ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <>
                                        <UserPlus className="w-3.5 h-3.5 text-orange-500" />
                                        <span>Add</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onSelectChatPartner(p.id)}
                                    className="p-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white transition-all cursor-pointer"
                                    title="Send message"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {p.favoriteActivities && p.favoriteActivities.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {p.favoriteActivities.slice(0, 3).map((act) => (
                                <span
                                  key={act}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-200/60 dark:bg-stone-700/60 text-stone-700 dark:text-stone-300 flex items-center gap-1"
                                >
                                  <CategoryIcon category={act} className="w-2.5 h-2.5" />
                                  <span>{act}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendsChatDrawer;
