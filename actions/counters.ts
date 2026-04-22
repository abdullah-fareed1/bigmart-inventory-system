// src/actions/counters.ts
"use server";

import { prisma } from "@/lib/prisma";

type CounterType = "receipt" | "refund" | "grn" | "grn_return" | "credit_note" | "supplier_bill";

const PREFIX_MAP: Record<CounterType, string> = {
  receipt: "REC",
  refund: "REF",
  grn: "GRN",
  grn_return: "GRN-RET",
  credit_note: "CN",
  supplier_bill: "SB",
};

export async function getNextNumber(type: CounterType): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { id: type },
    update: { currentValue: { increment: 1 } },
    create: { id: type, currentValue: 1 },
  });

  const prefix = PREFIX_MAP[type];
  return `${prefix}-${String(counter.currentValue).padStart(5, "0")}`;
}