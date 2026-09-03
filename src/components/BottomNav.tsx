import { useRef, useState } from "react";
import { motion, type PanInfo } from "motion/react";
import { useStore, type Page } from "../store/useStore";

const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: "overview", icon: "🏠", label: "總覽" },
  { page: "list", icon: "📋", label: "記錄" },
  { page: "analysis", icon: "📊", label: "分析" },
  { page: "settings", icon: "⚙️", label: "設定" },
];

export function BottomNav() {
  const page = useStore((s) => s.page);
  const setPage = useStore((s) => s.setPage);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const activeIndex = NAV_ITEMS.findIndex((it) => it.page === page);
  const displayIndex = dragIndex ?? activeIndex;
  const segmentPct = 100 / NAV_ITEMS.length;

  function indexFromClientX(clientX: number) {
    const rect = trackRef.current!.getBoundingClientRect();
    const relX = clientX - rect.left;
    const idx = Math.floor((relX / rect.width) * NAV_ITEMS.length);
    return Math.min(NAV_ITEMS.length - 1, Math.max(0, idx));
  }

  function handlePan(_e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    setDragIndex(indexFromClientX(info.point.x));
  }

  function handlePanEnd() {
    if (dragIndex !== null && NAV_ITEMS[dragIndex].page !== page) {
      setPage(NAV_ITEMS[dragIndex].page);
    }
    setDragIndex(null);
  }

  return (
    <motion.nav
      ref={trackRef}
      onPanStart={handlePan}
      onPan={handlePan}
      onPanEnd={handlePanEnd}
      className="fixed left-3.5 right-3.5 rounded-[22px] p-1.5 backdrop-blur-2xl backdrop-saturate-150 z-20"
      style={{
        bottom: 14,
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-lg), inset 0 1px 0 var(--glass-highlight)",
        touchAction: "none",
      }}
    >
      <div className="relative flex">
        <motion.div
          className="absolute top-0 bottom-0 rounded-2xl backdrop-blur-md"
          style={{
            width: `${segmentPct}%`,
            background: "var(--accent-soft)",
            border: "1px solid rgba(255,255,255,0.5)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
          animate={{
            left: `${displayIndex * segmentPct}%`,
            scale: dragIndex !== null ? 1.06 : 1,
          }}
          transition={
            dragIndex !== null
              ? { left: { duration: 0 }, scale: { duration: 0.15 } }
              : { left: { type: "spring", stiffness: 420, damping: 26 }, scale: { type: "spring", stiffness: 400, damping: 18 } }
          }
        />
        {NAV_ITEMS.map((item, i) => (
          <button
            key={item.page}
            onClick={() => dragIndex === null && setPage(item.page)}
            className="relative flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium z-10"
            style={{ color: displayIndex === i ? "var(--accent)" : "var(--text-muted)" }}
          >
            <span className="text-[19px]">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </motion.nav>
  );
}
