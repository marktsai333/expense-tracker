import type { Category, PaymentMethod, Transaction } from "./db";
import { monthKey } from "./format";

export function byId<T extends { id: number }>(list: T[]): Record<number, T> {
  return Object.fromEntries(list.map((x) => [x.id, x]));
}

export function getMonthTransactions(transactions: Transaction[], year: number, month: number): Transaction[] {
  const key = monthKey(year, month);
  return transactions.filter((tx) => tx.date && tx.date.startsWith(key));
}

export function isChartable(tx: Transaction, categoryById: Record<number, Category>): boolean {
  const cat = categoryById[tx.categoryId];
  return !(cat && cat.excludeFromChart);
}

export function filterChartable(list: Transaction[], categoryById: Record<number, Category>): Transaction[] {
  return list.filter((tx) => isChartable(tx, categoryById));
}

export function sum(list: Transaction[]): number {
  return list.reduce((s, tx) => s + tx.amount, 0);
}

export function categoryOf(tx: Transaction, categoryById: Record<number, Category>): Category {
  return categoryById[tx.categoryId] || { id: -1, name: "未分類", icon: "❓", color: "#999999", excludeFromChart: false };
}

export function paymentOf(tx: Transaction, paymentById: Record<number, PaymentMethod>): PaymentMethod | undefined {
  return tx.paymentId != null ? paymentById[tx.paymentId] : undefined;
}

export function computeAccountBalance(pm: PaymentMethod, transactions: Transaction[]): number {
  const spent = transactions
    .filter((tx) => tx.paymentId === pm.id && (pm.balanceResetAt == null || tx.date >= new Date(pm.balanceResetAt).toISOString().slice(0, 10)))
    .reduce((s, tx) => s + tx.amount, 0);
  if (pm.isCredit) return -spent;
  return pm.startingBalance - spent;
}

export function computeNetWorth(paymentMethods: PaymentMethod[], transactions: Transaction[]): { assets: number; liabilities: number; net: number } {
  let assets = 0;
  let liabilities = 0;
  for (const pm of paymentMethods) {
    const balance = computeAccountBalance(pm, transactions);
    if (pm.isCredit) liabilities += -balance;
    else assets += balance;
  }
  return { assets, liabilities, net: assets - liabilities };
}
