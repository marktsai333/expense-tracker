import { useMemo, useState } from "react";
import { useStore } from "../store/useStore";
import { byId, filterChartable, getMonthTransactions, sum } from "../lib/selectors";
import { formatMoney } from "../lib/format";
import { TxRow } from "./TxRow";
import { SwipeToDeleteRow } from "./SwipeToDeleteRow";

export function ListPage() {
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const { year, month } = useStore((s) => s.month);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const openEditSheet = useStore((s) => s.openEditSheet);
  const categoryFilter = useStore((s) => s.listFilterCategoryId);
  const paymentFilter = useStore((s) => s.listFilterPaymentId);
  const setListFilters = useStore((s) => s.goToListFiltered);
  const clearListFilters = useStore((s) => s.clearListFilters);

  const [search, setSearch] = useState("");

  const categoryById = useMemo(() => byId(categories), [categories]);
  const paymentById = useMemo(() => byId(paymentMethods), [paymentMethods]);

  const monthAll = useMemo(() => getMonthTransactions(transactions, year, month), [transactions, year, month]);
  const monthChartable = useMemo(() => filterChartable(monthAll, categoryById), [monthAll, categoryById]);
  const monthTotal = sum(monthChartable);

  const categoryBreakdown = useMemo(() => {
    const sums = new Map<number, number>();
    for (const tx of monthChartable) sums.set(tx.categoryId, (sums.get(tx.categoryId) ?? 0) + tx.amount);
    return Array.from(sums.entries())
      .map(([id, value]) => ({ cat: categoryById[id], value }))
      .filter((x) => x.cat)
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [monthChartable, categoryById]);

  const filtered = useMemo(() => {
    let list = monthAll;
    if (categoryFilter != null) list = list.filter((tx) => tx.categoryId === categoryFilter);
    if (paymentFilter != null) list = list.filter((tx) => tx.paymentId === paymentFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (tx) => tx.subitem.toLowerCase().includes(q) || tx.note.toLowerCase().includes(q),
      );
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

  const cardStyle = { background: "var(--card-bg)", boxShadow: "var(--shadow)" };
  const activeFilterLabel =
    categoryFilter != null
      ? categoryById[categoryFilter]?.name
      : paymentFilter != null
        ? paymentById[paymentFilter]?.name
        : null;

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="搜尋子項目/備註"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-2xl px-4 py-3.5 text-base"
        style={{ background: "var(--input-bg)", color: "var(--text)" }}
      />

      {activeFilterLabel ? (
        <button
          onClick={clearListFilters}
          className="self-start text-xs font-semibold rounded-full px-3 py-1.5"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          篩選中：{activeFilterLabel} ✕
        </button>
      ) : (
        <div className="flex gap-2">
          <select
            value={categoryFilter ?? ""}
            onChange={(e) => setListFilters({ categoryId: e.target.value ? Number(e.target.value) : null, paymentId: paymentFilter })}
            className="flex-1 min-w-0 rounded-xl px-2.5 py-2.5 text-[13px]"
            style={{ background: "var(--input-bg)", color: "var(--text)" }}
          >
            <option value="">全部類別</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <select
            value={paymentFilter ?? ""}
            onChange={(e) => setListFilters({ categoryId: categoryFilter, paymentId: e.target.value ? Number(e.target.value) : null })}
            className="flex-1 min-w-0 rounded-xl px-2.5 py-2.5 text-[13px]"
            style={{ background: "var(--input-bg)", color: "var(--text)" }}
          >
            <option value="">全部付款方式</option>
            {paymentMethods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-[20px] p-4" style={cardStyle}>
        <div className="text-[13px] mb-1" style={{ color: "var(--text-muted)" }}>
          {year}年{month}月支出
        </div>
        <div className="text-2xl font-extrabold mb-3">{formatMoney(monthTotal)}</div>
        {categoryBreakdown.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {categoryBreakdown.map(({ cat, value }) => (
              <span
                key={cat.id}
                className="text-xs font-medium rounded-full px-2.5 py-1"
                style={{ background: cat.color + "22", color: cat.color }}
              >
                {cat.icon} {cat.name} {formatMoney(value)}
              </span>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
          本月尚無符合的紀錄
        </p>
      ) : (
        groups.map(([date, txs]) => (
          <div key={date}>
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
              {date}
            </div>
            <div className="flex flex-col gap-2">
              {txs.map((tx) => (
                <SwipeToDeleteRow key={tx.id} onDelete={() => deleteTransaction(tx.id)}>
                  <TxRow
                    tx={tx}
                    category={categoryById[tx.categoryId]}
                    payment={tx.paymentId != null ? paymentById[tx.paymentId] : undefined}
                    onClick={() => openEditSheet(tx.id)}
                  />
                </SwipeToDeleteRow>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
