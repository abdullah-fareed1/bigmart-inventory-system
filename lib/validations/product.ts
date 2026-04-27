import { z } from "zod";

export const MEASURING_UNITS = [
    "YARDS",
    "METERS",
    "GRAMS",
    "KILOGRAMS",
    "PACKETS",
    "PIECES",
    "ROLLS",
    "INCHES",
    "FEET",
    "CENTIMETERS",
    "MILLIMETERS",
    "DOZENS",
    "SETS",
    "PAIRS",
    "CONES",
    "BOXES",
    "BUNDLES",
] as const;

export type MeasuringUnit = (typeof MEASURING_UNITS)[number];

export const productSchema = z.object({
    name: z
        .string()
        .min(2, "Product name must be at least 2 characters")
        .max(100, "Product name must be at most 100 characters")
        .trim(),
    description: z.string().max(500).optional().nullable(),
    categoryId: z.string().min(1, "Category is required"),
    primaryUnit: z.enum(MEASURING_UNITS, {
        error: "Please select a valid unit",
    }),
    imageUrl: z.string().trim().url().optional().or(z.literal("")).nullable(),
    minStockAlert: z
        .number()
        .int("Minimum stock alert must be a whole number")
        .min(1, "Minimum stock alert must be at least 1")
        .max(10000, "Minimum stock alert must be at most 10000")
        .optional()
        .nullable(),
});

export type ProductFormData = z.infer<typeof productSchema>;