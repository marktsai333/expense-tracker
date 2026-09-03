import type { Category, ItemBreakdown, NewTransaction, PaymentMethod, Transaction } from "./db";

export function csvEscape(field: unknown): string {
  const s = String(field ?? "");
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function serializeItems(items: ItemBreakdown[] | null): string {
  if (!items || !items.length) return "";
  return items.map((it) => (it.amount != null ? `${it.name}:${it.amount}` : it.name)).join("、");
}

export function deserializeItems(str: string | undefined): ItemBreakdown[] | null {
  if (!str) return null;
  const parts = str.split("、").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  return parts.map((p) => {
    const idx = p.lastIndexOf(":");
    if (idx === -1) return { name: p, amount: null };
    const name = p.slice(0, idx).trim();
    const amt = parseFloat(p.slice(idx + 1).trim());
    return { name: name || p, amount: isNaN(amt) ? null : amt };
  });
}

export function buildExportCSV(
  transactions: Transaction[],
  categoryById: Record<number, Category>,
  paymentById: Record<number, PaymentMethod>,
): string {
  const sorted = [...transactions].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : a.id - b.id));
  const header = ["日期", "類別", "子項目", "金額", "付款方式", "備註", "小費%", "細項"];
  const rows = sorted.map((tx) => [
    tx.date,
    categoryById[tx.categoryId]?.name || "",
    tx.subitem || "",
    tx.amount,
    tx.paymentId != null ? paymentById[tx.paymentId]?.name || "" : "",
    tx.note || "",
    tx.tipPercent ?? "",
    serializeItems(tx.items),
  ]);
  return [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        rows.push(row); row = [];
      } else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length && r.some((f) => f !== ""));
}

export interface CsvLookup {
  findOrCreateCategoryId: (name: string) => Promise<number>;
  findOrCreatePaymentId: (name: string) => Promise<number | null>;
}

export async function parseImportRows(text: string, lookup: CsvLookup): Promise<NewTransaction[]> {
  const rows = parseCSV(text.replace(/^﻿/, ""));
  if (!rows.length) return [];

  const [header, ...rest] = rows;
  const looksLikeHeader = /日期|date/i.test(header[0] || "");
  const data = looksLikeHeader ? rest : rows;

  const result: NewTransaction[] = [];
  for (const r of data) {
    const [date, catName, subitem, amountStr, pmName, note, tipPctStr, itemsStr] = r;
    const amount = parseFloat(amountStr);
    if (!date || isNaN(amount)) continue;

    const categoryId = await lookup.findOrCreateCategoryId((catName || "").trim());
    const paymentId = await lookup.findOrCreatePaymentId((pmName || "").trim());

    const tipPercent = tipPctStr ? parseFloat(tipPctStr) : NaN;
    let subtotal: number | null = null;
    let tipAmount: number | null = null;
    if (!isNaN(tipPercent) && tipPercent !== 0) {
      subtotal = Math.round((amount / (1 + tipPercent / 100)) * 100) / 100;
      tipAmount = Math.round((amount - subtotal) * 100) / 100;
    }

    result.push({
      date: date.trim(),
      categoryId,
      subitem: (subitem || "").trim(),
      amount,
      subtotal,
      tipPercent: isNaN(tipPercent) || tipPercent === 0 ? null : tipPercent,
      tipAmount,
      paymentId,
      note: (note || "").trim(),
      items: deserializeItems(itemsStr),
    });
  }
  return result;
}
