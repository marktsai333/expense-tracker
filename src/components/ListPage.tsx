import { useMemo, useState } from "react";
import { useStore } from "../store/useStore";
import { byId, getMonthTransactions, sum } from "../lib/selectors";
import { formatMoney } from "../lib/format";
import { TxRow } from "./TxRow";
import { SwipeToDeleteRow } from "./SwipeToDeleteRow";

export function ListPage() {
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const { year, month } = useStore((s) => s.month);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const startEdit = useStore((s) => s.startEdit);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [search, setSearch] = useState("");

  const categoryById = useMemo(() => byId(categories), [categories]);
  const paymentById = useMemo(() => byId(paymentMethods), [paymentMethods]);

  const filtered = useMemo(() => {
    let list = getMonthTransactions(transactions, year, month);
    if (categoryFilter) list = list.filter((tx) => String(tx.categoryId) === categoryFilter);
    if (paymentFilter) list = list.filter((tx) => String(tx.paymentId) === paymentFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (tx) => tx.subitem.toLowerCase().includes(q) || tx.note.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.id - a.id));
  }, [transactions, year, month, categoryFilter, paymentFilter, search]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const tx of filtered) {
      const arr = map.get(tx.date) ?? [];
      arr.push(tx);
      map.set(tx.date, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const inputStyle = { background: "var(--input-bg)", color: "var(--text)" };

  return (
    <div>
      <div className="flex gap-2 mb-3.5">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="flex-1 rounded-xl px-2.5 py-2.5 text-[13px] min-w-0"
          style={inputStyle}
        >
          <option value="">全部類別</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="flex-1 rounded-xl px-2.5 py-2.5 text-[13px] min-w-0"
          style={inputStyle}
        >
          <option value="">全部付款方式</option>
          {paymentMethods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="搜尋子項目/備註"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-[1.4] min-w-0 rounded-xl px-2.5 py-2.5 text-[13px]"
          style={inputStyle}
        />
      </div>

      <div className="text-[13px] font-medium mb-3" style={{ color: "var(--text-muted)" }}>
        共 {filtered.length} 筆，合計 {formatMoney(sum(filtered))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          本月尚無符合的紀錄
        </p>
      ) : (
        groups.map(([date, txs]) => (
          <div key={date}>
            <div className="text-xs font-semibold mt-4 mb-2" style={{ color: "var(--text-muted)" }}>
              {date}
            </div>
            <div className="flex flex-col gap-2">
              {txs.map((tx) => (
                <SwipeToDeleteRow key={tx.id} onDelete={() => deleteTransaction(tx.id)}>
                  <TxRow
                    tx={tx}
                    category={categoryById[tx.categoryId]}
                    payment={tx.paymentId != null ? paymentById[tx.paymentId] : undefined}
                    onClick={() => startEdit(tx.id)}
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
