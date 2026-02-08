// src/actions/counters.ts
"use server";

import { prisma } from "@/lib/prisma";

type CounterType = "receipt" | "refund" | "grn" | "grn_return";

const PREFIX_MAP: Record<CounterType, string> = {
  receipt: "REC",
  refund: "REF",
  grn: "GRN",
  grn_return: "GRN-RET",
};

/**
 * Get next sequential number for a given type.
 * Uses Prisma upsert to atomically increment.
 *
 * Output examples:
 *   receipt   → REC-00001, REC-00002
 *   refund    → REF-00001, REF-00002
 *   grn       → GRN-00001, GRN-00002
 *   grn_return → GRN-RET-00001, GRN-RET-00002
 */
export async function getNextNumber(type: CounterType): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { id: type },
    update: { currentValue: { increment: 1 } },
    create: { id: type, currentValue: 1 },
  });

  const prefix = PREFIX_MAP[type];
  return `${prefix}-${String(counter.currentValue).padStart(5, "0")}`;
}