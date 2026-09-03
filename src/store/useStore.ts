import { create } from "zustand";
import {
  getDB,
  ensureDefaults,
  type Category,
  type NewCategory,
  type PaymentMethod,
  type NewPaymentMethod,
  type Transaction,
  type NewTransaction,
} from "../lib/db";

export type Page = "add" | "list" | "charts" | "settings";

interface Store {
  ready: boolean;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  page: Page;
  month: { year: number; month: number }; // month: 1-12
  editingId: number | null;

  init: () => Promise<void>;
  setPage: (page: Page) => void;
  changeMonth: (delta: number) => void;
  startEdit: (id: number) => void;
  cancelEdit: () => void;

  addTransaction: (tx: NewTransaction) => Promise<number>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;

  addCategory: (c: NewCategory) => Promise<number>;
  updateCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  addPaymentMethod: (p: NewPaymentMethod) => Promise<number>;
  updatePaymentMethod: (p: PaymentMethod) => Promise<void>;
  deletePaymentMethod: (id: number) => Promise<void>;

  importTransactions: (txs: NewTransaction[]) => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  ready: false,
  categories: [],
  paymentMethods: [],
  transactions: [],
  page: "add",
  month: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  editingId: null,

  init: async () => {
    await ensureDefaults();
    const db = await getDB();
    const [categories, paymentMethods, transactions] = await Promise.all([
      db.getAll("categories"),
      db.getAll("paymentMethods"),
      db.getAll("transactions"),
    ]);
    set({ categories, paymentMethods, transactions, ready: true });
  },

  setPage: (page) => set({ page }),
  startEdit: (id) => set({ editingId: id, page: "add" }),
  cancelEdit: () => set({ editingId: null }),

  changeMonth: (delta) => {
    let { year, month } = get().month;
    month += delta;
    if (month < 1) { month = 12; year -= 1; }
    if (month > 12) { month = 1; year += 1; }
    set({ month: { year, month } });
  },

  addTransaction: async (tx) => {
    const db = await getDB();
    const id = await db.add("transactions", tx as Transaction);
    set((s) => ({ transactions: [...s.transactions, { ...tx, id }] }));
    return id;
  },
  updateTransaction: async (tx) => {
    const db = await getDB();
    await db.put("transactions", tx);
    set((s) => ({ transactions: s.transactions.map((t) => (t.id === tx.id ? tx : t)) }));
  },
  deleteTransaction: async (id) => {
    const db = await getDB();
    await db.delete("transactions", id);
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
  },

  addCategory: async (c) => {
    const db = await getDB();
    const id = await db.add("categories", c as Category);
    set((s) => ({ categories: [...s.categories, { ...c, id }] }));
    return id;
  },
  updateCategory: async (c) => {
    const db = await getDB();
    await db.put("categories", c);
    set((s) => ({ categories: s.categories.map((x) => (x.id === c.id ? c : x)) }));
  },
  deleteCategory: async (id) => {
    const db = await getDB();
    await db.delete("categories", id);
    set((s) => ({ categories: s.categories.filter((x) => x.id !== id) }));
  },

  addPaymentMethod: async (p) => {
    const db = await getDB();
    const id = await db.add("paymentMethods", p as PaymentMethod);
    set((s) => ({ paymentMethods: [...s.paymentMethods, { ...p, id }] }));
    return id;
  },
  updatePaymentMethod: async (p) => {
    const db = await getDB();
    await db.put("paymentMethods", p);
    set((s) => ({ paymentMethods: s.paymentMethods.map((x) => (x.id === p.id ? p : x)) }));
  },
  deletePaymentMethod: async (id) => {
    const db = await getDB();
    await db.delete("paymentMethods", id);
    set((s) => ({ paymentMethods: s.paymentMethods.filter((x) => x.id !== id) }));
  },

  importTransactions: async (txs) => {
    const db = await getDB();
    const added: Transaction[] = [];
    for (const tx of txs) {
      const id = await db.add("transactions", tx as Transaction);
      added.push({ ...tx, id });
    }
    set((s) => ({ transactions: [...s.transactions, ...added] }));
  },

  clearAllData: async () => {
    const db = await getDB();
    await Promise.all([
      db.clear("transactions"),
      db.clear("categories"),
      db.clear("paymentMethods"),
    ]);
    await ensureDefaults();
    const [categories, paymentMethods] = await Promise.all([
      db.getAll("categories"),
      db.getAll("paymentMethods"),
    ]);
    set({ categories, paymentMethods, transactions: [] });
  },
}));
