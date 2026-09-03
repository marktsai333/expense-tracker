import { motion, AnimatePresence } from "motion/react";

export function Splash({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3.5"
          style={{ background: "linear-gradient(160deg, var(--accent), var(--accent2))" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <motion.img
            src="/expense-tracker/icons/icon-512.png"
            alt=""
            className="w-[88px] h-[88px] rounded-[24px]"
            style={{ boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          />
          <div className="text-white text-[22px] font-bold tracking-wide">記帳</div>
          <motion.div
            className="w-[22px] h-[22px] rounded-full mt-1.5"
            style={{ border: "3px solid rgba(255,255,255,0.35)", borderTopColor: "#fff" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, ease: "linear", repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
