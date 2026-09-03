import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Sheet } from "./Sheet";
import { useStore } from "../store/useStore";
import type { Category } from "../lib/db";

export function CategorySheet({
  open,
  category,
  onClose,
}: {
  open: boolean;
  category: Category | null;
  onClose: () => void;
}) {
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const [icon, setIcon] = useState("🏷️");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2e7d5a");
  const [excludeFromChart, setExcludeFromChart] = useState(false);

  useEffect(() => {
    if (open) {
      setIcon(category?.icon ?? "🏷️");
      setName(category?.name ?? "");
      setColor(category?.color ?? "#2e7d5a");
      setExcludeFromChart(category?.excludeFromChart ?? false);
    }
  }, [open, category]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("請輸入名稱");
      return;
    }
    if (category) {
      await updateCategory({ ...category, name: name.trim(), icon: icon.trim() || "🏷️", color, excludeFromChart });
    } else {
      await addCategory({ name: name.trim(), icon: icon.trim() || "🏷️", color, excludeFromChart });
    }
    toast.success("已儲存");
    onClose();
  }

  async function handleDelete() {
    if (!category) return;
    if (!confirm("刪除後，該類別過去的紀錄會顯示為「未分類」，確定刪除嗎？")) return;
    await deleteCategory(category.id);
    toast.success("已刪除");
    onClose();
  }

  const inputStyle = { background: "var(--input-bg)", color: "var(--text)" };
  const labelStyle = { color: "var(--text-muted)" };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title={category ? "編輯類別" : "新增類別"}>
      <div className="mb-3.5">
        <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
          Icon(emoji)
        </label>
        <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="w-full rounded-2xl px-3.5 py-3 text-base" style={inputStyle} />
      </div>
      <div className="mb-3.5">
        <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
          名稱
        </label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl px-3.5 py-3 text-base" style={inputStyle} />
      </div>
      <div className="mb-3.5">
        <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
          顏色
        </label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full rounded-2xl h-12" style={inputStyle} />
      </div>
      <div className="mb-3.5 flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
        <input
          type="checkbox"
          id="excludeFromChart"
          checked={excludeFromChart}
          onChange={(e) => setExcludeFromChart(e.target.checked)}
          className="w-[18px] h-[18px]"
        />
        <label htmlFor="excludeFromChart">從圖表百分比中排除(適合學費、房租等大筆固定支出)</label>
      </div>
      <div className="flex gap-2 mt-2.5">
        {category && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleDelete}
            className="flex-1 py-3 rounded-full text-[15px] font-semibold"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            刪除
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          className="flex-1 py-3 rounded-full text-[15px] font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          取消
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          className="flex-1 py-3 rounded-full text-[15px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
        >
          儲存
        </motion.button>
      </div>
    </Sheet>
  );
}
