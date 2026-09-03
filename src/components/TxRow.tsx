import type { Category, PaymentMethod, Transaction } from "../lib/db";
import { formatMoney } from "../lib/format";

export function formatItems(items: Transaction["items"]): string {
  if (!items || !items.length) return "";
  return (
    "細項：" +
    items.map((it) => (it.amount != null ? `${it.name} ${formatMoney(it.amount)}` : it.name)).join("、")
  );
}

export function TxRow({
  tx,
  category,
  payment,
  onClick,
}: {
  tx: Transaction;
  category: Category;
  payment?: PaymentMethod;
  onClick?: () => void;
}) {
  const subtitle = [tx.subitem, payment?.name].filter(Boolean).join(" · ");
  const itemsText = formatItems(tx.items);
  const tipText = tx.tipPercent ? `含 ${tx.tipPercent}% 小費 ${formatMoney(tx.tipAmount)}` : "";
  const extraLines = [itemsText, tipText].filter(Boolean);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
      style={{ background: "var(--card-bg)", boxShadow: "var(--shadow)", cursor: onClick ? "pointer" : undefined }}
    >
      <div
        className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-[19px] flex-shrink-0"
        style={{
          background: `linear-gradient(150deg, ${category.color}38, ${category.color}18)`,
          border: `1px solid ${category.color}30`,
          boxShadow: `inset 0 -1.5px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)`,
        }}
      >
        {category.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold truncate">{tx.subitem || category.name}</div>
        <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
          {subtitle || tx.date}
        </div>
        {extraLines.map((t, i) => (
          <div key={i} className="text-[11px] mt-0.5 opacity-85" style={{ color: "var(--text-muted)" }}>
            {t}
          </div>
        ))}
      </div>
      <div className="text-[15px] font-bold whitespace-nowrap">{formatMoney(tx.amount)}</div>
    </div>
  );
}
