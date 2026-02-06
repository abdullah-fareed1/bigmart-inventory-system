"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type Period = "7days" | "30days" | "12months";

interface SalesChartProps {
  data: Record<Period, { date: string; amount: number }[]>;
  isLoading?: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">
        Rs.{" "}
        {payload[0].value.toLocaleString("en-LK", {
          minimumFractionDigits: 2,
        })}
      </p>
    </div>
  );
}

export function SalesChart({ data, isLoading }: SalesChartProps) {
  const [period, setPeriod] = useState<Period>("7days");

  const chartData = data[period] ?? [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Sales Overview</CardTitle>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="h-8">
            <TabsTrigger value="7days" className="h-7 px-3 text-xs">
              7 Days
            </TabsTrigger>
            <TabsTrigger value="30days" className="h-7 px-3 text-xs">
              30 Days
            </TabsTrigger>
            <TabsTrigger value="12months" className="h-7 px-3 text-xs">
              12 Months
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <Skeleton className="h-75 w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-75 items-center justify-center text-sm text-muted-foreground">
            No sales data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}