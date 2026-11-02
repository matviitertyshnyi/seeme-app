'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  UserCheck,
  Clock,
  Trash2,
  Crown,
  User,
  Filter,
} from 'lucide-react';
import { UserPersona, VerificationStatus, UserRole } from '@/types/lobby';
import { GoogleIcon, AppleIcon } from '@/components/AuthProfileModal';

interface AdminAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminUser: UserPersona;
  personas: UserPersona[];
  onPersonasUpdated: (personas: UserPersona[], toastMsg: string) => void;
}

export function AdminAccountsModal({
  isOpen,
  onClose,
  adminUser,
  personas,
  onPersonasUpdated,
}: AdminAccountsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<
    'ALL' | 'PENDING' | 'UNVERIFIED' | 'VERIFIED' | 'BANNED' | 'ADMINS'
  >('ALL');
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  const filteredPersonas = useMemo(() => {
    return personas.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.neighborhood.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterTab === 'PENDING') return p.verificationStatus === 'PENDING';
      if (filterTab === 'UNVERIFIED') return p.verificationStatus === 'UNVERIFIED' || !p.verified;
      if (filterTab === 'VERIFIED') return p.verified || p.verificationStatus === 'VERIFIED';
      if (filterTab === 'BANNED') return Boolean(p.isBanned);
      if (filterTab === 'ADMINS') return p.role === 'ADMIN';
      return true;
    });
  }, [personas, searchQuery, filterTab]);

  const stats = useMemo(() => {
    return {
      total: personas.length,
      verified: personas.filter((p) => p.verified).length,
      pending: personas.filter((p) => p.verificationStatus === 'PENDING').length,
      banned: personas.filter((p) => p.isBanned).length,
      admins: personas.filter((p) => p.role === 'ADMIN').length,
    };
  }, [personas]);

  if (!isOpen) return null;

  const handleAdminAction = async (
    subAction: 'VERIFY_USER' | 'REVOKE_VERIFICATION' | 'BAN_USER' | 'UNBAN_USER' | 'CHANGE_ROLE' | 'DELETE_USER',
    targetUserId: string,
    extra?: { banReason?: string; newRole?: 'ADMIN' | 'USER' }
  ) => {
    setIsProcessingId(targetUserId);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADMIN_ACTION',
          adminUserId: adminUser.id,
          subAction,
          targetUserId,
          banReason: extra?.banReason,
          newRole: extra?.newRole,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.personas)) {
          const actionLabels: Record<string, string> = {
            VERIFY_USER: 'Account successfully verified!',
            REVOKE_VERIFICATION: 'Verification revoked.',
            BAN_USER: 'Account suspended.',
            UNBAN_USER: 'Account reinstated.',
            CHANGE_ROLE: 'Account role updated.',
            DELETE_USER: 'Account permanently deleted.',
          };
          onPersonasUpdated(data.personas, actionLabels[subAction] || 'Account updated.');
        }
      }
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  Admin Account Manager
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {stats.total} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verify identities, moderate profiles, and manage system roles.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Pill Strip */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'All Accounts', count: stats.total },
            { id: 'PENDING', label: 'Pending Review', count: stats.pending, highlight: stats.pending > 0 },
            { id: 'VERIFIED', label: 'Verified', count: stats.verified },
            { id: 'UNVERIFIED', label: 'Unverified', count: stats.total - stats.verified },
            { id: 'BANNED', label: 'Suspended', count: stats.banned },
            { id: 'ADMINS', label: 'Admins', count: stats.admins },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                filterTab === tab.id
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                  : tab.highlight
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search accounts by name, email, or neighborhood..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>
        </div>

        {/* Account Table / Card List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredPersonas.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No accounts found matching your filter</p>
            </div>
          ) : (
            filteredPersonas.map((p) => {
              const isSelf = p.id === adminUser.id;
              const isWorking = isProcessingId === p.id;

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    p.isBanned
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                      : p.verificationStatus === 'PENDING'
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* User Identity Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                        />
                        {p.verified && (
                          <span
                            title="Verified Member"
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                            {p.name}
                          </span>
                          {p.role === 'ADMIN' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                              <Crown className="w-2.5 h-2.5" />
                              Admin
                            </span>
                          )}
                          {p.isBanned && (
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                              Suspended
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="truncate">{p.email}</span>
                          <span>·</span>
                          <span className="truncate">{p.neighborhood}</span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {p.authProvider === 'google' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                              <GoogleIcon className="w-3 h-3" />
                              Google Auth
                            </span>
                          )}
                          {p.authProvider === 'apple' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                              <AppleIcon className="w-3 h-3" />
                              Apple ID
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-slate-500">
                            Score: {p.reliabilityScore}%
                          </span>
                          <span className="text-[10px] font-medium text-slate-500">
                            {p.meetupsAttended} meetups
                          </span>
                        </div>

                        {/* Verification Note if submitted */}
                        {p.verificationNote && (
                          <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-200">
                            <span className="font-bold">Verification Request Note:</span> {p.verificationNote}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 flex-wrap">
                      {/* Verify / Revoke Button */}
                      {p.verified ? (
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleAdminAction('REVOKE_VERIFICATION', p.id)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
                        >
                          Revoke Verification
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => handleAdminAction('VERIFY_USER', p.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Approve & Verify
                        </button>
                      )}

                      {/* Ban / Unban Button */}
                      {!isSelf && (
                        p.isBanned ? (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => handleAdminAction('UNBAN_USER', p.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors"
                          >
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isWorking}
                            onClick={() => handleAdminAction('BAN_USER', p.id, { banReason: 'Terms violation' })}
                            className="px-2.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold transition-colors"
                          >
                            Suspend
                          </button>
                        )
                      )}

                      {/* Delete Button */}
                      {!isSelf && (
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => {
                            if (confirm(`Are you sure you want to permanently delete ${p.name}'s account?`)) {
                              handleAdminAction('DELETE_USER', p.id);
                            }
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <span>Logged in as Admin: <strong className="text-slate-800 dark:text-slate-200">{adminUser.name}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
