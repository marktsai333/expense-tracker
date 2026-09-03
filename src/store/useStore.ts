import { create } from "zustand";
import {
  getDB,
  ensureDefaults,
  getSettings,
  DEFAULT_SETTINGS,
  type Category,
  type NewCategory,
  type PaymentMethod,
  type NewPaymentMethod,
  type Transaction,
  type NewTransaction,
  type AppSettings,
  type ThemeOverride,
} from "../lib/db";

export type Page = "overview" | "accounts" | "analysis" | "list" | "settings";

interface Store {
  ready: boolean;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  settings: AppSettings;
  page: Page;
  month: { year: number; month: number }; // month: 1-12

  // 記帳/編輯用的浮動 sheet 狀態(不再是獨立分頁)
  sheetOpen: boolean;
  editingId: number | null;
  listFilterCategoryId: number | null;
  listFilterPaymentId: number | null;

  overviewView: "assets" | "liabilities";
  paymentSheetOpen: boolean;
  editingPaymentId: number | null;

  init: () => Promise<void>;
  setPage: (page: Page) => void;
  changeMonth: (delta: number) => void;
  openAddSheet: () => void;
  openEditSheet: (id: number) => void;
  closeSheet: () => void;
  setOverviewView: (v: "assets" | "liabilities") => void;
  openPaymentSheet: (p: PaymentMethod | null) => void;
  closePaymentSheet: () => void;
  goToListFiltered: (opts: { categoryId?: number | null; paymentId?: number | null }) => void;
  clearListFilters: () => void;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setThemeOverride: (t: ThemeOverride) => Promise<void>;

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
  restoreBackup: (data: {
    categories: Category[];
    paymentMethods: PaymentMethod[];
    transactions: Transaction[];
    settings: AppSettings;
  }) => Promise<void>;
}

export const useStore = create<Store>((set, get) => ({
  ready: false,
  categories: [],
  paymentMethods: [],
  transactions: [],
  settings: DEFAULT_SETTINGS,
  page: "overview",
  month: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
  sheetOpen: false,
  editingId: null,
  listFilterCategoryId: null,
  listFilterPaymentId: null,

  overviewView: "assets",
  paymentSheetOpen: false,
  editingPaymentId: null,

  init: async () => {
    await ensureDefaults();
    const db = await getDB();
    const [categories, paymentMethods, transactions, settings] = await Promise.all([
      db.getAll("categories"),
      db.getAll("paymentMethods"),
      db.getAll("transactions"),
      getSettings(),
    ]);
    set({ categories, paymentMethods, transactions, settings, ready: true });
  },

  setPage: (page) => set({ page }),
  openAddSheet: () => set({ editingId: null, sheetOpen: true }),
  openEditSheet: (id) => set({ editingId: id, sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false, editingId: null }),
  setOverviewView: (v) => set({ overviewView: v }),
  openPaymentSheet: (p) => set({ editingPaymentId: p?.id ?? null, paymentSheetOpen: true }),
  closePaymentSheet: () => set({ paymentSheetOpen: false, editingPaymentId: null }),

  goToListFiltered: ({ categoryId, paymentId }) =>
    set({
      page: "list",
      listFilterCategoryId: categoryId ?? null,
      listFilterPaymentId: paymentId ?? null,
    }),
  clearListFilters: () => set({ listFilterCategoryId: null, listFilterPaymentId: null }),

  updateSettings: async (patch) => {
    const db = await getDB();
    const next = { ...get().settings, ...patch };
    await db.put("settings", next);
    set({ settings: next });
  },
  setThemeOverride: async (t) => {
    await get().updateSettings({ themeOverride: t });
  },

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

  restoreBackup: async (data) => {
    const db = await getDB();
    await Promise.all([
      db.clear("transactions"),
      db.clear("categories"),
      db.clear("paymentMethods"),
      db.clear("settings"),
    ]);
    for (const c of data.categories) await db.put("categories", c);
    for (const p of data.paymentMethods) await db.put("paymentMethods", p);
    for (const t of data.transactions) await db.put("transactions", t);
    await db.put("settings", data.settings);
    set({
      categories: data.categories,
      paymentMethods: data.paymentMethods,
      transactions: data.transactions,
      settings: data.settings,
    });
  },
}));
