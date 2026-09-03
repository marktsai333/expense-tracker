import { useMemo, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import NumberFlow from "@number-flow/react";
import { useStore } from "../store/useStore";
import { byId, filterChartable, getMonthTransactions, sum } from "../lib/selectors";
import { formatMoney } from "../lib/format";
import { TxRow } from "./TxRow";
import { ProgressRing } from "./ProgressRing";

export function OverviewPage() {
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const { year, month } = useStore((s) => s.month);
  const changeMonth = useStore((s) => s.changeMonth);
  const setPage = useStore((s) => s.setPage);
  const goToListFiltered = useStore((s) => s.goToListFiltered);
  const openEditSheet = useStore((s) => s.openEditSheet);
  const openAddSheet = useStore((s) => s.openAddSheet);
  const [direction, setDirection] = useState(0);

  function handlePanEnd(_e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    if (info.offset.x < -60 || info.velocity.x < -500) {
      setDirection(1);
      changeMonth(1);
    } else if (info.offset.x > 60 || info.velocity.x > 500) {
      setDirection(-1);
      changeMonth(-1);
    }
  }

  const categoryById = useMemo(() => byId(categories), [categories]);
  const paymentById = useMemo(() => byId(paymentMethods), [paymentMethods]);

  const monthTxAll = useMemo(() => getMonthTransactions(transactions, year, month), [transactions, year, month]);
  const monthTx = useMemo(() => filterChartable(monthTxAll, categoryById), [monthTxAll, categoryById]);
  const total = sum(monthTx);

  const lastMonthTotal = useMemo(() => {
    let y = year, m = month - 1;
    if (m < 1) { m = 12; y -= 1; }
    return sum(filterChartable(getMonthTransactions(transactions, y, m), categoryById));
  }, [transactions, year, month, categoryById]);
  const diffPct = lastMonthTotal === 0 ? null : ((total - lastMonthTotal) / lastMonthTotal) * 100;

  const creditCards = paymentMethods.filter((p) => p.isCredit && p.limit);
  const topSpenders = useMemo(() => [...monthTx].sort((a, b) => b.amount - a.amount).slice(0, 3), [monthTx]);
  const recent = useMemo(() => [...transactions].sort((a, b) => b.id - a.id).slice(0, 5), [transactions]);

  const cardStyle = { background: "var(--card-bg)", boxShadow: "var(--shadow)" };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
        <div className="text-5xl">🧾</div>
        <div className="text-[15px] font-medium" style={{ color: "var(--text)" }}>
          還沒有任何紀錄
        </div>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>
          點右下角的「+」開始記第一筆
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={openAddSheet}
          className="px-6 py-3 rounded-full text-[15px] font-bold text-white mt-2"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
        >
          去記一筆
        </motion.button>
      </div>
    );
  }

  return (
    <motion.div onPanEnd={handlePanEnd} style={{ touchAction: "pan-y" }}>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={`${year}-${month}`}
          custom={direction}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -24 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col gap-4"
        >
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setPage("analysis")}
        className="text-left rounded-[20px] p-5 text-white"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", boxShadow: "var(--shadow-lg)" }}
      >
        <span className="text-[13px] opacity-85 block">本月支出</span>
        <span className="text-[32px] font-extrabold flex items-baseline">
          $<NumberFlow value={Math.round(total * 100) / 100} />
        </span>
        <div className="text-[13px] opacity-90 mt-2">
          {lastMonthTotal === 0
            ? total === 0
              ? "與上月比較 —"
              : "上月無資料可比較"
            : `與上月比較 ${diffPct! > 0 ? "+" : ""}${diffPct!.toFixed(1)}% · 點我看完整分析 ›`}
        </div>
      </motion.button>

      {creditCards.length > 0 && (
        <div className="rounded-[20px] p-4" style={cardStyle}>
          <h2 className="text-[15px] font-bold mb-3">信用卡額度</h2>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {creditCards.map((pm) => {
              const used = monthTxAll.filter((tx) => tx.paymentId === pm.id).reduce((s, tx) => s + tx.amount, 0);
              const pct = (used / (pm.limit as number)) * 100;
              const color = pct >= 100 ? "var(--danger)" : pct >= 80 ? "var(--warning)" : "var(--accent)";
              return (
                <motion.button
                  key={pm.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => goToListFiltered({ paymentId: pm.id })}
                  className="flex flex-col items-center gap-2 flex-shrink-0"
                >
                  <ProgressRing percent={pct} color={color} label={`${Math.round(pct)}%`} />
                  <span className="text-xs font-medium" style={{ color: "var(--text)" }}>
                    {pm.name}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {formatMoney(used)}/{formatMoney(pm.limit)}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {topSpenders.length > 0 && (
        <div className="rounded-[20px] p-4" style={cardStyle}>
          <h2 className="text-[15px] font-bold mb-3">本月前幾大支出</h2>
          {topSpenders.map((tx) => {
            const cat = categoryById[tx.categoryId];
            return (
              <div
                key={tx.id}
                onClick={() => openEditSheet(tx.id)}
                className="flex justify-between py-2 text-sm cursor-pointer"
              >
                <span>
                  {cat?.icon} {tx.subitem || cat?.name}
                </span>
                <span className="font-semibold">{formatMoney(tx.amount)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold">最近交易</h2>
          <button onClick={() => setPage("list")} className="text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
            查看全部 ›
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {recent.map((tx) => (
            <TxRow
              key={tx.id}
              tx={tx}
              category={categoryById[tx.categoryId]}
              payment={tx.paymentId != null ? paymentById[tx.paymentId] : undefined}
              onClick={() => openEditSheet(tx.id)}
            />
          ))}
        </div>
      </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
