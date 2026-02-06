"use client";

import { LowStockAlert } from "@/components/dashboard/low-stock-alert";

interface LowStockWrapperProps {
  items: {
    id: string;
    productName: string;
    supplierName: string;
    remaining: number;
    unit: string;
  }[];
}

export function LowStockWrapper({ items }: LowStockWrapperProps) {
  return <LowStockAlert items={items} />;
}