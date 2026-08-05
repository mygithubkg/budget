import {
  calculateMemberBalances,
  simplifyDebts,
} from "../debt-simplification";
import { GroupMemberInfo, GroupTransaction, GroupSettlement } from "@/types/group";

describe("Debt Simplification Engine", () => {
  const members: GroupMemberInfo[] = [
    { id: "u1", name: "Alice", isGhost: false },
    { id: "u2", name: "Bob", isGhost: false },
    { id: "u3", name: "Charlie", isGhost: true },
  ];

  it("calculates 3-way equal split correctly", () => {
    // Alice pays 300 for dinner split equally between Alice, Bob, Charlie (100 each)
    const tx: GroupTransaction = {
      id: "tx-1",
      groupId: "grp-1",
      description: "Dinner",
      category: "Food",
      date: "2026-08-01",
      totalAmount: 300,
      paidBy: "u1",
      splits: [
        { memberRef: "u1", amount: 100 },
        { memberRef: "u2", amount: 100 },
        { memberRef: "u3", amount: 100 },
      ],
      createdAt: "2026-08-01",
    };

    const balances = calculateMemberBalances(members, [tx], []);
    const aliceBal = balances.find((b) => b.memberRef === "u1");
    const bobBal = balances.find((b) => b.memberRef === "u2");
    const charlieBal = balances.find((b) => b.memberRef === "u3");

    expect(aliceBal?.netBalance).toBe(200); // paid 300, share 100 -> +200
    expect(bobBal?.netBalance).toBe(-100); // paid 0, share 100 -> -100
    expect(charlieBal?.netBalance).toBe(-100); // paid 0, share 100 -> -100

    const simplified = simplifyDebts(members, [tx], []);
    expect(simplified).toHaveLength(2);
    expect(simplified).toContainEqual({
      fromMemberRef: "u2",
      fromName: "Bob",
      toMemberRef: "u1",
      toName: "Alice",
      amount: 100,
    });
    expect(simplified).toContainEqual({
      fromMemberRef: "u3",
      fromName: "Charlie",
      toMemberRef: "u1",
      toName: "Alice",
      amount: 100,
    });
  });

  it("simplifies transitive cycle of debts", () => {
    // Alice pays 100 for Bob (Bob owes Alice 100)
    // Bob pays 100 for Charlie (Charlie owes Bob 100)
    // Simplified: Charlie pays Alice 100 directly. Bob owes/is-owed 0.
    const tx1: GroupTransaction = {
      id: "tx-1",
      groupId: "grp-1",
      description: "Taxi for Bob",
      category: "Transport",
      date: "2026-08-01",
      totalAmount: 100,
      paidBy: "u1",
      splits: [{ memberRef: "u2", amount: 100 }],
      createdAt: "2026-08-01",
    };
    const tx2: GroupTransaction = {
      id: "tx-2",
      groupId: "grp-1",
      description: "Coffee for Charlie",
      category: "Food",
      date: "2026-08-01",
      totalAmount: 100,
      paidBy: "u2",
      splits: [{ memberRef: "u3", amount: 100 }],
      createdAt: "2026-08-01",
    };

    const simplified = simplifyDebts(members, [tx1, tx2], []);
    expect(simplified).toHaveLength(1);
    expect(simplified[0]).toEqual({
      fromMemberRef: "u3",
      fromName: "Charlie",
      toMemberRef: "u1",
      toName: "Alice",
      amount: 100,
    });
  });

  it("accounts for recorded settlement payments", () => {
    const tx: GroupTransaction = {
      id: "tx-1",
      groupId: "grp-1",
      description: "Dinner",
      category: "Food",
      date: "2026-08-01",
      totalAmount: 200,
      paidBy: "u1",
      splits: [
        { memberRef: "u1", amount: 100 },
        { memberRef: "u2", amount: 100 },
      ],
      createdAt: "2026-08-01",
    };

    const st: GroupSettlement = {
      id: "st-1",
      groupId: "grp-1",
      fromMemberRef: "u2",
      toMemberRef: "u1",
      amount: 100,
      date: "2026-08-02",
      createdAt: "2026-08-02",
    };

    const balances = calculateMemberBalances(members, [tx], [st]);
    const aliceBal = balances.find((b) => b.memberRef === "u1");
    const bobBal = balances.find((b) => b.memberRef === "u2");

    expect(aliceBal?.netBalance).toBe(0);
    expect(bobBal?.netBalance).toBe(0);

    const simplified = simplifyDebts(members, [tx], [st]);
    expect(simplified).toHaveLength(0);
  });
});
