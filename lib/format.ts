// src/lib/format.ts

import { Decimal } from "@prisma/client-runtime-utils";

// ─── Unit Classification ─────────────────────────────────────────
// Units that support decimal quantities (measured/continuous units)
// All other units are treated as whole numbers (discrete/counted units)
const DECIMAL_SUPPORTING_UNITS = new Set([
  // Length
  "metre",
  "metres",
  "meter",
  "meters",
  "m",
  "cm",
  "centimetre",
  "centimetres",
  "mm",
  "km",
  "inch",
  "inches",
  "ft",
  "feet",
  // Weight
  "kg",
  "kilogram",
  "kilograms",
  "g",
  "gram",
  "grams",
  "mg",
  "lb",
  "pound",
  "pounds",
  "oz",
  "ounce",
  "ounces",
  // Volume
  "litre",
  "litres",
  "liter",
  "liters",
  "ml",
  "gallon",
  "gallons",
  "l",
  // Area
  "sq m",
  "sqm",
  "square metre",
  "square meter",
  "sq ft",
  "square feet",
  // Other liquid/continuous
  "barrel",
  "barrels",
]);

/**
 * Check if a unit supports decimal quantities (measured units)
 */
function isDecimalUnit(unit?: string): boolean {
  if (!unit) return false;
  return DECIMAL_SUPPORTING_UNITS.has(unit.toLowerCase().trim());
}

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
 * For measured units (metres, kg, litres, etc.): Shows decimals (10.5 metres)
 * For counted units (pairs, rolls, pieces, etc.): Always shows whole numbers (18 pairs)
 *
 * Examples:
 * formatQuantity(10.50, "metres")  → "10.5 metres"
 * formatQuantity(18.00, "pair")    → "18 pair"
 * formatQuantity(10.00)            → "10"
 * formatQuantity(10.50)            → "10.5"
 */
export function formatQuantity(
  qty: number | Decimal | string,
  unit?: string
): string {
  const num = typeof qty === "string" ? parseFloat(qty) : Number(qty);
  
  if (!unit) {
    // No unit: show decimals only if needed
    return num.toFixed(2).replace(/\.?0+$/, "");
  }
  
  // Has unit: check if it's a measured unit
  if (isDecimalUnit(unit)) {
    // Measured unit: allow decimals, remove trailing zeros
    return `${num.toFixed(2).replace(/\.?0+$/, "")} ${unit}`;
  } else {
    // Counted unit: always show as whole number
    return `${Math.round(num)} ${unit}`;
  }
}

/**
 * Format phone number: 077-123-4567
 */
export function formatPhone(phone: string): string {
  if (phone.length !== 10) return phone;
  return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
}