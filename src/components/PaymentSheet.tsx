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

  useEffect(() => {
    if (open) {
      setName(payment?.name ?? "");
      setIsCredit(payment?.isCredit ?? false);
      setLimit(payment?.limit != null ? String(payment.limit) : "");
    }
  }, [open, payment]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("請輸入名稱");
      return;
    }
    const parsedLimit = parseFloat(limit);
    const payload = { name: name.trim(), isCredit, limit: isCredit && !isNaN(parsedLimit) ? parsedLimit : null };
    if (payment) await updatePaymentMethod({ ...payload, id: payment.id });
    else await addPaymentMethod(payload);
    toast.success("已儲存");
    onClose();
  }

  async function handleDelete() {
    if (!payment) return;
    if (!confirm("確定刪除這個付款方式嗎？")) return;
    await deletePaymentMethod(payment.id);
    toast.success("已刪除");
    onClose();
  }

  const inputStyle = { background: "var(--input-bg)", color: "var(--text)" };
  const labelStyle = { color: "var(--text-muted)" };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title={payment ? "編輯付款方式" : "新增付款方式"}>
      <div className="mb-3.5">
        <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
          名稱
        </label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl px-3.5 py-3 text-base" style={inputStyle} />
      </div>
      <div className="mb-3.5 flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
        <input type="checkbox" id="isCredit" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} className="w-[18px] h-[18px]" />
        <label htmlFor="isCredit">這是信用卡(可設定額度預警)</label>
      </div>
      {isCredit && (
        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
            信用卡額度
          </label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="例如 1000"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-full rounded-2xl px-3.5 py-3 text-base"
            style={inputStyle}
          />
        </div>
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
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
        >
          儲存
        </motion.button>
      </div>
    </Sheet>
  );
}
