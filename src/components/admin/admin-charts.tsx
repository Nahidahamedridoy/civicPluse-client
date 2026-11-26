"use client";

import React, { useSyncExternalStore } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { CategoryDistributionItem, MonthlyTrendItem } from "@/lib/admin-api";
import { Card } from "@heroui/react";
import { BarChart3, PieChart as PieIcon } from "lucide-react";

interface AdminChartsProps {
  monthlyTrends: MonthlyTrendItem[];
  categoryDistribution: CategoryDistributionItem[];
  isLoading?: boolean;
}

const emptySubscribe = () => () => {};

const CATEGORY_COLORS: Record<string, string> = {
  "Road Damage": "#f97316",
  Streetlight: "#eab308",
  Drainage: "#06b6d4",
  "Waste Management": "#10b981",
  Footpath: "#8b5cf6",
  "Public Infrastructure": "#3b82f6",
};

const FALLBACK_PALETTE = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6", "#06b6d4", "#eab308", "#ec4899"];

function getCategoryColor(category: string, index: number): string {
  return CATEGORY_COLORS[category] || FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

function formatMonthLabel(monthStr: string): string {
  if (!monthStr) return "";
  try {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  } catch {
    return monthStr;
  }
}

export function AdminCharts({
  monthlyTrends,
  categoryDistribution,
  isLoading = false,
}: AdminChartsProps) {
  // Prevent SSR hydration mismatch for Recharts ResponsiveContainer
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const totalCategoryIssues = categoryDistribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Monthly Trends Chart (7 cols on lg) */}
      <Card className="lg:col-span-7 border border-border bg-surface p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Monthly Incident Trends
              </h3>
              <p className="text-xs text-muted">
                Reported infrastructure incident volume over time
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 sm:h-72 flex flex-col items-center justify-center space-y-2 border border-border/40 rounded-xl bg-surface-secondary/20">
            <span className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
            <p className="text-xs text-muted">Loading trend data...</p>
          </div>
        ) : !isMounted ? (
          <div className="h-64 sm:h-72 flex items-center justify-center border border-border/40 rounded-xl bg-surface-secondary/20">
            <span className="text-xs text-muted">Initializing chart canvas...</span>
          </div>
        ) : monthlyTrends.length === 0 ? (
          <div className="h-64 sm:h-72 flex flex-col items-center justify-center space-y-2 border border-dashed border-border rounded-xl">
            <BarChart3 className="h-8 w-8 text-muted" />
            <p className="text-xs font-semibold text-foreground">No Historical Trend Data</p>
            <p className="text-[11px] text-muted">
              Monthly patterns will render once incidents are recorded across months.
            </p>
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyTrends}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-border/60"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthLabel}
                  stroke="currentColor"
                  className="text-muted text-[11px]"
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-border" }}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="currentColor"
                  className="text-muted text-[11px]"
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", className: "text-border" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                  labelFormatter={(label) => `Month: ${formatMonthLabel(String(label))}`}
                  formatter={(value: unknown) => [
                    `${value ?? 0} incidents`,
                    "Reported Volume",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#trendGradient)"
                  activeDot={{ r: 5, stroke: "#2563eb", strokeWidth: 2, fill: "#ffffff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 2. Category Distribution Chart (5 cols on lg) */}
      <Card className="lg:col-span-5 border border-border bg-surface p-5 sm:p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent/15 text-accent">
              <PieIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Category Distribution
              </h3>
              <p className="text-xs text-muted">
                Breakdown across infrastructure categories
              </p>
            </div>
          </div>
          {totalCategoryIssues > 0 && (
            <span className="text-[11px] font-mono text-muted bg-surface-secondary px-2 py-0.5 rounded-full">
              {totalCategoryIssues} total
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="h-64 sm:h-72 flex flex-col items-center justify-center space-y-2 border border-border/40 rounded-xl bg-surface-secondary/20">
            <span className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
            <p className="text-xs text-muted">Loading category breakdown...</p>
          </div>
        ) : !isMounted ? (
          <div className="h-64 sm:h-72 flex items-center justify-center border border-border/40 rounded-xl bg-surface-secondary/20">
            <span className="text-xs text-muted">Initializing chart canvas...</span>
          </div>
        ) : categoryDistribution.length === 0 ? (
          <div className="h-64 sm:h-72 flex flex-col items-center justify-center space-y-2 border border-dashed border-border rounded-xl">
            <PieIcon className="h-8 w-8 text-muted" />
            <p className="text-xs font-semibold text-foreground">No Category Records</p>
            <p className="text-[11px] text-muted">
              Category distribution will appear once issues are submitted.
            </p>
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="46%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getCategoryColor(entry.category, index)}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                    color: "var(--foreground)",
                  }}
                  formatter={(value: unknown, name: unknown) => {
                    const count = Number(value) || 0;
                    const pct =
                      totalCategoryIssues > 0
                        ? ((count / totalCategoryIssues) * 100).toFixed(1)
                        : "0";
                    return [`${count} issues (${pct}%)`, String(name)];
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-[11px] text-foreground font-medium">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
