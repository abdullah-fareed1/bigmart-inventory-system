"use client";

import { TopProducts } from "@/components/dashboard/top-products";

interface TopProductsWrapperProps {
  products: {
    name: string;
    quantity: number;
    unit: string;
    revenue: number;
  }[];
}

export function TopProductsWrapper({ products }: TopProductsWrapperProps) {
  return <TopProducts products={products} />;
}