import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  excludeFromChart: boolean;
}
export type NewCategory = Omit<Category, "id">;

export interface PaymentMethod {
  id: number;
  name: string;
  isCredit: boolean;
  limit: number | null;
}
export type NewPaymentMethod = Omit<PaymentMethod, "id">;

export interface ItemBreakdown {
  name: string;
  amount: number | null;
}

export interface Transaction {
  id: number;
  date: string; // YYYY-MM-DD
  categoryId: number;
  subitem: string;
  amount: number; // 實際總額(含小費)
  subtotal: number | null; // 小費前的小計
  tipPercent: number | null;
  tipAmount: number | null;
  paymentId: number | null;
  note: string;
  items: ItemBreakdown[] | null;
}
export type NewTransaction = Omit<Transaction, "id">;

export type ThemeOverride = "system" | "light" | "dark";

export interface AppSettings {
  id: "app";
  tipPresets: number[];
  themeOverride: ThemeOverride;
  showSuggestChips: boolean;
  showPlaceholderExamples: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  tipPresets: [15, 18, 20, 25],
  themeOverride: "system",
  showSuggestChips: true,
  showPlaceholderExamples: true,
};

interface ExpenseDB extends DBSchema {
  transactions: {
    key: number;
    value: Transaction;
    indexes: { "by-date": string; "by-category": number };
  };
  categories: {
    key: number;
    value: Category;
  };
  paymentMethods: {
    key: number;
    value: PaymentMethod;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = "expense-tracker";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<ExpenseDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ExpenseDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("transactions")) {
          const store = db.createObjectStore("transactions", { keyPath: "id", autoIncrement: true });
          store.createIndex("by-date", "date");
          store.createIndex("by-category", "categoryId");
        }
        if (!db.objectStoreNames.contains("categories")) {
          db.createObjectStore("categories", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("paymentMethods")) {
          db.createObjectStore("paymentMethods", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const existing = await db.get("settings", "app");
  if (existing) return { ...DEFAULT_SETTINGS, ...existing };
  await db.put("settings", DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export const DEFAULT_CATEGORIES: NewCategory[] = [
  { name: "飲料", icon: "🥤", color: "#06b6d4", excludeFromChart: false },
  { name: "食物", icon: "🍜", color: "#f59e0b", excludeFromChart: false },
  { name: "居住", icon: "🏠", color: "#8b5cf6", excludeFromChart: false },
  { name: "交通", icon: "🚗", color: "#ec4899", excludeFromChart: false },
  { name: "生活", icon: "🧴", color: "#10b981", excludeFromChart: false },
  { name: "學費", icon: "🎓", color: "#3b82f6", excludeFromChart: true },
  { name: "房租", icon: "🏡", color: "#f97316", excludeFromChart: true },
  { name: "其他", icon: "📦", color: "#6b7280", excludeFromChart: false },
];

export const DEFAULT_PAYMENT_METHODS: NewPaymentMethod[] = [
  { name: "信用卡", isCredit: false, limit: null },
  { name: "簽帳金融卡", isCredit: false, limit: null },
  { name: "現金", isCredit: false, limit: null },
  { name: "行動支付", isCredit: false, limit: null },
];

export async function ensureDefaults() {
  const db = await getDB();
  const cats = await db.getAll("categories");
  if (cats.length === 0) {
    for (const c of DEFAULT_CATEGORIES) await db.add("categories", c as Category);
  }
  const pms = await db.getAll("paymentMethods");
  if (pms.length === 0) {
    for (const p of DEFAULT_PAYMENT_METHODS) await db.add("paymentMethods", p as PaymentMethod);
  }
}
