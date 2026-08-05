"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGroups, useCreateGroup, useJoinGroup } from "@/hooks/useGroups";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  Users,
  Plus,
  Compass,
  ArrowRight,
  Loader2,
  KeyRound,
  X,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export function GroupsListView() {
  const router = useRouter();
  const { data, isLoading } = useGroups();
  const createGroupMutation = useCreateGroup();
  const joinGroupMutation = useJoinGroup();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  // Create form state
  const [groupName, setGroupName] = useState("");
  const [ghostMembersInput, setGhostMembersInput] = useState("");

  // Join form state
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  const groups = data?.groups || [];

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error("Please provide a group name");
      return;
    }

    const ghostNames = ghostMembersInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const created = await createGroupMutation.mutateAsync({
        name: groupName.trim(),
        ghostNames,
      });
      toast.success(`Group "${created.name}" created!`);
      setCreateModalOpen(false);
      setGroupName("");
      setGhostMembersInput("");
      router.push(`/dashboard/friends/groups/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create group");
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) {
      toast.error("Please enter a 6-character invite code");
      return;
    }

    try {
      const res = await joinGroupMutation.mutateAsync({
        code: inviteCodeInput.trim(),
      });
      toast.success(`Joined group "${res.groupName}"!`);
      setJoinModalOpen(false);
      setInviteCodeInput("");
      router.push(`/dashboard/friends/groups/${res.groupId}`);
    } catch (err: any) {
      toast.error(err.message || "Invalid invite code");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-fiber-line pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-text">
            Group Trip Ledgers
          </h2>
          <p className="text-xs text-muted-text">
            Multi-person shared ledgers with automatic debt simplification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setJoinModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[4px] border border-fiber-line bg-paper-bg hover:border-stamp-indigo hover:text-stamp-indigo px-3 py-1.5 text-xs font-mono text-ink-text transition-colors shadow-xs"
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Join with Code</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-muted-text animate-pulse">
          Loading your group ledgers...
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title="No Group Ledgers Yet"
          description="Create a shared group ledger for your upcoming trip, apartment, or dinner party to automatically split expenses and simplify debts."
          actionText="Create Your First Group"
          onActionClick={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const memberCount =
              (group.memberUids?.length || 0) + (group.ghostMembers?.length || 0);

            const createdDate =
              typeof group.createdAt === "string"
                ? new Date(group.createdAt)
                : (group.createdAt as any)?.toDate?.() || new Date();

            return (
              <Link
                key={group.id}
                href={`/dashboard/friends/groups/${group.id}`}
                className="group relative flex flex-col justify-between rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xs hover:border-stamp-indigo/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-fiber-line">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-stamp-indigo/10 text-stamp-indigo border border-stamp-indigo/20">
                        <Compass className="h-4 w-4" />
                      </div>
                      <span className="font-display font-bold text-base text-ink-text group-hover:text-stamp-indigo transition-colors">
                        {group.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-[3px] border border-fiber-line bg-paper-bg text-muted-text">
                      {memberCount} {memberCount === 1 ? "member" : "members"}
                    </span>
                  </div>

                  <div className="py-4 space-y-1 text-xs text-muted-text">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-text" />
                      <span>
                        {group.ghostMembers?.length > 0
                          ? `${group.memberUids.length} registered, ${group.ghostMembers.length} offline members`
                          : `${group.memberUids.length} registered members`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-fiber-line text-[11px] font-mono text-muted-text">
                  <span>Created {format(createdDate, "MMM d, yyyy")}</span>
                  <span className="flex items-center gap-1 font-bold text-stamp-indigo group-hover:translate-x-0.5 transition-transform">
                    <span>Open Ledger</span>
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[8px] border border-fiber-line bg-card-bg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-stamp-indigo" />
                <h3 className="font-display text-base font-bold text-ink-text">
                  Create Group Ledger
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-muted-text hover:text-ink-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-text">
                  Group / Trip Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goa Trip 2026, Apartment 4B"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-xs font-sans text-ink-text focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-text">
                  Offline / Ghost Members (Optional)
                </label>
                <p className="text-[11px] text-muted-text">
                  Comma-separated names of friends who don't have FinChat accounts yet:
                </p>
                <input
                  type="text"
                  placeholder="e.g. Alex, Maya, Dave"
                  value={ghostMembersInput}
                  onChange={(e) => setGhostMembersInput(e.target.value)}
                  className="w-full rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-xs font-sans text-ink-text focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-fiber-line">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-[4px] border border-fiber-line text-xs font-mono text-muted-text hover:text-ink-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] disabled:opacity-50"
                >
                  {createGroupMutation.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Create Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[8px] border border-fiber-line bg-card-bg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-stamp-indigo" />
                <h3 className="font-display text-base font-bold text-ink-text">
                  Join Group Ledger
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setJoinModalOpen(false)}
                className="text-muted-text hover:text-ink-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-text">
                  6-Character Invite Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. TRP8X2"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  className="w-full text-center font-mono font-bold tracking-widest text-lg uppercase rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-fiber-line">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-[4px] border border-fiber-line text-xs font-mono text-muted-text hover:text-ink-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinGroupMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] disabled:opacity-50"
                >
                  {joinGroupMutation.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Join Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
