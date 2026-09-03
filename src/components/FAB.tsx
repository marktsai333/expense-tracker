import { motion } from "motion/react";
import { Fab } from "konsta/react";
import { useStore } from "../store/useStore";

export function FAB() {
  const openAddSheet = useStore((s) => s.openAddSheet);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      whileTap={{ scale: 0.92 }}
      className="fixed z-20"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 16px)", right: 18 }}
    >
      <Fab
        component="button"
        onClick={openAddSheet}
        aria-label="新增紀錄"
        icon={<span className="text-[26px] font-light leading-none">+</span>}
      />
    </motion.div>
  );
}
