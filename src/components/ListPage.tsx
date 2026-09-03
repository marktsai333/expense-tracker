import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useStore } from "../store/useStore";
import { byId, filterChartable, getMonthTransactions, sum } from "../lib/selectors";
import { formatMoney, todayStr } from "../lib/format";
import { buildExportCSV } from "../lib/csv";
import { SwipeToDeleteRow } from "./SwipeToDeleteRow";

export function ListPage() {
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const { year, month } = useStore((s) => s.month);
  const changeMonth = useStore((s) => s.changeMonth);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const openEditSheet = useStore((s) => s.openEditSheet);
  const categoryFilter = useStore((s) => s.listFilterCategoryId);
  const paymentFilter = useStore((s) => s.listFilterPaymentId);
  const clearListFilters = useStore((s) => s.clearListFilters);

  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [tab, setTab] = useState<"category" | "detail">("detail");

  const categoryById = useMemo(() => byId(categories), [categories]);
  const paymentById = useMemo(() => byId(paymentMethods), [paymentMethods]);

  const monthAll = useMemo(() => getMonthTransactions(transactions, year, month), [transactions, year, month]);
  const monthChartable = useMemo(() => filterChartable(monthAll, categoryById), [monthAll, categoryById]);
  const monthTotal = sum(monthChartable);

  const daysInMonth = new Date(year, month, 0).getDate();
  const rangeLabel = `${year}/${month}/1 – ${year}/${month}/${daysInMonth}`;

  const categoryBreakdown = useMemo(() => {
    const sums = new Map<number, { value: number; count: number }>();
    for (const tx of monthChartable) {
      const cur = sums.get(tx.categoryId) ?? { value: 0, count: 0 };
      cur.value += tx.amount;
      cur.count += 1;
      sums.set(tx.categoryId, cur);
    }
    return Array.from(sums.entries())
      .map(([id, v]) => ({ cat: categoryById[id], ...v }))
      .filter((x) => x.cat)
      .sort((a, b) => b.value - a.value);
  }, [monthChartable, categoryById]);

  const filtered = useMemo(() => {
    let list = monthAll;
    if (categoryFilter != null) list = list.filter((tx) => tx.categoryId === categoryFilter);
    if (paymentFilter != null) list = list.filter((tx) => tx.paymentId === paymentFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((tx) => tx.subitem.toLowerCase().includes(q) || tx.note.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.id - a.id));
  }, [monthAll, categoryFilter, paymentFilter, search]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const tx of filtered) {
      const arr = map.get(tx.date) ?? [];
      arr.push(tx);
      map.set(tx.date, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

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
    toast.success("已匯出 CSV");
  }

  const activeFilterLabel =
    categoryFilter != null ? categoryById[categoryFilter]?.name : paymentFilter != null ? paymentById[paymentFilter]?.name : null;

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[19px] font-extrabold m-0">明細</h1>
        <div className="flex items-center gap-4 text-[17px]" style={{ color: "var(--accent)" }}>
          <button onClick={handleExport} aria-label="匯出 CSV">⇩</button>
          <button onClick={() => setShowSearch((v) => !v)} aria-label="搜尋">🔍</button>
        </div>
      </div>

      {showSearch && (
        <input
          type="text"
          autoFocus
          placeholder="搜尋子項目/備註"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl px-4 py-3 text-base mb-3"
          style={{ background: "var(--input-bg)", color: "var(--text)" }}
        />
      )}

      {activeFilterLabel && (
        <button
          onClick={clearListFilters}
          className="mb-3 self-start text-xs font-semibold rounded-full px-3 py-1.5"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          篩選中：{activeFilterLabel} ✕
        </button>
      )}

      <div className="flex items-center justify-between mb-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
        <button onClick={() => changeMonth(-1)}>‹</button>
        <span className="font-bold" style={{ color: "var(--accent)" }}>{rangeLabel}</span>
        <button onClick={() => changeMonth(1)}>›</button>
      </div>

      <div className="flex gap-2.5 mb-3.5">
        <div className="flex-1 rounded-[14px] px-3.5 py-2.5" style={{ background: "var(--card-bg)" }}>
          <div className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>收入</div>
          <div className="num text-[16px]" style={{ color: "var(--success)" }}>$0</div>
        </div>
        <div className="flex-1 rounded-[14px] px-3.5 py-2.5" style={{ background: "var(--card-bg)", border: "1.5px solid var(--text)" }}>
          <div className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>支出</div>
          <div className="num text-[16px]">{formatMoney(monthTotal)}</div>
        </div>
      </div>

      <div className="flex rounded-full p-1 mb-3.5" style={{ background: "var(--input-bg)" }}>
        {[
          { v: "category" as const, label: "分類" },
          { v: "detail" as const, label: "明細" },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => setTab(opt.v)}
            className="flex-1 py-2 rounded-full text-[13px] font-bold"
            style={
              tab === opt.v
                ? { background: "var(--card-bg)", color: "var(--text)", boxShadow: "var(--shadow)" }
                : { color: "var(--text-muted)" }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {tab === "category" ? (
        categoryBreakdown.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>本月尚無紀錄</p>
        ) : (
          <div className="rounded-[16px] overflow-hidden" style={{ background: "var(--card-bg)" }}>
            {categoryBreakdown.map(({ cat, value, count }, i) => (
              <div key={cat.id} className="px-3.5 py-3" style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] flex-shrink-0"
                    style={{ background: cat.color }}
                  >
                    {cat.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold">{cat.name}</div>
                    <div className="text-[10.5px]" style={{ color: "var(--text-muted)" }}>{count} 筆明細</div>
                  </div>
                  <div className="num text-[14px]">{formatMoney(value)}</div>
                </div>
                <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "var(--input-bg)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(value / monthTotal) * 100}%`, background: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>本月尚無符合的紀錄</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {groups.map(([date, txs]) => (
            <div key={date}>
              <div className="text-[11px] font-bold mb-1.5 px-1" style={{ color: "var(--text-muted)" }}>
                {date.replace(/-/g, "/")}
              </div>
              <div className="flex flex-col gap-2">
                {txs.map((tx) => {
                  const cat = categoryById[tx.categoryId];
                  const pm = tx.paymentId != null ? paymentById[tx.paymentId] : undefined;
                  return (
                    <SwipeToDeleteRow key={tx.id} onDelete={() => deleteTransaction(tx.id)}>
                      <div
                        onClick={() => openEditSheet(tx.id)}
                        className="flex items-start justify-between px-3.5 py-3 cursor-pointer"
                        style={{ background: "var(--card-bg)" }}
                      >
                        <div>
                          <div className="text-[10.5px] font-extrabold" style={{ color: "var(--accent)" }}>
                            {cat?.name ?? "未分類"}
                          </div>
                          <div className="text-[13px] font-bold my-0.5">{tx.subitem || cat?.name || "交易"}</div>
                          <div className="flex gap-1.5">
                            <span className="text-[9.5px] font-bold rounded px-1.5 py-0.5" style={{ background: "var(--input-bg)", color: "var(--text-muted)" }}>
                              手動
                            </span>
                            {pm && (
                              <span className="text-[9.5px] font-bold rounded px-1.5 py-0.5" style={{ background: "var(--input-bg)", color: "var(--text-muted)" }}>
                                {pm.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="num text-[13px]">{formatMoney(tx.amount)}</div>
                      </div>
                    </SwipeToDeleteRow>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
