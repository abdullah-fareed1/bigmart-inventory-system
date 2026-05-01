// src/actions/stocks.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getNextNumber } from "./counters";
import { applyCreditToStock } from "./credit-notes";

// ─── Validation Schemas ──────────────────────────────────────────

// amountPaid: min(0) to allow credit-only payments
const recordPaymentSchema = z.object({
  stockId: z.string().min(1),
  amountPaid: z.number().min(0, "Amount cannot be negative"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHECK"]),
  creditToApply: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const returnStockSchema = z.object({
  stockId: z.string().min(1),
  quantityReturned: z.number().positive("Quantity must be greater than 0"),
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "EXCESS", "OTHER"]),
  refundMethod: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_NOTE", "DEBT_OFFSET"]),
  notes: z.string().optional(),
});

// ─── Serialization ──────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function serializeStock<T extends Record<string, any>>(stock: T) {
  return {
    ...stock,
    quantityAdded: Number(stock.quantityAdded),
    quantityRemaining: Number(stock.quantityRemaining),
    buyingPricePerUnit: Number(stock.buyingPricePerUnit),
    sellingPricePerUnit: Number(stock.sellingPricePerUnit),
    amountPaid: Number(stock.amountPaid),
    totalCost: Number(stock.totalCost),
  };
}

function serializePayment<T extends Record<string, any>>(payment: T) {
  return {
    ...payment,
    amountPaid: Number(payment.amountPaid),
  };
}

function serializeReturn<T extends Record<string, any>>(ret: T) {
  return {
    ...ret,
    quantityReturned: Number(ret.quantityReturned),
    refundAmount: Number(ret.refundAmount),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Types ───────────────────────────────────────────────────────

export type StockWithRelations = Awaited<
  ReturnType<typeof getStocks>
>["stocks"][number];

export type StockDetail = NonNullable<
  Awaited<ReturnType<typeof getStockById>>["stock"]
>;

// ─── Actions ─────────────────────────────────────────────────────

export async function findMergeableStock(params: {
  productId: string;
  supplierId: string;
  buyingPricePerUnit: number;
  sellingPricePerUnit: number;
  measuringUnit: string;
}): Promise<string | null> {
  // Returns the id of a matching mergeable stock, or null.
  // Mergeable criteria: same product, supplier, buying price, selling price,
  // unit, still active, and not soft-deleted.
  // Stocks can be merged regardless of their supplier bill association.
  // When multiple matches exist (shouldn't happen but just in case),
  // we pick the oldest one (suppliedDate ASC) so FIFO remains consistent.
  
  // Normalize prices to 2 decimal places for consistent comparison
  const buyingPrice = parseFloat(params.buyingPricePerUnit.toFixed(2));
  const sellingPrice = parseFloat(params.sellingPricePerUnit.toFixed(2));
  
  const existing = await prisma.stock.findFirst({
    where: {
      productId: params.productId,
      supplierId: params.supplierId,
      buyingPricePerUnit: buyingPrice,
      sellingPricePerUnit: sellingPrice,
      measuringUnit: params.measuringUnit,
      isActive: true,
      deletedAt: null,
    },
    orderBy: { suppliedDate: "asc" },
    select: { id: true },
  });
  return existing?.id ?? null;
}

export async function checkMergeableStock(params: {
  productId: string;
  supplierId: string;
  buyingPricePerUnit: number;
  sellingPricePerUnit: number;
  measuringUnit: string;
}): Promise<{
  mergeTarget: { id: string; grnNumber: string; quantityRemaining: number } | null;
}> {
  try {
    if (
      !params.productId ||
      !params.supplierId ||
      !params.buyingPricePerUnit ||
      !params.sellingPricePerUnit ||
      !params.measuringUnit
    ) {
      return { mergeTarget: null };
    }

    // Normalize prices to 2 decimal places for consistent comparison
    const buyingPrice = parseFloat(params.buyingPricePerUnit.toFixed(2));
    const sellingPrice = parseFloat(params.sellingPricePerUnit.toFixed(2));

    const existing = await prisma.stock.findFirst({
      where: {
        productId: params.productId,
        supplierId: params.supplierId,
        buyingPricePerUnit: buyingPrice,
        sellingPricePerUnit: sellingPrice,
        measuringUnit: params.measuringUnit,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { suppliedDate: "asc" },
      select: {
        id: true,
        grnNumber: true,
        quantityRemaining: true,
      },
    });

    if (!existing) return { mergeTarget: null };

    return {
      mergeTarget: {
        id: existing.id,
        grnNumber: existing.grnNumber,
        quantityRemaining: Number(existing.quantityRemaining),
      },
    };
  } catch {
    return { mergeTarget: null };
  }
}

// ─── Actions ─────────────────────────────────────────────────────

export async function getStocks(params?: {
  search?: string;
  supplierId?: string;
  paymentStatus?: string;
  isActive?: boolean;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const {
    search,
    supplierId,
    paymentStatus,
    isActive,
    lowStock,
    page = 1,
    pageSize = 20,
  } = params || {};

  const where: Record<string, unknown> = { deletedAt: null };
  if (supplierId) where.supplierId = supplierId;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (isActive !== undefined) where.isActive = isActive;
  if (lowStock) {
    where.quantityRemaining = { lt: 10 };
    where.isActive = true;
  }
  if (search) {
    where.OR = [
      { grnNumber: { contains: search, mode: "insensitive" } },
      { product: { name: { contains: search, mode: "insensitive" } } },
      { supplier: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [rawStocks, total] = await Promise.all([
    prisma.stock.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, primaryUnit: true } },
        supplier: { select: { id: true, name: true, phoneNumber: true } },
        supplierBill: {
          select: {
            id: true,
            billNumber: true,
          },
        },
      },
      orderBy: { suppliedDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stock.count({ where }),
  ]);

  return {
    stocks: rawStocks.map((s) => serializeStock(s)),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get stocks grouped by (productId, supplierId, buyingPrice, sellingPrice).
 * Returns aggregated quantities and a list of contributing stock records.
 * Used for display in stocks page, POS, alerts, etc.
 */
export async function getStocksGrouped(params?: {
  search?: string;
  supplierId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const {
    search,
    supplierId,
    isActive,
    lowStock,
    page = 1,
    pageSize = 20,
  } = params || {};

  const where: Record<string, unknown> = { deletedAt: null };
  if (supplierId) where.supplierId = supplierId;
  if (isActive !== undefined) where.isActive = isActive;

  if (search) {
    where.OR = [
      { product: { name: { contains: search, mode: "insensitive" } } },
      { supplier: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  // Fetch all matching stocks
  const allStocks = await prisma.stock.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, primaryUnit: true } },
      supplier: { select: { id: true, name: true, phoneNumber: true } },
      supplierBill: {
        select: {
          id: true,
          billNumber: true,
        },
      },
    },
    orderBy: { suppliedDate: "desc" },
  });

  // Group by (productId, supplierId, buyingPrice, sellingPrice)
  type GroupKey = string;
  type GroupedEntry = {
    productId: string;
    product: { id: string; name: string; primaryUnit: string };
    supplierId: string;
    supplier: { id: string; name: string; phoneNumber: string };
    buyingPricePerUnit: number;
    sellingPricePerUnit: number;
    measuringUnit: string;
    totalQuantityAdded: number;
    totalQuantityRemaining: number;
    totalCost: number;
    isActive: boolean;
    stocks: Array<{
      id: string;
      grnNumber: string;
      quantityAdded: number;
      quantityRemaining: number;
      supplierBillId: string | null;
      supplierBill: { id: string; billNumber: string } | null;
      suppliedDate: Date;
    }>;
  };

  const groupMap = new Map<GroupKey, GroupedEntry>();

  for (const stock of allStocks) {
    const key = `${stock.productId}|${stock.supplierId}|${Number(stock.buyingPricePerUnit).toFixed(2)}|${Number(stock.sellingPricePerUnit).toFixed(2)}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        productId: stock.productId,
        product: stock.product,
        supplierId: stock.supplierId,
        supplier: stock.supplier,
        buyingPricePerUnit: Number(stock.buyingPricePerUnit),
        sellingPricePerUnit: Number(stock.sellingPricePerUnit),
        measuringUnit: stock.measuringUnit,
        totalQuantityAdded: 0,
        totalQuantityRemaining: 0,
        totalCost: 0,
        isActive: stock.isActive,
        stocks: [],
      });
    }

    const group = groupMap.get(key)!;
    group.totalQuantityAdded += Number(stock.quantityAdded);
    group.totalQuantityRemaining += Number(stock.quantityRemaining);
    group.totalCost += Number(stock.totalCost);
    group.stocks.push({
      id: stock.id,
      grnNumber: stock.grnNumber,
      quantityAdded: Number(stock.quantityAdded),
      quantityRemaining: Number(stock.quantityRemaining),
      supplierBillId: stock.supplierBillId,
      supplierBill: stock.supplierBill,
      suppliedDate: stock.suppliedDate,
    });
  }

  // Filter by lowStock if needed
  let grouped = Array.from(groupMap.values());
  if (lowStock) {
    grouped = grouped.filter(
      (g) => g.totalQuantityRemaining < 10 && g.isActive
    );
  }

  // Apply pagination to the grouped results
  const total = grouped.length;
  const paginatedGroups = grouped.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return {
    groups: paginatedGroups,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getStockById(id: string) {
  const rawStock = await prisma.stock.findUnique({
    where: { id },
    include: {
      product: {
        select: { id: true, name: true, primaryUnit: true, imageUrl: true },
      },
      supplier: { select: { id: true, name: true, phoneNumber: true } },
      supplierBill: {
        select: {
          id: true,
          billNumber: true,
          paymentStatus: true,
          totalCost: true,
          amountPaid: true,
        },
      },
      payments: { orderBy: { paymentDate: "desc" } },
      supplierReturns: {
        orderBy: { returnDate: "desc" },
        include: {
          creditNote: {
            select: {
              creditNoteNumber: true,
              originalAmount: true,
              remainingAmount: true,
              isFullyUsed: true,
            },
          },
        },
      },
    },
  });

  if (!rawStock) return { stock: null, error: "Stock not found" };

  const totalRefunded = rawStock.supplierReturns.reduce(
    (sum, r) => sum + Number(r.refundAmount),
    0
  );
  const totalReturnedQty = rawStock.supplierReturns.reduce(
    (sum, r) => sum + Number(r.quantityReturned),
    0
  );

  return {
    stock: {
      ...serializeStock(rawStock),
      supplierBill: rawStock.supplierBill
        ? {
            ...rawStock.supplierBill,
            totalCost: Number(rawStock.supplierBill.totalCost),
            amountPaid: Number(rawStock.supplierBill.amountPaid),
          }
        : null,
      payments: rawStock.payments.map((p) => serializePayment(p)),
      supplierReturns: rawStock.supplierReturns.map((r) => ({
        ...serializeReturn(r),
        creditNote: r.creditNote
          ? {
              ...r.creditNote,
              originalAmount: Number(r.creditNote.originalAmount),
              remainingAmount: Number(r.creditNote.remainingAmount),
            }
          : null,
      })),
      totalRefunded: parseFloat(totalRefunded.toFixed(2)),
      totalReturnedQty: parseFloat(totalReturnedQty.toFixed(2)),
    },
  };
}

/**
 * Get all related stocks (same product, supplier, prices) for a given stock.
 * Used to show all contributing sources on the detail page.
 */
export async function getRelatedStocks(stockId: string) {
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
    select: {
      productId: true,
      supplierId: true,
      buyingPricePerUnit: true,
      sellingPricePerUnit: true,
    },
  });

  if (!stock) return { error: "Stock not found", relatedStocks: [] };

  const relatedStocks = await prisma.stock.findMany({
    where: {
      productId: stock.productId,
      supplierId: stock.supplierId,
      buyingPricePerUnit: stock.buyingPricePerUnit,
      sellingPricePerUnit: stock.sellingPricePerUnit,
      deletedAt: null,
    },
    include: {
      supplierBill: {
        select: {
          id: true,
          billNumber: true,
          paymentStatus: true,
        },
      },
    },
    orderBy: { suppliedDate: "asc" },
  });

  return {
    relatedStocks: relatedStocks.map((s) => ({
      id: s.id,
      grnNumber: s.grnNumber,
      quantityAdded: Number(s.quantityAdded),
      quantityRemaining: Number(s.quantityRemaining),
      suppliedDate: s.suppliedDate,
      supplierBill: s.supplierBill,
      isCurrentStock: s.id === stockId,
    })),
  };
}

/**
 * Get all related stocks for FIFO deduction in POS.
 * Given a stockId, returns all stocks with matching product/supplier/prices
 * ordered by suppliedDate (oldest first) for FIFO deduction.
 */
export async function getRelatedStocksForDeduction(stockId: string) {
  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
    select: {
      productId: true,
      supplierId: true,
      buyingPricePerUnit: true,
      sellingPricePerUnit: true,
    },
  });

  if (!stock) return { error: "Stock not found", stocks: [] };

  const relatedStocks = await prisma.stock.findMany({
    where: {
      productId: stock.productId,
      supplierId: stock.supplierId,
      buyingPricePerUnit: stock.buyingPricePerUnit,
      sellingPricePerUnit: stock.sellingPricePerUnit,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      quantityRemaining: true,
      grnNumber: true,
    },
    orderBy: { suppliedDate: "asc" }, // FIFO: oldest first
  });

  return {
    stocks: relatedStocks.map((s) => ({
      id: s.id,
      quantityRemaining: Number(s.quantityRemaining),
      grnNumber: s.grnNumber,
    })),
  };
}

/**
 * Record a payment for an existing stock entry.
 * Supports cash + credit note combined payment.
 * Cash can be 0 for credit-only payments.
 */
export async function recordStockPayment(
  data: z.infer<typeof recordPaymentSchema>
) {
  const parsed = recordPaymentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const input = parsed.data;

  const stock = await prisma.stock.findUnique({
    where: { id: input.stockId },
  });
  if (!stock) return { error: "Stock not found" };
  if (stock.paymentStatus === "PAID")
    return { error: "This stock is already fully paid" };

  const currentPaid = Number(stock.amountPaid);
  const totalCost = Number(stock.totalCost);
  const creditToApply = input.creditToApply || 0;
  const cashAmount = input.amountPaid;
  const totalPayment = parseFloat((cashAmount + creditToApply).toFixed(2));

  if (totalPayment <= 0)
    return { error: "Total payment must be greater than 0" };

  const maxPayable = parseFloat((totalCost - currentPaid).toFixed(2));
  if (totalPayment > maxPayable + 0.01) {
    return {
      error: `Total payment (Rs. ${totalPayment.toFixed(2)}) exceeds outstanding balance (Rs. ${maxPayable.toFixed(2)})`,
    };
  }

  // Cap at exactly the outstanding to avoid overpayment from rounding
  const actualTotal = Math.min(totalPayment, maxPayable);
  const newTotalPaid = parseFloat((currentPaid + actualTotal).toFixed(2));
  const newStatus = newTotalPaid >= totalCost ? "PAID" : "PARTIAL";

  // NO transaction wrapping — run sequentially to avoid Neon timeout
  // These are all independent writes, so atomicity isn't critical here

  // 1. Record cash/bank payment
  if (cashAmount > 0) {
    await prisma.stockSupplierPayment.create({
      data: {
        stockId: input.stockId,
        supplierId: stock.supplierId,
        amountPaid: cashAmount,
        paymentMethod: input.paymentMethod,
        notes: input.notes || null,
      },
    });
  }

  // 2. Apply credit notes (uses its own internal queries)
  if (creditToApply > 0) {
    // Get available credit notes and apply them one by one
    const creditNotes = await prisma.supplierCreditNote.findMany({
      where: {
        supplierId: stock.supplierId,
        isFullyUsed: false,
        remainingAmount: { gt: 0 },
      },
      orderBy: { createdAt: "asc" },
    });

    let remaining = creditToApply;
    let totalCreditApplied = 0;

    for (const cn of creditNotes) {
      if (remaining <= 0) break;
      const available = Number(cn.remainingAmount);
      const useAmount = Math.min(available, remaining);
      const newRemaining = parseFloat((available - useAmount).toFixed(2));

      await prisma.creditNoteUsage.create({
        data: {
          creditNoteId: cn.id,
          stockId: input.stockId,
          amountUsed: useAmount,
        },
      });

      await prisma.supplierCreditNote.update({
        where: { id: cn.id },
        data: {
          remainingAmount: newRemaining,
          isFullyUsed: newRemaining <= 0,
        },
      });

      totalCreditApplied += useAmount;
      remaining -= useAmount;
    }

    if (totalCreditApplied > 0) {
      await prisma.stockSupplierPayment.create({
        data: {
          stockId: input.stockId,
          supplierId: stock.supplierId,
          amountPaid: totalCreditApplied,
          paymentMethod: "CREDIT_NOTE",
          notes: `Applied Rs. ${totalCreditApplied.toFixed(2)} from credit notes`,
        },
      });
    }
  }

  // 3. Update stock payment status
  const result = await prisma.stock.update({
    where: { id: input.stockId },
    data: {
      amountPaid: newTotalPaid,
      paymentStatus: newStatus,
    },
    include: {
      product: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });

  revalidatePath(`/stocks/${input.stockId}`);
  revalidatePath("/stocks");
  revalidatePath(`/suppliers/${stock.supplierId}`);
  return {
    stock: {
      ...serializeStock(result),
      payments: result.payments.map((p) => serializePayment(p)),
    },
  };
}

/**
 * Return stock to supplier.
 * Counter numbers generated BEFORE transaction to avoid timeout.
 */
export async function returnStockToSupplier(
  data: z.infer<typeof returnStockSchema>
) {
  const parsed = returnStockSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const input = parsed.data;

  const stock = await prisma.stock.findUnique({
    where: { id: input.stockId },
    include: {
      product: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true, phoneNumber: true } },
    },
  });

  if (!stock) return { error: "Stock not found" };

  const remaining = Number(stock.quantityRemaining);
  if (input.quantityReturned > remaining)
    return {
      error: `Cannot return more than remaining quantity (${remaining})`,
    };

  const buyingPrice = Number(stock.buyingPricePerUnit);
  const refundAmount = parseFloat(
    (input.quantityReturned * buyingPrice).toFixed(2)
  );

  const totalCost = Number(stock.totalCost);
  const amountPaid = Number(stock.amountPaid);
  const outstandingDebt = parseFloat((totalCost - amountPaid).toFixed(2));
  const isPaid = stock.paymentStatus === "PAID";
  const userMethod = input.refundMethod;

  // Determine if credit note needed — generate number BEFORE transaction
  let needsCreditNote = false;
  if (userMethod === "CREDIT_NOTE") {
    needsCreditNote = true;
  } else if (userMethod === "DEBT_OFFSET" && refundAmount > outstandingDebt) {
    // Excess after debt offset becomes credit note
    needsCreditNote = true;
  }

  const returnNumber = await getNextNumber("grn_return");
  const cnNumber = needsCreditNote
    ? await getNextNumber("credit_note")
    : null;

  const result = await prisma.$transaction(async (tx) => {
    const newRemaining = parseFloat(
      (remaining - input.quantityReturned).toFixed(2)
    );

    let actualRefundMethod: string = userMethod;
    let creditNoteAmount: number | null = null;

    if (userMethod === "DEBT_OFFSET" && outstandingDebt > 0) {
      // ── User chose DEBT_OFFSET ──
      if (refundAmount <= outstandingDebt) {
        // Fully absorbed by debt
        const newAmountPaid = parseFloat(
          (amountPaid + refundAmount).toFixed(2)
        );
        const newStatus = newAmountPaid >= totalCost ? "PAID" : "PARTIAL";

        await tx.stock.update({
          where: { id: input.stockId },
          data: {
            quantityRemaining: newRemaining,
            isActive: newRemaining > 0,
            amountPaid: newAmountPaid,
            paymentStatus: newStatus,
          },
        });

        await tx.stockSupplierPayment.create({
          data: {
            stockId: input.stockId,
            supplierId: stock.supplierId,
            amountPaid: refundAmount,
            paymentMethod: "DEBT_OFFSET",
            notes: `Debt offset from return ${returnNumber} (${input.quantityReturned} ${stock.measuringUnit} returned)`,
          },
        });
      } else {
        // Refund > debt → wipe debt, excess becomes credit note
        creditNoteAmount = parseFloat(
          (refundAmount - outstandingDebt).toFixed(2)
        );

        await tx.stock.update({
          where: { id: input.stockId },
          data: {
            quantityRemaining: newRemaining,
            isActive: newRemaining > 0,
            amountPaid: totalCost,
            paymentStatus: "PAID",
          },
        });

        if (outstandingDebt > 0) {
          await tx.stockSupplierPayment.create({
            data: {
              stockId: input.stockId,
              supplierId: stock.supplierId,
              amountPaid: outstandingDebt,
              paymentMethod: "DEBT_OFFSET",
              notes: `Debt offset from return ${returnNumber}`,
            },
          });
        }
      }
    } else if (userMethod === "CREDIT_NOTE") {
      // ── User chose CREDIT_NOTE (works for both paid and unpaid) ──
      creditNoteAmount = refundAmount;
      await tx.stock.update({
        where: { id: input.stockId },
        data: {
          quantityRemaining: newRemaining,
          isActive: newRemaining > 0,
        },
      });
    } else {
      // ── CASH or BANK_TRANSFER ──
      await tx.stock.update({
        where: { id: input.stockId },
        data: {
          quantityRemaining: newRemaining,
          isActive: newRemaining > 0,
        },
      });
    }

    const supplierReturn = await tx.supplierReturn.create({
      data: {
        returnNumber,
        stockId: input.stockId,
        supplierId: stock.supplierId,
        productId: stock.productId,
        quantityReturned: input.quantityReturned,
        reason: input.reason,
        refundAmount,
        refundMethod: actualRefundMethod,
        notes: input.notes || null,
      },
    });

    let creditNote = null;
    if (creditNoteAmount && creditNoteAmount > 0 && cnNumber) {
      creditNote = await tx.supplierCreditNote.create({
        data: {
          creditNoteNumber: cnNumber,
          supplierId: stock.supplierId,
          supplierReturnId: supplierReturn.id,
          originalAmount: creditNoteAmount,
          remainingAmount: creditNoteAmount,
        },
      });
    }

    return { supplierReturn, creditNote };
  });

  revalidatePath(`/stocks/${input.stockId}`);
  revalidatePath("/stocks");
  revalidatePath("/dashboard");
  revalidatePath(`/suppliers/${stock.supplierId}`);

  return {
    supplierReturn: serializeReturn(result.supplierReturn),
    creditNote: result.creditNote
      ? {
          creditNoteNumber: result.creditNote.creditNoteNumber,
          originalAmount: Number(result.creditNote.originalAmount),
        }
      : null,
    refundAmount,
    refundMethod: result.supplierReturn.refundMethod,
  };
}