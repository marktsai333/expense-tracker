import { useMemo } from "react";
import { motion } from "motion/react";
import type { Transaction } from "../lib/db";
import { formatMoney } from "../lib/format";

export function SuggestChips({
  transactions,
  categoryId,
  query,
  onPick,
}: {
  transactions: Transaction[];
  categoryId: number | null;
  query: string;
  onPick: (tx: Transaction) => void;
}) {
  const items = useMemo(() => {
    if (categoryId === null) return [];
    const map = new Map<string, { tx: Transaction; count: number }>();
    for (const tx of transactions) {
      if (tx.categoryId !== categoryId || !tx.subitem) continue;
      const key = tx.subitem.trim().toLowerCase();
      const cur = map.get(key);
      if (!cur) map.set(key, { tx, count: 1 });
      else {
        cur.count += 1;
        if (tx.id > cur.tx.id) cur.tx = tx;
      }
    }
    let list = Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((it) => it.key.includes(q));
    list.sort((a, b) => b.count - a.count || b.tx.id - a.tx.id);
    return list.slice(0, 8);
  }, [transactions, categoryId, query]);

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((it) => (
        <motion.button
          key={it.key}
          type="button"
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.1 }}
          onClick={() => onPick(it.tx)}
          className="text-xs font-semibold rounded-full px-3 py-1.5 whitespace-nowrap"
          style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)" }}
        >
          {it.tx.subitem} · {formatMoney(it.tx.amount)}
        </motion.button>
      ))}
    </div>
  );
}
