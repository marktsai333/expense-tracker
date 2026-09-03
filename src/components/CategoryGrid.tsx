import { motion } from "motion/react";
import type { Category } from "../lib/db";

export function CategoryGrid({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {categories.map((c) => {
        const selected = c.id === selectedId;
        return (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            whileTap={{ scale: 0.94 }}
            animate={{ y: selected ? -2 : 0 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col items-center gap-1.5 pt-2.5 pb-2 rounded-2xl text-xs"
            style={{ color: selected ? "var(--text)" : "var(--text-muted)", fontWeight: selected ? 600 : 400 }}
          >
            <motion.span
              className="w-11 h-11 rounded-full flex items-center justify-center text-xl"
              style={{ background: "var(--input-bg)" }}
              animate={{
                scale: selected ? 1.06 : 1,
                boxShadow: selected ? "0 6px 16px rgba(0,0,0,0.12)" : "0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            >
              {c.icon}
            </motion.span>
            <span>{c.name}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
