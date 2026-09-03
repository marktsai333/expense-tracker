import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useStore } from "../store/useStore";
import type { ItemBreakdown, Transaction } from "../lib/db";
import { todayStr, formatMoney } from "../lib/format";
import { Sheet } from "./Sheet";
import { CategoryGrid } from "./CategoryGrid";
import { SuggestChips } from "./SuggestChips";
import { ItemRows } from "./ItemRows";
import { DateField } from "./DateField";

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

export function AddEditSheet() {
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const sheetOpen = useStore((s) => s.sheetOpen);
  const editingId = useStore((s) => s.editingId);
  const closeSheet = useStore((s) => s.closeSheet);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);

  const editingTx = editingId != null ? transactions.find((t) => t.id === editingId) : undefined;

  const [form, setForm] = useState<FormState>(() => emptyForm(categories[0]?.id ?? null));
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!sheetOpen) return;
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
      setMoreOpen(!!(editingTx.tipPercent || editingTx.items?.length || editingTx.note));
    } else {
      setForm(emptyForm(categories[0]?.id ?? null));
      setMoreOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen, editingId]);

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
    } else {
      await addTransaction(payload);
      toast.success("已新增紀錄");
    }
    closeSheet();
  }

  async function handleDelete() {
    if (!editingTx) return;
    if (!confirm("確定要刪除這筆紀錄嗎？")) return;
    await deleteTransaction(editingTx.id);
    toast.success("已刪除");
    closeSheet();
  }

  const inputStyle = { background: "var(--input-bg)", color: "var(--text)" };
  const labelStyle = { color: "var(--text-muted)" };

  return (
    <Sheet open={sheetOpen} onOpenChange={(o) => !o && closeSheet()} title={editingTx ? "編輯紀錄" : "新增紀錄"}>
      <form id="addEditForm" onSubmit={handleSubmit}>
        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
            日期
          </label>
          <DateField value={form.date} onChange={(date) => setForm((f) => ({ ...f, date }))} />
        </div>

        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
            類別
          </label>
          <CategoryGrid
            categories={categories}
            selectedId={form.categoryId}
            onSelect={(categoryId) => setForm((f) => ({ ...f, categoryId }))}
          />
        </div>

        <div className="mb-3.5">
          <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
            子項目
          </label>
          <input
            type="text"
            autoComplete="off"
            placeholder="例如：Bambu 珍奶"
            value={form.subitem}
            onChange={(e) => setForm((f) => ({ ...f, subitem: e.target.value }))}
            className="w-full rounded-2xl px-3.5 py-3.5 text-base"
            style={inputStyle}
          />
          <SuggestChips transactions={transactions} categoryId={form.categoryId} query={form.subitem} onPick={pickSuggestion} />
        </div>

        <div className="flex gap-2.5 mb-3.5">
          <div className="flex-1">
            <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
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
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
              付款方式
            </label>
            <select
              value={form.paymentId ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, paymentId: e.target.value ? Number(e.target.value) : null }))}
              className="w-full rounded-2xl px-3.5 py-3.5 text-base"
              style={inputStyle}
            >
              <option value="">選擇</option>
              {paymentMethods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => setMoreOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[13px] font-semibold mb-3"
          style={{ color: "var(--accent)" }}
        >
          <motion.span animate={{ rotate: moreOpen ? 90 : 0 }} transition={{ duration: 0.15 }}>
            ›
          </motion.span>
          更多選項(小費、細項、備註)
        </motion.button>

        <AnimatePresence initial={false}>
          {moreOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className="mb-3.5">
                <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
                  小費／服務費 %
                </label>
                <div className="flex gap-1.5 mb-2">
                  {settings.tipPresets.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tipPercent: String(pct) }))}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold"
                      style={
                        String(pct) === form.tipPercent
                          ? { background: "var(--accent)", color: "var(--accent-contrast)" }
                          : { background: "var(--input-bg)", color: "var(--text)" }
                      }
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  placeholder="自訂 %"
                  value={form.tipPercent}
                  onChange={(e) => setForm((f) => ({ ...f, tipPercent: e.target.value }))}
                  className="w-full rounded-2xl px-3.5 py-3 text-base"
                  style={inputStyle}
                />
                {hasTip && (
                  <div className="text-xs mt-1.5" style={labelStyle}>
                    小費 {formatMoney(tipAmount)}，實際總額 {formatMoney(totalWithTip)}
                  </div>
                )}
              </div>

              <div className="mb-3.5">
                <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
                  細項(例如雜貨裡面實際買了什麼)
                </label>
                <ItemRows items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} />
              </div>

              <div className="mb-3.5">
                <label className="block text-[13px] font-medium mb-1.5" style={labelStyle}>
                  備註
                </label>
                <textarea
                  rows={3}
                  placeholder="自由記錄：好吃嗎？用途是什麼？..."
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className="w-full rounded-2xl px-3.5 py-3.5 text-base resize-y"
                  style={{ ...inputStyle, minHeight: 64, fontFamily: "inherit" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 mt-2">
          {editingTx && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleDelete}
              className="flex-1 py-3.5 rounded-full text-[15px] font-semibold"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              刪除
            </motion.button>
          )}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-[15px] rounded-full text-base font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              boxShadow: "0 10px 20px rgba(23,184,146,0.28), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            {editingTx ? "更新紀錄" : "新增紀錄"}
          </motion.button>
        </div>
      </form>
    </Sheet>
  );
}
