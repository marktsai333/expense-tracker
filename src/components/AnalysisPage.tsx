import { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { useStore } from "../store/useStore";
import { byId, filterChartable, getMonthTransactions, sum } from "../lib/selectors";
import { formatMoney, monthKey } from "../lib/format";

const ACCENT = "#6c5ce8";

export function AnalysisPage() {
  const categories = useStore((s) => s.categories);
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

  const pieData = useMemo(() => {
    const sums = new Map<number, number>();
    for (const tx of monthTx) sums.set(tx.categoryId, (sums.get(tx.categoryId) ?? 0) + tx.amount);
    return Array.from(sums.entries())
      .map(([categoryId, value]) => {
        const cat = categoryById[categoryId];
        return { categoryId, name: cat?.name ?? "未分類", value, fill: cat?.color ?? "#999999" };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTx, categoryById]);

  const insight = useMemo(() => {
    const thisSums = new Map<number, number>();
    for (const tx of monthTx) thisSums.set(tx.categoryId, (thisSums.get(tx.categoryId) ?? 0) + tx.amount);
    const lastSums = new Map<number, number>();
    for (const tx of lastMonth) lastSums.set(tx.categoryId, (lastSums.get(tx.categoryId) ?? 0) + tx.amount);

    let best: { catId: number; pct: number } | null = null;
    for (const [catId, val] of thisSums) {
      const prev = lastSums.get(catId) ?? 0;
      if (prev <= 0) continue;
      const pct = ((val - prev) / prev) * 100;
      if (!best || Math.abs(pct) > Math.abs(best.pct)) best = { catId, pct };
    }
    if (best && Math.abs(best.pct) >= 10) {
      const cat = categoryById[best.catId];
      const verb = best.pct > 0 ? "多花了" : "少花了";
      return `📈 ${cat?.name ?? "未分類"}比上個月${verb} ${Math.abs(best.pct).toFixed(0)}%`;
    }
    if (pieData.length && total > 0) {
      const topCat = pieData[0];
      const pct = (topCat.value / total) * 100;
      return `🏷️ 這個月花最多的是「${topCat.name}」,佔了 ${pct.toFixed(0)}%`;
    }
    return null;
  }, [monthTx, lastMonth, categoryById, pieData, total]);

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

  const cardStyle = { background: "var(--card-bg)", boxShadow: "var(--shadow)" };

  return (
    <div className="flex flex-col gap-4">
      {insight && (
        <div
          className="rounded-[20px] p-5 text-white"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", boxShadow: "var(--shadow-lg)" }}
        >
          <div className="text-[17px] font-bold leading-snug">{insight}</div>
          <div className="text-[13px] opacity-85 mt-2">
            本月支出 {formatMoney(total)}
            {excludedTotal > 0 && ` · 另有固定支出 ${formatMoney(excludedTotal)}`}
          </div>
        </div>
      )}

      <div className="rounded-[20px] p-4" style={cardStyle}>
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

      <div className="rounded-[20px] p-4" style={cardStyle}>
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

      <div className="rounded-[20px] p-4" style={cardStyle}>
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
