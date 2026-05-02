import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the increment/decrement step size based on measuring unit
 * Continuous units (length-based): 0.01
 * Discrete units (count-based): 1
 */
export function getIncrementStep(measuringUnit: string): number {
  const continuousUnits = ["METERS", "YARDS", "INCHES", "FEET", "CENTIMETERS", "MILLIMETERS"];
  const normalizedUnit = String(measuringUnit || "").toUpperCase().trim();
  return continuousUnits.includes(normalizedUnit) ? 0.01 : 1;
}

/**
 * Round a quantity to the appropriate precision based on measuring unit
 * Continuous units: round to 2 decimals
 * Discrete units: round to whole number (0 decimals)
 */
export function roundQuantity(quantity: number, measuringUnit: string): number {
  const step = getIncrementStep(measuringUnit);
  // For discrete units (step = 1), use 0 decimals. For continuous units (step = 0.01), use 2 decimals.
  const decimals = step === 0.01 ? 2 : 0;
  const rounded = parseFloat(quantity.toFixed(decimals));
  return isNaN(rounded) ? 0 : rounded;
}

/**
 * Get the minimum quantity based on measuring unit
 * Continuous units: 0.01
 * Discrete units: 1
 */
export function getMinimumQuantity(measuringUnit: string): number {
  const continuousUnits = ["METERS", "YARDS", "INCHES", "FEET", "CENTIMETERS", "MILLIMETERS"];
  const normalizedUnit = String(measuringUnit || "").toUpperCase().trim();
  return continuousUnits.includes(normalizedUnit) ? 0.01 : 1;
}
