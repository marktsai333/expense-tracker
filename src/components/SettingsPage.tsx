import { useRef, useState } from "react";
import { Toggle } from "konsta/react";
import { toast } from "sonner";
import { useStore } from "../store/useStore";
import type { Category } from "../lib/db";
import { buildExportCSV, parseImportRows } from "../lib/csv";
import { todayStr } from "../lib/format";
import { getOrCreateLedgerCode, setLedgerCode } from "../lib/ledgerCode";
import { CategorySheet } from "./CategorySheet";
import { APP_VERSION, CHANGELOG } from "../lib/version";
import { byId } from "../lib/selectors";

type CategorySheetState = { open: boolean; category: Category | null };

const THEME_OPTIONS: { value: "system" | "light" | "dark"; label: string }[] = [
  { value: "system", label: "跟隨系統" },
  { value: "light", label: "淺色" },
  { value: "dark", label: "深色" },
];

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-extrabold px-1 mb-1.5 mt-4" style={{ color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}

function Row({
  onClick,
  children,
  first,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2.5 px-3.5 py-3 text-[14px] font-semibold"
      style={{ borderTop: first ? undefined : "1px solid var(--border)", cursor: onClick ? "pointer" : undefined }}
    >
      {children}
    </div>
  );
}

export function SettingsPage() {
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const addCategory = useStore((s) => s.addCategory);
  const addPaymentMethod = useStore((s) => s.addPaymentMethod);
  const importTransactions = useStore((s) => s.importTransactions);
  const clearAllData = useStore((s) => s.clearAllData);
  const updateSettings = useStore((s) => s.updateSettings);
  const setThemeOverride = useStore((s) => s.setThemeOverride);
  const restoreBackup = useStore((s) => s.restoreBackup);
  const setPage = useStore((s) => s.setPage);

  const [catSheet, setCatSheet] = useState<CategorySheetState>({ open: false, category: null });
  const [newTipPct, setNewTipPct] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [ledgerCode, setLedgerCodeState] = useState(() => getOrCreateLedgerCode());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

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
        const id = await addPaymentMethod({ name, icon: "💰", isCredit: false, limit: null, startingBalance: 0, balanceResetAt: null });
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

  function addTipPreset() {
    const pct = parseFloat(newTipPct);
    if (isNaN(pct) || pct <= 0) return;
    if (settings.tipPresets.includes(pct)) { setNewTipPct(""); return; }
    updateSettings({ tipPresets: [...settings.tipPresets, pct].sort((a, b) => a - b) });
    setNewTipPct("");
  }
  function removeTipPreset(pct: number) {
    updateSettings({ tipPresets: settings.tipPresets.filter((p) => p !== pct) });
  }

  function handleCopyCode() {
    navigator.clipboard?.writeText(ledgerCode);
    toast.success("已複製配對代碼");
  }

  function handleJoinCode() {
    if (!joinCode.trim()) return;
    setLedgerCode(joinCode);
    setLedgerCodeState(joinCode.trim().toUpperCase());
    setJoinCode("");
    toast.success("已切換帳本代碼(實際同步需完成雲端串接)");
  }

  function handleBackupExport() {
    const payload = { version: 1, categories, paymentMethods, transactions, settings };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `記帳備份_${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleBackupImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.categories) || !Array.isArray(data.transactions)) {
        throw new Error("格式不對");
      }
      if (!confirm("還原備份會覆蓋目前手機上所有的類別、付款方式、設定與交易紀錄，確定嗎？")) return;
      await restoreBackup(data);
      toast.success("已還原備份");
    } catch {
      toast.error("這個檔案看起來不是有效的備份檔");
    }
    e.target.value = "";
  }

  const groupStyle = { background: "var(--card-bg)", borderRadius: 16, overflow: "hidden" };

  return (
    <div className="pb-6">
      <div className="text-center text-white" style={{ background: "var(--accent)", padding: "calc(20px + env(safe-area-inset-top)) 16px 22px" }}>
        <div
          className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-[26px]"
          style={{ background: "var(--card-bg)" }}
        >
          🧾
        </div>
        <div className="font-extrabold text-[15px]">我們的記帳本</div>
      </div>

      <div className="px-4 -mt-2">
        <div
          className="rounded-[16px] p-3.5 text-white mb-1"
          style={{ background: `linear-gradient(135deg, var(--accent), var(--accent2))` }}
        >
          <div className="text-[11px] font-bold opacity-90">配對代碼・分享給對方就能同步</div>
          <div className="flex items-center justify-between mt-1">
            <div className="text-[22px] font-extrabold tracking-widest">{ledgerCode}</div>
            <button onClick={handleCopyCode} className="text-[12px] font-bold rounded-full px-3 py-1.5" style={{ background: "rgba(255,255,255,0.25)" }}>
              複製
            </button>
          </div>
        </div>

        <GroupTitle>帳本設定</GroupTitle>
        <div style={groupStyle}>
          <div className="flex items-center gap-2 px-3.5 py-3">
            <input
              type="text"
              placeholder="輸入對方的配對代碼"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="flex-1 rounded-xl px-3 py-2 text-[13px]"
              style={{ background: "var(--input-bg)", color: "var(--text)" }}
            />
            <button onClick={handleJoinCode} className="text-[13px] font-bold px-3" style={{ color: "var(--accent)" }}>
              加入
            </button>
          </div>
          <div className="px-3.5 pb-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="text-[11px] font-bold pt-3 mb-1.5" style={{ color: "var(--text-muted)" }}>外觀</div>
            <div className="flex gap-1.5">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setThemeOverride(opt.value)}
                  className="flex-1 py-2 rounded-xl text-[12.5px] font-bold"
                  style={
                    settings.themeOverride === opt.value
                      ? { background: "var(--accent)", color: "var(--accent-contrast)" }
                      : { background: "var(--input-bg)", color: "var(--text)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <GroupTitle>記帳設定</GroupTitle>
        <div style={groupStyle}>
          <div className="px-3.5 py-3">
            <div className="text-[14px] font-semibold mb-2">類別管理</div>
            {categories.map((c) => (
              <div key={c.id} onClick={() => setCatSheet({ open: true, category: c })} className="flex items-center gap-2 py-1.5 cursor-pointer text-[13px]">
                <span>{c.icon}</span>
                <span>{c.name}</span>
                {c.excludeFromChart && (
                  <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    不列入圖表
                  </span>
                )}
                <span className="w-3.5 h-3.5 rounded-full ml-auto" style={{ background: c.color }} />
              </div>
            ))}
            <button onClick={() => setCatSheet({ open: true, category: null })} className="text-[12.5px] font-bold mt-1.5" style={{ color: "var(--accent)" }}>
              + 新增類別
            </button>
          </div>
          <Row onClick={() => setPage("accounts")}>
            <span className="flex-1">付款方式管理</span>
            <span style={{ color: "var(--text-muted)" }}>{paymentMethods.length} 個 ›</span>
          </Row>
          <div className="px-3.5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="text-[14px] font-semibold mb-2">小費快速預設值</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {settings.tipPresets.map((pct) => (
                <button
                  key={pct}
                  onClick={() => removeTipPreset(pct)}
                  className="text-[12px] font-semibold rounded-full px-2.5 py-1 flex items-center gap-1"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  {pct}% <span style={{ color: "var(--danger)" }}>✕</span>
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                type="number"
                inputMode="decimal"
                placeholder="新增百分比"
                value={newTipPct}
                onChange={(e) => setNewTipPct(e.target.value)}
                className="flex-1 rounded-lg px-2.5 py-1.5 text-[12.5px]"
                style={{ background: "var(--input-bg)", color: "var(--text)" }}
              />
              <button onClick={addTipPreset} className="px-3 rounded-lg text-[12.5px] font-semibold" style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}>
                新增
              </button>
            </div>
          </div>
          <div className="px-3.5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between py-1">
              <div className="text-[13px] font-semibold">快速選取建議</div>
              <Toggle checked={settings.showSuggestChips} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings({ showSuggestChips: e.target.checked })} />
            </div>
            <div className="flex items-center justify-between py-1 mt-1" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="text-[13px] font-semibold pt-2">輸入範例文字</div>
              <div className="pt-2">
                <Toggle checked={settings.showPlaceholderExamples} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings({ showPlaceholderExamples: e.target.checked })} />
              </div>
            </div>
          </div>
        </div>

        <GroupTitle>資料</GroupTitle>
        <div style={groupStyle}>
          <Row onClick={handleBackupExport} first>匯出完整備份</Row>
          <Row onClick={() => backupInputRef.current?.click()}>還原完整備份</Row>
          <Row onClick={handleExport}>匯出 CSV</Row>
          <Row onClick={() => fileInputRef.current?.click()}>匯入 CSV</Row>
          <div onClick={handleClearAll} className="px-3.5 py-3 text-[14px] font-semibold cursor-pointer" style={{ borderTop: "1px solid var(--border)", color: "var(--danger)" }}>
            清除所有資料
          </div>
        </div>
        <input ref={backupInputRef} type="file" accept=".json" hidden onChange={handleBackupImport} />
        <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleImport} />

        <div className="rounded-[16px] p-4 text-center mt-4" style={{ background: "var(--card-bg)" }}>
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
      </div>

      <CategorySheet open={catSheet.open} category={catSheet.category} onClose={() => setCatSheet({ open: false, category: null })} />
    </div>
  );
}
