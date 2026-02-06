"use client";

import { SalesChart } from "@/components/dashboard/sales-chart";

interface SalesChartWrapperProps {
  data: Record<
    "7days" | "30days" | "12months",
    { date: string; amount: number }[]
  >;
}

export function SalesChartWrapper({ data }: SalesChartWrapperProps) {
  return <SalesChart data={data} />;
}