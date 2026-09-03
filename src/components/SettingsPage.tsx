import { useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useStore } from "../store/useStore";
import type { Category, PaymentMethod } from "../lib/db";
import { buildExportCSV, parseImportRows } from "../lib/csv";
import { formatMoney, todayStr } from "../lib/format";
import { CategorySheet } from "./CategorySheet";
import { PaymentSheet } from "./PaymentSheet";
import { APP_VERSION, CHANGELOG } from "../lib/version";
import { byId } from "../lib/selectors";

type CategorySheetState = { open: boolean; category: Category | null };
type PaymentSheetState = { open: boolean; payment: PaymentMethod | null };

export function SettingsPage() {
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const addCategory = useStore((s) => s.addCategory);
  const addPaymentMethod = useStore((s) => s.addPaymentMethod);
  const importTransactions = useStore((s) => s.importTransactions);
  const clearAllData = useStore((s) => s.clearAllData);

  const [catSheet, setCatSheet] = useState<CategorySheetState>({ open: false, category: null });
  const [pmSheet, setPmSheet] = useState<PaymentSheetState>({ open: false, payment: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoryById = byId(categories);
  const paymentById = byId(paymentMethods);

  function handleExport() {
    const csv = buildExportCSV(transactions, categoryById, paymentById);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `記帳_${todayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();

    const nameToId = { cat: new Map<string, number>(), pm: new Map<string, number>() };
    for (const c of categories) nameToId.cat.set(c.name, c.id);
    for (const p of paymentMethods) nameToId.pm.set(p.name, p.id);

    const rows = await parseImportRows(text, {
      findOrCreateCategoryId: async (name) => {
        if (!name) return categories[categories.length - 1]?.id ?? (await addCategory({ name: "其他", icon: "📦", color: "#8d9199", excludeFromChart: false }));
        const existing = nameToId.cat.get(name);
        if (existing != null) return existing;
        const id = await addCategory({ name, icon: "🏷️", color: "#8d9199", excludeFromChart: false });
        nameToId.cat.set(name, id);
        return id;
      },
      findOrCreatePaymentId: async (name) => {
        if (!name) return null;
        const existing = nameToId.pm.get(name);
        if (existing != null) return existing;
        const id = await addPaymentMethod({ name, isCredit: false, limit: null });
        nameToId.pm.set(name, id);
        return id;
      },
    });

    await importTransactions(rows);
    toast.success(`已匯入 ${rows.length} 筆`);
    e.target.value = "";
  }

  async function handleClearAll() {
    if (!confirm("這會刪除所有紀錄、類別與付款方式設定，且無法復原，確定要繼續嗎？")) return;
    await clearAllData();
    toast.success("已清除所有資料");
  }

  const cardStyle = { background: "var(--card-bg)", boxShadow: "var(--shadow)" };
  const rowBorder = { borderBottom: "1px solid var(--border)" };

  return (
    <div>
      <div className="rounded-[20px] p-4 mb-4" style={cardStyle}>
        <h2 className="text-[15px] font-bold mb-3">類別管理</h2>
        {categories.map((c, i) => (
          <div
            key={c.id}
            onClick={() => setCatSheet({ open: true, category: c })}
            className="flex items-center gap-2.5 py-2.5 text-[15px] cursor-pointer"
            style={i < categories.length - 1 ? rowBorder : undefined}
          >
            <span>{c.icon}</span>
            <span>{c.name}</span>
            {c.excludeFromChart && (
              <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                不列入圖表
              </span>
            )}
            <span className="w-[18px] h-[18px] rounded-full ml-auto" style={{ background: c.color }} />
            <span style={{ color: "var(--text-muted)" }}>›</span>
          </div>
        ))}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setCatSheet({ open: true, category: null })}
          className="w-full py-3 rounded-full text-[15px] font-medium mt-3"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          + 新增類別
        </motion.button>
      </div>

      <div className="rounded-[20px] p-4 mb-4" style={cardStyle}>
        <h2 className="text-[15px] font-bold mb-3">付款方式管理</h2>
        {paymentMethods.map((p, i) => (
          <div
            key={p.id}
            onClick={() => setPmSheet({ open: true, payment: p })}
            className="flex items-center gap-2.5 py-2.5 text-[15px] cursor-pointer"
            style={i < paymentMethods.length - 1 ? rowBorder : undefined}
          >
            <span>{p.name}</span>
            {p.isCredit && (
              <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                信用卡{p.limit ? ` · ${formatMoney(p.limit)}` : ""}
              </span>
            )}
            <span className="ml-auto" style={{ color: "var(--text-muted)" }}>›</span>
          </div>
        ))}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setPmSheet({ open: true, payment: null })}
          className="w-full py-3 rounded-full text-[15px] font-medium mt-3"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          + 新增付款方式
        </motion.button>
      </div>

      <div className="rounded-[20px] p-4 mb-4" style={cardStyle}>
        <h2 className="text-[15px] font-bold mb-3">資料備份</h2>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleExport} className="w-full py-3 rounded-full text-[15px] font-medium mb-2" style={{ border: "1px solid var(--border)", color: "var(--text)" }}>
          匯出 CSV
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 rounded-full text-[15px] font-medium mb-2"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          匯入 CSV
        </motion.button>
        <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleImport} />
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleClearAll}
          className="w-full py-3 rounded-full text-[15px] font-semibold"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          清除所有資料
        </motion.button>
      </div>

      <div className="rounded-[20px] p-4 text-center" style={cardStyle}>
        <div className="flex justify-between text-sm mb-1" style={{ color: "var(--text-muted)" }}>
          <span>版本</span>
          <span>v{APP_VERSION}</span>
        </div>
        <div className="text-left text-xs mt-2.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {CHANGELOG.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>

      <CategorySheet open={catSheet.open} category={catSheet.category} onClose={() => setCatSheet({ open: false, category: null })} />
      <PaymentSheet open={pmSheet.open} payment={pmSheet.payment} onClose={() => setPmSheet({ open: false, payment: null })} />
    </div>
  );
}
