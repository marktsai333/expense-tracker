import { useMemo } from "react";
import { motion } from "motion/react";
import { useStore } from "../store/useStore";
import { computeAccountBalance, computeNetWorth } from "../lib/selectors";
import { formatMoney } from "../lib/format";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function todayLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
}

export function OverviewPage() {
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const listFilterView = useStore((s) => s.overviewView);
  const setOverviewView = useStore((s) => s.setOverviewView);
  const openPaymentSheet = useStore((s) => s.openPaymentSheet);

  const cashAccounts = useMemo(() => paymentMethods.filter((p) => !p.isCredit), [paymentMethods]);
  const creditAccounts = useMemo(() => paymentMethods.filter((p) => p.isCredit), [paymentMethods]);

  const cardWithLimit = useMemo(() => creditAccounts.find((p) => p.limit), [creditAccounts]);
  const cardWithoutLimit = useMemo(() => creditAccounts.find((p) => !p.limit), [creditAccounts]);
  const primaryCard = cardWithLimit;
  const cardUsed = primaryCard ? -computeAccountBalance(primaryCard, transactions) : 0;
  const cardLimit = primaryCard?.limit ?? 0;
  const cardPct = primaryCard && cardLimit > 0 ? Math.min(100, (cardUsed / cardLimit) * 100) : 0;
  const cardRemaining = cardLimit - cardUsed;

  const cashTotal = useMemo(
    () => cashAccounts.reduce((s, p) => s + computeAccountBalance(p, transactions), 0),
    [cashAccounts, transactions]
  );

  const { net } = useMemo(() => computeNetWorth(paymentMethods, transactions), [paymentMethods, transactions]);

  const listAccounts = listFilterView === "assets" ? cashAccounts : creditAccounts;
  const barColor = cardPct >= 100 ? "var(--danger)" : cardPct >= 80 ? "var(--warning)" : "var(--accent2)";

  return (
    <div>
      <div style={{ background: "var(--accent)", padding: "calc(10px + env(safe-area-inset-top)) 18px 16px" }}>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <div className="text-[16px] font-extrabold text-white">{todayLabel()}</div>
            <div className="text-[10.5px] text-white/75 mt-0.5">記帳本已同步</div>
          </div>
          <div
            className="text-[11px] font-extrabold text-white rounded-full px-3 py-1.5"
            style={{ background: "var(--accent2)" }}
          >
            ☁ 已同步
          </div>
        </div>

        <div className="rounded-[16px] p-4" style={{ background: "var(--card-bg)" }}>
          {primaryCard ? (
            <>
              <div className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
                {primaryCard.icon} {primaryCard.name} · 本期已刷
              </div>
              <div className="num-lg text-[26px] mt-0.5" style={{ color: "var(--text)" }}>
                {formatMoney(cardUsed)}
              </div>
              <div className="text-[11.5px] mt-1" style={{ color: "var(--text-muted)" }}>
                額度 {formatMoney(cardLimit)} · 剩餘 {formatMoney(cardRemaining)}
              </div>
              <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: "var(--input-bg)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: barColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${cardPct}%` }}
                  transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
            </>
          ) : cardWithoutLimit ? (
            <div onClick={() => openPaymentSheet(cardWithoutLimit)} className="cursor-pointer">
              <div className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
                {cardWithoutLimit.icon} {cardWithoutLimit.name}
              </div>
              <div className="text-[15px] font-bold mt-1" style={{ color: "var(--accent)" }}>
                尚未設定額度,點此設定 ›
              </div>
            </div>
          ) : (
            <>
              <div className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
                現金總額
              </div>
              <div className="num-lg text-[26px] mt-0.5" style={{ color: cashTotal < 0 ? "var(--danger)" : "var(--success)" }}>
                {formatMoney(cashTotal)}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-4 pt-3.5 pb-6">
        <div className="flex rounded-full p-1 mb-3.5" style={{ background: "var(--input-bg)" }}>
          {[
            { v: "assets" as const, label: "資產" },
            { v: "liabilities" as const, label: "負債" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setOverviewView(opt.v)}
              className="flex-1 py-2 rounded-full text-[13px] font-bold"
              style={
                listFilterView === opt.v
                  ? { background: "var(--card-bg)", color: "var(--text)", boxShadow: "var(--shadow)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {listAccounts.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
            {listFilterView === "assets" ? "還沒有現金帳戶" : "還沒有信用卡"}
          </div>
        ) : (
          <div className="rounded-[16px] overflow-hidden" style={{ background: "var(--card-bg)" }}>
            {listAccounts.map((pm, i) => {
              const balance = computeAccountBalance(pm, transactions);
              return (
                <div
                  key={pm.id}
                  onClick={() => openPaymentSheet(pm)}
                  className="flex items-center gap-2.5 px-3.5 py-3 cursor-pointer"
                  style={i > 0 ? { borderTop: "1px solid var(--border)" } : undefined}
                >
                  <div
                    className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[15px] flex-shrink-0"
                    style={{ background: "var(--accent-soft)" }}
                  >
                    {pm.icon}
                  </div>
                  <div className="text-[13px] font-bold flex-1">{pm.name}</div>
                  <div className="num text-[14px]" style={{ color: balance < 0 ? "var(--danger)" : "var(--success)" }}>
                    {formatMoney(balance)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center mt-3.5 px-1">
          <span className="text-[12px] font-bold" style={{ color: "var(--text-muted)" }}>
            淨資產
          </span>
          <span className="num text-[14px]" style={{ color: net < 0 ? "var(--danger)" : "var(--success)" }}>
            {formatMoney(net)}
          </span>
        </div>
      </div>
    </div>
  );
}
