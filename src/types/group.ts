import { Timestamp } from "firebase/firestore";

export interface GhostMember {
  ghostId: string;
  name: string;
}

export interface GroupMemberInfo {
  id: string; // uid or ghostId
  name: string;
  isGhost: boolean;
  email?: string;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date | Timestamp | string;
  memberUids: string[];
  ghostMembers: GhostMember[];
}

export interface GroupSplit {
  memberRef: string; // uid or ghostId
  amount: number;
}

export interface GroupTransaction {
  id: string;
  groupId: string;
  description: string;
  category: string;
  date: Date | Timestamp | string;
  totalAmount: number;
  paidBy: string; // uid or ghostId
  splits: GroupSplit[];
  createdAt: Date | Timestamp | string;
  source?: "chat" | "manual" | "receipt";
}

export interface GroupSettlement {
  id: string;
  groupId: string;
  fromMemberRef: string; // uid or ghostId
  toMemberRef: string; // uid or ghostId
  amount: number;
  date: Date | Timestamp | string;
  createdAt: Date | Timestamp | string;
}

export interface SimplifiedPayment {
  fromMemberRef: string;
  fromName: string;
  toMemberRef: string;
  toName: string;
  amount: number;
}

export interface MemberBalanceSummary {
  memberRef: string;
  name: string;
  isGhost: boolean;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface GroupInvite {
  code: string;
  groupId: string;
  groupName: string;
  createdBy: string;
  expiresAt: Date | Timestamp | string;
}
