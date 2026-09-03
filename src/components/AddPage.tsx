import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useStore } from "../store/useStore";
import type { ItemBreakdown, Transaction } from "../lib/db";
import { todayStr, formatMoney } from "../lib/format";
import { byId } from "../lib/selectors";
import { CategoryGrid } from "./CategoryGrid";
import { SuggestChips } from "./SuggestChips";
import { ItemRows } from "./ItemRows";
import { DateField } from "./DateField";
import { TxRow } from "./TxRow";

interface FormState {
  date: string;
  categoryId: number | null;
  subitem: string;
  amount: string;
  tipPercent: string;
  paymentId: number | null;
  note: string;
  items: ItemBreakdown[];
}

function emptyForm(defaultCategoryId: number | null): FormState {
  return {
    date: todayStr(),
    categoryId: defaultCategoryId,
    subitem: "",
    amount: "",
    tipPercent: "",
    paymentId: null,
    note: "",
    items: [],
  };
}

export function AddPage() {
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const editingId = useStore((s) => s.editingId);
  const cancelEdit = useStore((s) => s.cancelEdit);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);

  const categoryById = useMemo(() => byId(categories), [categories]);
  const paymentById = useMemo(() => byId(paymentMethods), [paymentMethods]);
  const editingTx = editingId != null ? transactions.find((t) => t.id === editingId) : undefined;

  const [form, setForm] = useState<FormState>(() => emptyForm(categories[0]?.id ?? null));

  useEffect(() => {
    if (editingTx) {
      setForm({
        date: editingTx.date,
        categoryId: editingTx.categoryId,
        subitem: editingTx.subitem,
        amount: String(editingTx.subtotal ?? editingTx.amount),
        tipPercent: editingTx.tipPercent != null ? String(editingTx.tipPercent) : "",
        paymentId: editingTx.paymentId,
        note: editingTx.note,
        items: editingTx.items ?? [],
      });
    }
  }, [editingTx]);

  useEffect(() => {
    if (form.categoryId === null && categories.length) {
      setForm((f) => ({ ...f, categoryId: categories[0].id }));
    }
  }, [categories, form.categoryId]);

  const recent = useMemo(() => [...transactions].sort((a, b) => b.id - a.id).slice(0, 5), [transactions]);

  const parsedAmount = parseFloat(form.amount);
  const parsedTip = parseFloat(form.tipPercent);
  const hasTip = !isNaN(parsedTip) && parsedTip !== 0 && !isNaN(parsedAmount);
  const tipAmount = hasTip ? Math.round(parsedAmount * (parsedTip / 100) * 100) / 100 : 0;
  const totalWithTip = hasTip ? Math.round((parsedAmount + tipAmount) * 100) / 100 : parsedAmount;

  function pickSuggestion(tx: Transaction) {
    setForm((f) => ({ ...f, subitem: tx.subitem, amount: String(tx.subtotal ?? tx.amount), paymentId: tx.paymentId }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || isNaN(parsedAmount) || form.categoryId === null) {
      toast.error("請填寫日期、金額與類別");
      return;
    }

    const finalAmount = hasTip ? totalWithTip : parsedAmount;
    const items = form.items.filter((it) => it.name.trim());

    const payload = {
      date: form.date,
      categoryId: form.categoryId,
      subitem: form.subitem.trim(),
      amount: finalAmount,
      subtotal: hasTip ? parsedAmount : null,
      tipPercent: hasTip ? parsedTip : null,
      tipAmount: hasTip ? tipAmount : null,
      paymentId: form.paymentId,
      note: form.note.trim(),
      items: items.length ? items : null,
    };

    if (editingTx) {
      await updateTransaction({ ...payload, id: editingTx.id } as Transaction);
      toast.success("已更新紀錄");
      cancelEdit();
      setForm(emptyForm(categories[0]?.id ?? null));
    } else {
      await addTransaction(payload);
      toast.success("已新增紀錄");
      setForm((f) => ({ ...emptyForm(f.categoryId), categoryId: f.categoryId }));
    }
  }

  function handleCancelEdit() {
    cancelEdit();
    setForm(emptyForm(categories[0]?.id ?? null));
  }

  return (
    <div style={{ paddingBottom: 150 }}>
      <form
        id="addForm"
        onSubmit={handleSubmit}
        className="rounded-[20px] p-4"
        style={{ background: "var(--card-bg)", boxShadow: "var(--shadow)" }}
      >
        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            日期
          </label>
          <DateField value={form.date} onChange={(date) => setForm((f) => ({ ...f, date }))} />
        </div>

        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            類別
          </label>
          <CategoryGrid
            categories={categories}
            selectedId={form.categoryId}
            onSelect={(categoryId) => setForm((f) => ({ ...f, categoryId }))}
          />
        </div>

        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            子項目
          </label>
          <input
            type="text"
            autoComplete="off"
            placeholder="例如：Bambu 珍奶"
            value={form.subitem}
            onChange={(e) => setForm((f) => ({ ...f, subitem: e.target.value }))}
            className="w-full rounded-2xl px-3.5 py-3.5 text-base"
            style={{ background: "var(--input-bg)", color: "var(--text)" }}
          />
          <SuggestChips transactions={transactions} categoryId={form.categoryId} query={form.subitem} onPick={pickSuggestion} />
        </div>

        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            金額
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0"
            required
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            className="w-full rounded-2xl px-3.5 py-3.5 text-base"
            style={{ background: "var(--input-bg)", color: "var(--text)" }}
          />
        </div>

        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            小費／服務費 %(選填，美國常用)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            placeholder="例如 20"
            value={form.tipPercent}
            onChange={(e) => setForm((f) => ({ ...f, tipPercent: e.target.value }))}
            className="w-full rounded-2xl px-3.5 py-3.5 text-base"
            style={{ background: "var(--input-bg)", color: "var(--text)" }}
          />
          {hasTip && (
            <div className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
              小費 {formatMoney(tipAmount)}，實際總額 {formatMoney(totalWithTip)}
            </div>
          )}
        </div>

        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            付款方式
          </label>
          <select
            value={form.paymentId ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, paymentId: e.target.value ? Number(e.target.value) : null }))}
            className="w-full rounded-2xl px-3.5 py-3.5 text-base"
            style={{ background: "var(--input-bg)", color: "var(--text)" }}
          >
            {paymentMethods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            細項(選填，例如雜貨裡面實際買了什麼)
          </label>
          <ItemRows items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} />
        </div>

        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
            備註
          </label>
          <textarea
            rows={3}
            placeholder="自由記錄：好吃嗎？用途是什麼？..."
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            className="w-full rounded-2xl px-3.5 py-3.5 text-base resize-y"
            style={{ background: "var(--input-bg)", color: "var(--text)", minHeight: 64, fontFamily: "inherit" }}
          />
        </div>
      </form>

      {recent.length > 0 && (
        <div className="mt-6">
          <h2 className="text-[15px] font-bold mb-3">最近新增</h2>
          <div className="flex flex-col gap-2">
            {recent.map((tx) => (
              <TxRow
                key={tx.id}
                tx={tx}
                category={categoryById[tx.categoryId]}
                payment={tx.paymentId != null ? paymentById[tx.paymentId] : undefined}
                onClick={() => useStore.getState().startEdit(tx.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="fixed left-4 right-4 z-[15] flex flex-col gap-2" style={{ bottom: "calc(14px + 76px + env(safe-area-inset-bottom))" }}>
        {editingTx && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleCancelEdit}
            className="w-full py-3.5 rounded-full text-[15px] font-medium backdrop-blur-xl"
            style={{ background: "var(--glass-bg-strong)", border: "1px solid var(--glass-border)", color: "var(--text)" }}
          >
            取消編輯
          </motion.button>
        )}
        <motion.button
          type="submit"
          form="addForm"
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.12 }}
          className="w-full py-[15px] rounded-full text-base font-bold text-white"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            boxShadow: "0 10px 20px rgba(23,184,146,0.28), inset 0 1px 0 rgba(255,255,255,0.35)",
          }}
        >
          {editingTx ? "更新紀錄" : "新增紀錄"}
        </motion.button>
      </div>
    </div>
  );
}
