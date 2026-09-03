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
            animate={{ y: selected ? -3 : 0 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col items-center gap-1.5 pt-2.5 pb-2 rounded-2xl text-xs"
            style={{ color: selected ? "var(--text)" : "var(--text-muted)", fontWeight: selected ? 700 : 400 }}
          >
            <motion.span
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{
                background: `linear-gradient(150deg, ${c.color}30, ${c.color}12)`,
                border: `1px solid ${c.color}${selected ? "70" : "25"}`,
              }}
              animate={{
                scale: selected ? 1.08 : 1,
                boxShadow: selected
                  ? `0 6px 16px ${c.color}50, inset 0 -2px 4px rgba(0,0,0,0.08), inset 0 1.5px 0 rgba(255,255,255,0.65)`
                  : `inset 0 -2px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.5)`,
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
