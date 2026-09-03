import { motion } from "motion/react";
import { useStore, type Page } from "../store/useStore";

const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: "add", icon: "✏️", label: "記帳" },
  { page: "list", icon: "📋", label: "列表" },
  { page: "charts", icon: "📊", label: "圖表" },
  { page: "settings", icon: "⚙️", label: "設定" },
];

export function BottomNav() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);

  return (
    <nav
      className="fixed left-3.5 right-3.5 flex gap-1 rounded-[22px] p-1.5 backdrop-blur-2xl backdrop-saturate-150 z-20"
      style={{
        bottom: 14,
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-lg), inset 0 1px 0 var(--glass-highlight)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = page === item.page;
        return (
          <motion.button
            key={item.page}
            onClick={() => setPage(item.page)}
            whileTap={{ scale: 0.93 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl text-[11px] font-medium"
            style={{
              color: active ? "var(--accent)" : "var(--text-muted)",
              background: active ? "var(--accent-soft)" : "transparent",
            }}
          >
            <span className="text-[19px]">{item.icon}</span>
            <span>{item.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}
