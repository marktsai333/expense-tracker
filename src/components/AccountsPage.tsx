import { useMemo } from "react";
import { motion } from "motion/react";
import { useStore } from "../store/useStore";
import { computeAccountBalance } from "../lib/selectors";
import { formatMoney } from "../lib/format";

export function AccountsPage() {
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const openPaymentSheet = useStore((s) => s.openPaymentSheet);

  const cashAccounts = useMemo(() => paymentMethods.filter((p) => !p.isCredit), [paymentMethods]);
  const creditAccounts = useMemo(() => paymentMethods.filter((p) => p.isCredit), [paymentMethods]);

  function renderGroup(title: string, list: typeof paymentMethods) {
    if (list.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="text-[11px] font-extrabold px-1 mb-1.5" style={{ color: "var(--text-muted)" }}>
          {title}
        </div>
        <div className="rounded-[16px] overflow-hidden" style={{ background: "var(--card-bg)" }}>
          {list.map((pm, i) => {
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
                  style={{ background: pm.isCredit ? "var(--danger-soft)" : "var(--accent-soft)" }}
                >
                  {pm.icon}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-bold">{pm.name}</div>
                  <div className="text-[10.5px]" style={{ color: "var(--text-muted)" }}>
                    {pm.isCredit ? `額度 ${formatMoney(pm.limit)}` : `起始 ${formatMoney(pm.startingBalance)}`}
                  </div>
                </div>
                <div className="num text-[14px]" style={{ color: balance < 0 ? "var(--danger)" : "var(--success)" }}>
                  {formatMoney(balance)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[19px] font-extrabold m-0">帳戶</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => openPaymentSheet(null)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] font-bold"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          aria-label="新增帳戶"
        >
          +
        </motion.button>
      </div>

      {renderGroup("現金帳戶", cashAccounts)}
      {renderGroup("信用帳戶", creditAccounts)}

      {paymentMethods.length === 0 && (
        <div className="text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>
          還沒有帳戶,點右上角「+」新增
        </div>
      )}
    </div>
  );
}
