import { motion } from "motion/react";
import { useStore } from "../store/useStore";

export function FAB() {
  const openAddSheet = useStore((s) => s.openAddSheet);

  return (
    <motion.button
      onClick={openAddSheet}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
      aria-label="新增紀錄"
      className="fixed z-20 flex items-center justify-center rounded-full text-white text-[26px] font-light"
      style={{
        bottom: "calc(14px + 76px + env(safe-area-inset-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        width: 56,
        height: 56,
        background: "linear-gradient(135deg, var(--accent), var(--accent2))",
        boxShadow: "0 10px 24px rgba(23,184,146,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
      }}
    >
      +
    </motion.button>
  );
}
