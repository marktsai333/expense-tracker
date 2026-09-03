import { useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { useStore } from "../store/useStore";
import { byId, filterChartable, getMonthTransactions, sum } from "../lib/selectors";
import { formatMoney, daysInMonth, monthKey } from "../lib/format";

const ACCENT = "#17b892";

export function ChartsPage() {
  const categories = useStore((s) => s.categories);
  const paymentMethods = useStore((s) => s.paymentMethods);
  const transactions = useStore((s) => s.transactions);
  const { year, month } = useStore((s) => s.month);
  const [trendCategoryId, setTrendCategoryId] = useState("");

  const categoryById = useMemo(() => byId(categories), [categories]);

  const monthTxAll = useMemo(() => getMonthTransactions(transactions, year, month), [transactions, year, month]);
  const monthTx = useMemo(() => filterChartable(monthTxAll, categoryById), [monthTxAll, categoryById]);
  const total = sum(monthTx);
  const excludedTotal = sum(monthTxAll) - total;

  const lastMonth = useMemo(() => {
    let y = year, m = month - 1;
    if (m < 1) { m = 12; y -= 1; }
    return filterChartable(getMonthTransactions(transactions, y, m), categoryById);
  }, [transactions, year, month, categoryById]);
  const lastTotal = sum(lastMonth);
  const diffPct = lastTotal === 0 ? null : ((total - lastTotal) / lastTotal) * 100;

  const creditCards = paymentMethods.filter((p) => p.isCredit && p.limit);

  const pieData = useMemo(() => {
    const sums = new Map<number, number>();
    for (const tx of monthTx) sums.set(tx.categoryId, (sums.get(tx.categoryId) ?? 0) + tx.amount);
    return Array.from(sums.entries())
      .map(([categoryId, value]) => {
        const cat = categoryById[categoryId];
        return { name: cat?.name ?? "未分類", value, fill: cat?.color ?? "#999999" };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTx, categoryById]);

  const lineData = useMemo(() => {
    const nDays = daysInMonth(year, month);
    const dayTotals = new Array(nDays + 1).fill(0);
    for (const tx of monthTx) {
      const day = parseInt(tx.date.split("-")[2], 10);
      dayTotals[day] += tx.amount;
    }
    return Array.from({ length: nDays }, (_, i) => ({ day: String(i + 1), amount: dayTotals[i + 1] }));
  }, [monthTx, year, month]);

  const barData = useMemo(() => {
    const groups = [];
    for (let i = 5; i >= 0; i--) {
      let y = year, m = month - i;
      while (m < 1) { m += 12; y -= 1; }
      const key = monthKey(y, m);
      let list = transactions.filter((tx) => tx.date.startsWith(key));
      if (trendCategoryId) list = list.filter((tx) => String(tx.categoryId) === trendCategoryId);
      else list = filterChartable(list, categoryById);
      groups.push({ label: `${m}月`, amount: sum(list) });
    }
    return groups;
  }, [transactions, year, month, trendCategoryId, categoryById]);

  const topList = useMemo(() => [...monthTx].sort((a, b) => b.amount - a.amount).slice(0, 5), [monthTx]);

  return (
    <div>
      {/* 摘要卡 */}
      <div
        className="rounded-[20px] p-5 mb-4 text-white"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", boxShadow: "var(--shadow-lg)" }}
      >
        <span className="text-[13px] opacity-85 block">本月支出</span>
        <span className="text-[32px] font-extrabold flex items-baseline">
          $<NumberFlow value={Math.round(total * 100) / 100} />
        </span>
        <div className="text-[13px] opacity-90 mt-2">
          {lastTotal === 0
            ? total === 0
              ? "與上月比較 —"
              : "上月無資料可比較"
            : `與上月比較 ${diffPct! > 0 ? "+" : ""}${diffPct!.toFixed(1)}%`}
        </div>
        {excludedTotal > 0 && (
          <div className="text-xs opacity-85 mt-2.5 pt-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.25)" }}>
            另有固定支出(學費/房租等，不列入下方統計)：{formatMoney(excludedTotal)}
          </div>
        )}
      </div>

      {/* 信用卡額度預警 */}
      {creditCards.length > 0 && (
        <div className="rounded-[20px] p-4 mb-4" style={{ background: "var(--card-bg)", boxShadow: "var(--shadow)" }}>
          <h2 className="text-[15px] font-bold mb-3">💳 信用卡額度預警</h2>
          {creditCards.map((pm) => {
            const used = monthTxAll.filter((tx) => tx.paymentId === pm.id).reduce((s, tx) => s + tx.amount, 0);
            const pct = Math.min(100, (used / (pm.limit as number)) * 100);
            const level = pct >= 100 ? "var(--danger)" : pct >= 80 ? "var(--warning)" : "var(--accent)";
            const note = pct >= 100 ? "⚠️ 本月刷卡金額已超過額度！" : pct >= 80 ? "本月刷卡金額已接近額度上限" : "";
            return (
              <div key={pm.id} className="mb-4 last:mb-0">
                <div className="flex justify-between items-baseline text-sm mb-1.5">
                  <span className="font-semibold">{pm.name}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {formatMoney(used)} / {formatMoney(pm.limit)}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "var(--input-bg)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, background: level }}
                  />
                </div>
                {note && (
                  <div className="text-xs mt-1.5 font-semibold" style={{ color: level }}>
                    {note}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 類別佔比 */}
      <div className="rounded-[20px] p-4 mb-4" style={{ background: "var(--card-bg)", boxShadow: "var(--shadow)" }}>
        <h2 className="text-[15px] font-bold mb-3">類別佔比</h2>
        {pieData.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>尚無資料</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => formatMoney(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 每日支出趨勢 */}
      <div className="rounded-[20px] p-4 mb-4" style={{ background: "var(--card-bg)", boxShadow: "var(--shadow)" }}>
        <h2 className="text-[15px] font-bold mb-3">每日支出趨勢</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-muted)" }} interval={Math.ceil(lineData.length / 6)} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={36} />
            <Tooltip formatter={(v: any) => formatMoney(Number(v))} />
            <Line type="monotone" dataKey="amount" stroke={ACCENT} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 近6個月類別比較 */}
      <div className="rounded-[20px] p-4 mb-4" style={{ background: "var(--card-bg)", boxShadow: "var(--shadow)" }}>
        <h2 className="text-[15px] font-bold mb-3">近 6 個月類別比較</h2>
        <select
          value={trendCategoryId}
          onChange={(e) => setTrendCategoryId(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3"
          style={{ background: "var(--input-bg)", color: "var(--text)" }}
        >
          <option value="">全部類別</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={36} />
            <Tooltip formatter={(v: any) => formatMoney(Number(v))} />
            <Bar dataKey="amount" fill={trendCategoryId ? categoryById[Number(trendCategoryId)]?.color ?? ACCENT : ACCENT} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 前5大支出 */}
      <div className="rounded-[20px] p-4" style={{ background: "var(--card-bg)", boxShadow: "var(--shadow)" }}>
        <h2 className="text-[15px] font-bold mb-3">本月前 5 大支出</h2>
        {topList.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>本月尚無紀錄</p>
        ) : (
          topList.map((tx) => {
            const cat = categoryById[tx.categoryId];
            return (
              <div key={tx.id} className="flex justify-between py-2.5 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
                <span>{cat?.icon} {tx.subitem || cat?.name}</span>
                <span>{formatMoney(tx.amount)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
