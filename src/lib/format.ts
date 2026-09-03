export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
export function monthKey(y: number, m: number): string {
  return `${y}-${pad2(m)}`;
}
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate();
}
export function formatMoney(n: number | null | undefined): string {
  const num = Math.round((n ?? 0) * 100) / 100 || 0;
  return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
export function formatDateDisplay(v: string): string {
  if (!v) return "選擇日期";
  const [y, m, d] = v.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}
export function formatDateShort(v: string): string {
  if (!v) return "";
  const [, m, d] = v.split("-").map(Number);
  return `${m}/${d}`;
}
