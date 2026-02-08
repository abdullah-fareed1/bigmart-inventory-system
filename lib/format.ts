// src/lib/format.ts

import { Decimal } from "@prisma/client-runtime-utils";
/**
 * Format a number, Decimal, or string to Sri Lankan currency format.
 * Example: 1500 → "Rs. 1,500.00"
 */
export function formatCurrency(amount: number | Decimal | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return "Rs. 0.00";
  return `Rs. ${num.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a Date to the spec-required format.
 * Example: "Jan 15, 2024 2:35 PM"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a Date to just the date portion.
 * Example: "Jan 15, 2024"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a Decimal/number quantity for display.
 *
 * With unit:    formatQuantity(10.50, "METERS")  → "10.50 METERS"
 * Without unit: formatQuantity(10.00)            → "10"
 * Without unit: formatQuantity(10.50)            → "10.5"
 */
export function formatQuantity(
  qty: number | Decimal | string,
  unit?: string
): string {
  const num = typeof qty === "string" ? parseFloat(qty) : Number(qty);
  if (unit) {
    return `${num.toFixed(2)} ${unit}`;
  }
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace(/0$/, "");
}

/**
 * Format phone number: 077-123-4567
 */
export function formatPhone(phone: string): string {
  if (phone.length !== 10) return phone;
  return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
}