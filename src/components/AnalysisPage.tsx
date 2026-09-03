import { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { useStore } from "../store/useStore";
import { byId, filterChartable, getMonthTransactions, sum } from "../lib/selectors";
import { formatMoney, monthKey } from "../lib/format";

type TrendMode = "income" | "expense" | "balance";

export function AnalysisPage() {
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const { year, month } = useStore((s) => s.month);
  const [trendMode, setTrendMode] = useState<TrendMode>("expense");

  const categoryById = useMemo(() => byId(categories), [categories]);

  const monthTxAll = useMemo(() => getMonthTransactions(transactions, year, month), [transactions, year, month]);
  const monthTx = useMemo(() => filterChartable(monthTxAll, categoryById), [monthTxAll, categoryById]);
  const expense = sum(monthTx);
  const income = 0;
  const balance = income - expense;

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

  const trendData = useMemo(() => {
    const groups = [];
    for (let i = 5; i >= 0; i--) {
      let y = year, m = month - i;
      while (m < 1) { m += 12; y -= 1; }
      const key = monthKey(y, m);
      const list = filterChartable(transactions.filter((tx) => tx.date.startsWith(key)), categoryById);
      const exp = sum(list);
      const val = trendMode === "income" ? 0 : trendMode === "expense" ? exp : -exp;
      groups.push({ label: `${m}月`, amount: val });
    }
    return groups;
  }, [transactions, year, month, categoryById, trendMode]);

  const topList = useMemo(() => [...monthTx].sort((a, b) => b.amount - a.amount).slice(0, 5), [monthTx]);

  const cardStyle = { background: "var(--card-bg)", boxShadow: "var(--shadow)" };
  const trendColor = trendMode === "balance" ? "var(--danger)" : "var(--accent2)";

  return (
    <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
      <h1 className="text-[19px] font-extrabold m-0">分析</h1>

      <div className="rounded-[16px] p-4" style={cardStyle}>
        <div className="flex justify-between text-center">
          <div className="flex-1">
            <div className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>結餘</div>
            <div className="num text-[16px] mt-0.5">{formatMoney(balance)}</div>
          </div>
          <div className="flex-1" style={{ borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
            <div className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>收入</div>
            <div className="num text-[16px] mt-0.5" style={{ color: "var(--success)" }}>{formatMoney(income)}</div>
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>支出</div>
            <div className="num text-[16px] mt-0.5">{formatMoney(expense)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-[16px] p-4" style={cardStyle}>
        {pieData.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>本月尚無資料</p>
        ) : (
          <>
            <div className="relative" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatMoney(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="num text-[18px]">{formatMoney(expense)}</span>
                <span className="text-[10.5px]" style={{ color: "var(--text-muted)" }}>本月支出</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {pieData.map((entry) => (
                <div key={entry.categoryId} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.fill }} />
                  <span className="flex-1 truncate">{entry.name}</span>
                  <span style={{ color: "var(--text-muted)" }}>{((entry.value / expense) * 100).toFixed(0)}%</span>
                  <span className="font-semibold w-16 text-right">{formatMoney(entry.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-[16px] p-4" style={cardStyle}>
        <h2 className="text-[13px] font-bold mb-3">近 6 個月趨勢</h2>
        <div className="flex rounded-full p-1 mb-3" style={{ background: "var(--input-bg)" }}>
          {[
            { v: "income" as const, label: "收入" },
            { v: "expense" as const, label: "支出" },
            { v: "balance" as const, label: "結餘" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setTrendMode(opt.v)}
              className="flex-1 py-1.5 rounded-full text-[12.5px] font-bold"
              style={
                trendMode === opt.v
                  ? { background: "var(--card-bg)", color: "var(--text)", boxShadow: "var(--shadow)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={trendColor} stopOpacity={0.35} />
                <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} width={36} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: any) => formatMoney(Number(v))} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke={trendColor}
              strokeWidth={2.5}
              fill="url(#trendFill)"
              dot={{ r: 3, fill: trendColor, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-[16px] p-4" style={cardStyle}>
        <h2 className="text-[13px] font-bold mb-3">本月前 5 大支出</h2>
        {topList.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>本月尚無紀錄</p>
        ) : (
          topList.map((tx) => {
            const cat = categoryById[tx.categoryId];
            return (
              <div key={tx.id} className="flex justify-between py-2.5 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
                <span>{cat?.icon} {tx.subitem || cat?.name}</span>
                <span className="num">{formatMoney(tx.amount)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
