import { motion } from "motion/react";
import { useStore, type Page } from "../store/useStore";

const TITLES: Record<Page, string> = { overview: "總覽", list: "記錄", analysis: "分析", settings: "設定" };

export function TopBar() {
  const page = useStore((s) => s.page);
  const { year, month } = useStore((s) => s.month);
  const changeMonth = useStore((s) => s.changeMonth);
  const showMonthSwitch = page !== "settings";

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between backdrop-blur-2xl backdrop-saturate-150 px-[18px] pb-[14px]"
      style={{
        background: "var(--glass-bg)",
        borderBottom: "1px solid var(--glass-border)",
        paddingTop: "calc(14px + env(safe-area-inset-top))",
        boxShadow: "inset 0 1px 0 var(--glass-highlight)",
      }}
    >
      <h1 className="text-xl font-bold m-0 tracking-tight" style={{ color: "var(--accent)" }}>
        {TITLES[page]}
      </h1>
      {showMonthSwitch && (
        <div
          className="flex items-center gap-2 text-[13px] font-medium rounded-full px-2.5 py-1.5"
          style={{ background: "var(--glass-highlight)", border: "1px solid var(--glass-border)", color: "var(--text)" }}
        >
          <motion.button
            whileTap={{ scale: 0.85 }}
            transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => changeMonth(-1)}
            aria-label="上個月"
            className="text-lg leading-none px-0.5"
            style={{ color: "var(--accent)" }}
          >
            ‹
          </motion.button>
          <span>
            {year}年{String(month).padStart(2, "0")}月
          </span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
            onClick={() => changeMonth(1)}
            aria-label="下個月"
            className="text-lg leading-none px-0.5"
            style={{ color: "var(--accent)" }}
          >
            ›
          </motion.button>
        </div>
      )}
    </header>
  );
}
