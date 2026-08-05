"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  Group,
  GroupMemberInfo,
  GroupTransaction,
  GroupSettlement,
  SimplifiedPayment,
  MemberBalanceSummary,
} from "@/types/group";

export interface GroupDetailsData {
  group: Group & { inviteCode?: string };
  members: GroupMemberInfo[];
  transactions: GroupTransaction[];
  settlements: GroupSettlement[];
  balances: MemberBalanceSummary[];
  simplifiedDebts: SimplifiedPayment[];
}

export function useGroups() {
  const { getIdToken, user } = useAuth();

  return useQuery<{ groups: Group[] }>({
    queryKey: ["groups", user?.uid],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) return { groups: [] };

      const res = await fetch("/api/groups", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load groups");
      return res.json();
    },
    enabled: !!user,
  });
}

export function useGroupDetails(groupId: string) {
  const { getIdToken, user } = useAuth();

  return useQuery<GroupDetailsData>({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const token = await getIdToken();
      if (!token) throw new Error("Unauthenticated");

      const res = await fetch(`/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load group details");
      }
      return res.json();
    },
    enabled: !!user && !!groupId,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { getIdToken, user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, ghostNames }: { name: string; ghostNames?: string[] }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Unauthenticated");

      const res = await fetch("/api/groups", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, ghostNames }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create group");
      return data.group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.uid] });
    },
  });
}

export function useAddGroupTransaction(groupId: string) {
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      description: string;
      category?: string;
      totalAmount: number;
      paidBy: string;
      date?: string;
      splits?: Array<{ memberRef: string; amount: number }>;
      source?: string;
    }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Unauthenticated");

      const res = await fetch(`/api/groups/${groupId}/transactions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record transaction");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
}

export function useAddGroupSettlement(groupId: string) {
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      fromMemberRef: string;
      toMemberRef: string;
      amount: number;
      date?: string;
    }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Unauthenticated");

      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record settlement");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
}

export function useAddGhostMember(groupId: string) {
  const queryClient = useQueryClient();
  const { getIdToken } = useAuth();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Unauthenticated");

      const res = await fetch(`/api/groups/${groupId}/ghosts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add member");
      return data.ghost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  const { getIdToken, user } = useAuth();

  return useMutation({
    mutationFn: async ({ code }: { code: string }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Unauthenticated");

      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join group");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", user?.uid] });
    },
  });
}
