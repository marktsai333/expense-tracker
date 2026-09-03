import { motion } from "motion/react";
import { Sheet } from "./Sheet";
import { useStore } from "../store/useStore";
import type { Category } from "../lib/db";

export function CategoryPickerSheet({
  open,
  selectedId,
  onSelect,
  onClose,
}: {
  open: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const categories = useStore((s) => s.categories);
  const setPage = useStore((s) => s.setPage);

  function goManage() {
    setPage("settings");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="選擇分類" zIndex={40}>
      <div className="flex justify-end -mt-8 mb-2">
        <button onClick={goManage} className="text-[13px] font-bold" style={{ color: "var(--accent)" }}>
          分類管理
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3.5 pb-2">
        {categories.map((c: Category) => {
          const selected = c.id === selectedId;
          return (
            <motion.button
              key={c.id}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                onSelect(c.id);
                onClose();
              }}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center text-[22px]"
                style={{
                  background: c.color,
                  boxShadow: selected ? `0 0 0 2.5px var(--card-bg), 0 0 0 4.5px ${c.color}` : undefined,
                }}
              >
                {c.icon}
              </span>
              <span className="text-[11px] font-bold" style={{ color: "var(--text)" }}>
                {c.name}
              </span>
            </motion.button>
          );
        })}
        <button onClick={goManage} className="flex flex-col items-center gap-1.5">
          <span
            className="w-12 h-12 rounded-full flex items-center justify-center text-[20px]"
            style={{ border: "2px dashed var(--border)", color: "var(--text-muted)" }}
          >
            +
          </span>
          <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
            新增
          </span>
        </button>
      </div>
    </Sheet>
  );
}
