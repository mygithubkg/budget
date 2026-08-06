"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useJoinGroup } from "@/hooks/useGroups";
import { Compass, Users, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string || "").toUpperCase();

  const { user, loading: authLoading } = useAuth();
  const joinGroupMutation = useJoinGroup();

  const [hasJoined, setHasJoined] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);

  const handleJoin = React.useCallback(async () => {
    if (!code) return;
    try {
      const res = await joinGroupMutation.mutateAsync({ code });
      setHasJoined(true);
      setGroupId(res.groupId);
      setGroupName(res.groupName);
      toast.success(`Joined group "${res.groupName}"!`);
      setTimeout(() => {
        router.push(`/dashboard/friends/groups/${res.groupId}`);
      }, 1200);
    } catch (err: any) {
      toast.error(err.message || "Failed to join group");
    }
  }, [code, joinGroupMutation, router]);

  useEffect(() => {
    if (!authLoading && user && code && !hasJoined && !joinGroupMutation.isPending) {
      handleJoin();
    }
  }, [user, authLoading, code, hasJoined, joinGroupMutation.isPending, handleJoin]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-stamp-indigo" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-[8px] border border-fiber-line bg-card-bg p-6 text-center space-y-4 shadow-sm">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-stamp-indigo/10 text-stamp-indigo">
            <Compass className="h-6 w-6" />
          </div>
          <h1 className="font-display text-lg font-bold text-ink-text">
            Join Group Trip Ledger
          </h1>
          <p className="text-xs text-muted-text">
            Please log in or create a FinChat account to join this group ledger with invite code <strong className="font-mono text-stamp-indigo">{code}</strong>.
          </p>
          <Link
            href={`/login?redirect=/groups/join/${code}`}
            className="block w-full rounded-[4px] bg-stamp-indigo py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] hover:bg-stamp-indigo/90"
          >
            Log In to Join
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[8px] border border-fiber-line bg-card-bg p-6 text-center space-y-4 shadow-sm">
        {hasJoined ? (
          <>
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-stamp-emerald/10 text-stamp-emerald">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="font-display text-lg font-bold text-ink-text">
              You&apos;re in!
            </h1>
            <p className="text-xs text-muted-text">
              Successfully joined <strong>{groupName || "Group"}</strong>. Redirecting to ledger...
            </p>
            {groupId && (
              <Link
                href={`/dashboard/friends/groups/${groupId}`}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-stamp-indigo hover:underline"
              >
                <span>Go to Group Ledger</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-stamp-indigo/10 text-stamp-indigo">
              <Compass className="h-6 w-6" />
            </div>
            <h1 className="font-display text-lg font-bold text-ink-text">
              Joining Group Ledger...
            </h1>
            <p className="text-xs text-muted-text font-mono">
              Code: {code}
            </p>
            <div className="py-2 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-stamp-indigo" />
            </div>
            <button
              type="button"
              onClick={handleJoin}
              disabled={joinGroupMutation.isPending}
              className="w-full rounded-[4px] bg-stamp-indigo py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] hover:bg-stamp-indigo/90 disabled:opacity-50"
            >
              Retry Join
            </button>
          </>
        )}
      </div>
    </div>
  );
}
