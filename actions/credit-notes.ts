// src/actions/credit-notes.ts
"use server";

import { prisma } from "@/lib/prisma";

// ─── Serialization ──────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function serializeCreditNote<T extends Record<string, any>>(cn: T) {
  return {
    ...cn,
    originalAmount: Number(cn.originalAmount),
    remainingAmount: Number(cn.remainingAmount),
  };
}

function serializeUsage<T extends Record<string, any>>(u: T) {
  return {
    ...u,
    amountUsed: Number(u.amountUsed),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Types ───────────────────────────────────────────────────────

export type CreditNoteWithDetails = Awaited<
  ReturnType<typeof getCreditNotesBySupplier>
>["creditNotes"][number];

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Get all credit notes for a supplier with return details and usage history.
 */
export async function getCreditNotesBySupplier(supplierId: string) {
  const rawNotes = await prisma.supplierCreditNote.findMany({
    where: { supplierId },
    include: {
      supplierReturn: {
        select: {
          returnNumber: true,
          quantityReturned: true,
          reason: true,
          returnDate: true,
          stock: {
            select: {
              grnNumber: true,
              product: { select: { name: true } },
            },
          },
        },
      },
      usages: {
        include: {
          stock: {
            select: {
              grnNumber: true,
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { usedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const creditNotes = rawNotes.map((cn) => ({
    ...serializeCreditNote(cn),
    supplierReturn: {
      ...cn.supplierReturn,
      quantityReturned: Number(cn.supplierReturn.quantityReturned),
    },
    usages: cn.usages.map((u) => serializeUsage(u)),
  }));

  return { creditNotes };
}

/**
 * Get total available (unused) credit for a supplier.
 */
export async function getAvailableCredit(supplierId: string) {
  const result = await prisma.supplierCreditNote.aggregate({
    where: {
      supplierId,
      isFullyUsed: false,
    },
    _sum: {
      remainingAmount: true,
    },
  });

  return {
    availableCredit: Number(result._sum.remainingAmount || 0),
  };
}

/**
 * Get unused credit notes for a supplier (for applying to new purchases).
 */
export async function getAvailableCreditNotes(supplierId: string) {
  const rawNotes = await prisma.supplierCreditNote.findMany({
    where: {
      supplierId,
      isFullyUsed: false,
      remainingAmount: { gt: 0 },
    },
    orderBy: { createdAt: "asc" }, // FIFO — oldest first
  });

  return {
    creditNotes: rawNotes.map((cn) => serializeCreditNote(cn)),
  };
}

/**
 * Apply credit notes to a stock purchase (FIFO).
 * Called within a Prisma transaction from createStock.
 *
 * @returns The total amount actually applied
 */
export async function applyCreditToStock(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  supplierId: string,
  stockId: string,
  amountToApply: number,
  billId?: string,
): Promise<number> {
  if (amountToApply <= 0) return 0;

  const creditNotes = await tx.supplierCreditNote.findMany({
    where: {
      supplierId,
      isFullyUsed: false,
      remainingAmount: { gt: 0 },
    },
    orderBy: { createdAt: "asc" },
  });

  let remainingToApply = amountToApply;
  let totalApplied = 0;

  for (const cn of creditNotes) {
    if (remainingToApply <= 0) break;

    const available = Number(cn.remainingAmount);
    const useAmount = Math.min(available, remainingToApply);
    const newRemaining = parseFloat((available - useAmount).toFixed(2));

    await tx.creditNoteUsage.create({
      data: {
        creditNoteId: cn.id,
        stockId,
        amountUsed: useAmount,
        billId: billId ?? null,
      },
    });

    await tx.supplierCreditNote.update({
      where: { id: cn.id },
      data: {
        remainingAmount: newRemaining,
        isFullyUsed: newRemaining <= 0,
      },
    });

    totalApplied += useAmount;
    remainingToApply -= useAmount;
  }

  return parseFloat(totalApplied.toFixed(2));
}