import { motion } from "motion/react";
import type { ItemBreakdown } from "../lib/db";

export function ItemRows({
  items,
  onChange,
}: {
  items: ItemBreakdown[];
  onChange: (items: ItemBreakdown[]) => void;
}) {
  function update(i: number, patch: Partial<ItemBreakdown>) {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...items, { name: "", amount: null }]);
  }

  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className="flex gap-1.5 mb-2">
          <input
            type="text"
            placeholder="品項名稱"
            value={it.name}
            onChange={(e) => update(i, { name: e.target.value })}
            className="flex-[1.4] min-w-0 rounded-xl px-3.5 py-2.5 text-base"
            style={{ background: "var(--input-bg)", color: "var(--text)" }}
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="金額(可留空)"
            value={it.amount ?? ""}
            onChange={(e) => update(i, { amount: e.target.value === "" ? null : parseFloat(e.target.value) })}
            className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-base"
            style={{ background: "var(--input-bg)", color: "var(--text)" }}
          />
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => remove(i)}
            className="w-11 rounded-xl flex-shrink-0"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            ✕
          </motion.button>
        </div>
      ))}
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={add}
        className="w-full rounded-full py-3 text-[15px] font-medium mt-1"
        style={{ border: "1px solid var(--border)", color: "var(--text)" }}
      >
        + 新增細項
      </motion.button>
    </div>
  );
}
