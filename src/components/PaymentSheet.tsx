import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Sheet } from "./Sheet";
import { useStore } from "../store/useStore";
import type { PaymentMethod } from "../lib/db";

export function PaymentSheet({
  open,
  payment,
  onClose,
}: {
  open: boolean;
  payment: PaymentMethod | null;
  onClose: () => void;
}) {
  const addPaymentMethod = useStore((s) => s.addPaymentMethod);
  const updatePaymentMethod = useStore((s) => s.updatePaymentMethod);
  const deletePaymentMethod = useStore((s) => s.deletePaymentMethod);

  const [name, setName] = useState("");
  const [isCredit, setIsCredit] = useState(false);
  const [limit, setLimit] = useState("");
  const [startingBalance, setStartingBalance] = useState("");

  useEffect(() => {
    if (open) {
      setName(payment?.name ?? "");
      setIsCredit(payment?.isCredit ?? false);
      setLimit(payment?.limit != null ? String(payment.limit) : "");
      setStartingBalance(payment?.startingBalance != null ? String(payment.startingBalance) : "0");
    }
  }, [open, payment]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("請輸入名稱");
      return;
    }
    const parsedLimit = parseFloat(limit);
    const parsedStart = parseFloat(startingBalance);
    const payload = {
      name: name.trim(),
      icon: payment?.icon ?? (isCredit ? "💳" : "💰"),
      isCredit,
      limit: isCredit && !isNaN(parsedLimit) ? parsedLimit : null,
      startingBalance: !isNaN(parsedStart) ? parsedStart : 0,
      balanceResetAt: payment?.balanceResetAt ?? null,
    };
    if (payment) await updatePaymentMethod({ ...payload, id: payment.id });
    else await addPaymentMethod(payload);
    toast.success("已儲存");
    onClose();
  }

  async function handleMarkPaid() {
    if (!payment) return;
    await updatePaymentMethod({ ...payment, balanceResetAt: Date.now() });
    toast.success("已標記還款,重新計算欠款");
    onClose();
  }

  async function handleDelete() {
    if (!payment) return;
    if (!confirm("確定刪除這個帳戶嗎？")) return;
    await deletePaymentMethod(payment.id);
    toast.success("已刪除");
    onClose();
  }

  const inputStyle = { background: "var(--input-bg)", color: "var(--text)" };
  const labelStyle = { color: "var(--text-muted)" };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title={payment ? "編輯帳戶" : "新增帳戶"}>
      <div className="mb-3.5">
        <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
          名稱
        </label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl px-3.5 py-3 text-base" style={inputStyle} />
      </div>

      <div className="mb-3.5">
        <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
          類型
        </label>
        <div className="flex rounded-full p-1" style={{ background: "var(--input-bg)" }}>
          {[
            { v: false, label: "現金帳戶" },
            { v: true, label: "信用卡" },
          ].map((opt) => (
            <button
              key={String(opt.v)}
              onClick={() => setIsCredit(opt.v)}
              className="flex-1 py-2 rounded-full text-sm font-bold"
              style={
                isCredit === opt.v
                  ? { background: "var(--card-bg)", color: "var(--text)", boxShadow: "var(--shadow)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isCredit ? (
        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
            額度
          </label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="例如 20000"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-full rounded-2xl px-3.5 py-3 text-base"
            style={inputStyle}
          />
        </div>
      ) : (
        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
            起始餘額
          </label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="例如 10000"
            value={startingBalance}
            onChange={(e) => setStartingBalance(e.target.value)}
            className="w-full rounded-2xl px-3.5 py-3 text-base"
            style={inputStyle}
          />
        </div>
      )}

      {isCredit && payment && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleMarkPaid}
          className="w-full py-3 rounded-2xl text-[14px] font-bold mb-3.5"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          標記已還款(重新計算欠款)
        </motion.button>
      )}

      <div className="flex gap-2 mt-2.5">
        {payment && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleDelete}
            className="flex-1 py-3 rounded-full text-[15px] font-semibold"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            刪除
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          className="flex-1 py-3 rounded-full text-[15px] font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          取消
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          className="flex-1 py-3 rounded-full text-[15px] font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          儲存
        </motion.button>
      </div>
    </Sheet>
  );
}
