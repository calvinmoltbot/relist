"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthData {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

export function ProfitChart({ data }: { data: MonthData[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatMonth(d.month),
  }));

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={{ stroke: "#27272a" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `\u00A3${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "8px",
              fontSize: "13px",
            }}
            labelStyle={{ color: "#e4e4e7" }}
            formatter={(value, name) => [
              `\u00A3${Number(value).toFixed(2)}`,
              String(name).charAt(0).toUpperCase() + String(name).slice(1),
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
          />
          <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
          <Bar dataKey="cost" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cost" />
          <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m, 10) - 1]} ${year.slice(2)}`;
}
