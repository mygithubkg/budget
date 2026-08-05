import {
  GroupMemberInfo,
  GroupTransaction,
  GroupSettlement,
  SimplifiedPayment,
  MemberBalanceSummary,
} from "@/types/group";

/**
 * Calculates net balances for each group member based on transactions and settlements.
 */
export function calculateMemberBalances(
  members: GroupMemberInfo[],
  transactions: GroupTransaction[],
  settlements: GroupSettlement[]
): MemberBalanceSummary[] {
  const map: Record<
    string,
    { totalPaid: number; totalShare: number; name: string; isGhost: boolean }
  > = {};

  for (const m of members) {
    map[m.id] = {
      totalPaid: 0,
      totalShare: 0,
      name: m.name,
      isGhost: m.isGhost,
    };
  }

  // 1. Process group transactions
  for (const tx of transactions) {
    if (map[tx.paidBy]) {
      map[tx.paidBy].totalPaid += tx.totalAmount;
    }

    for (const split of tx.splits || []) {
      if (map[split.memberRef]) {
        map[split.memberRef].totalShare += split.amount;
      }
    }
  }

  // 2. Process settlements (from pays to -> from's net balance increases / debt reduced, to's debt increased / credit reduced)
  for (const st of settlements) {
    if (map[st.fromMemberRef]) {
      map[st.fromMemberRef].totalPaid += st.amount;
    }
    if (map[st.toMemberRef]) {
      map[st.toMemberRef].totalShare += st.amount;
    }
  }

  return members.map((m) => {
    const data = map[m.id] || { totalPaid: 0, totalShare: 0, name: m.name, isGhost: m.isGhost };
    const netBalance = Math.round((data.totalPaid - data.totalShare) * 100) / 100;
    return {
      memberRef: m.id,
      name: m.name,
      isGhost: m.isGhost,
      totalPaid: Math.round(data.totalPaid * 100) / 100,
      totalShare: Math.round(data.totalShare * 100) / 100,
      netBalance,
    };
  });
}

/**
 * Greedy Cash Flow Debt Simplification algorithm.
 * Reduces an arbitrary web of debts to the minimum number of direct settlement payments.
 */
export function simplifyDebts(
  members: GroupMemberInfo[],
  transactions: GroupTransaction[],
  settlements: GroupSettlement[]
): SimplifiedPayment[] {
  const balances = calculateMemberBalances(members, transactions, settlements);

  // Separate debtors (< 0) and creditors (> 0)
  const debtors: { id: string; name: string; amount: number }[] = [];
  const creditors: { id: string; name: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.netBalance < -0.01) {
      debtors.push({ id: b.memberRef, name: b.name, amount: Math.abs(b.netBalance) });
    } else if (b.netBalance > 0.01) {
      creditors.push({ id: b.memberRef, name: b.name, amount: b.netBalance });
    }
  }

  const payments: SimplifiedPayment[] = [];

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settled = Math.min(debtor.amount, creditor.amount);
    const roundedSettled = Math.round(settled * 100) / 100;

    if (roundedSettled > 0.01) {
      payments.push({
        fromMemberRef: debtor.id,
        fromName: debtor.name,
        toMemberRef: creditor.id,
        toName: creditor.name,
        amount: roundedSettled,
      });
    }

    debtor.amount -= settled;
    creditor.amount -= settled;

    if (debtor.amount < 0.01) {
      dIdx++;
    }
    if (creditor.amount < 0.01) {
      cIdx++;
    }
  }

  return payments;
}
