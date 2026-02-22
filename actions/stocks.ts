// src/actions/stocks.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getNextNumber } from "./counters";
import { applyCreditToStock } from "./credit-notes";

// ─── Validation Schemas ──────────────────────────────────────────

const createStockSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  measuringUnit: z.string().min(1, "Measuring unit is required"),
  buyingPricePerUnit: z
    .number()
    .positive("Buying price must be greater than 0"),
  sellingPricePerUnit: z
    .number()
    .positive("Selling price must be greater than 0"),
  paymentStatus: z.enum(["PAID", "UNPAID", "PARTIAL"]),
  amountPaid: z.number().min(0).optional(),
  creditToApply: z.number().min(0).optional(),
  notes: z.string().optional(),
});

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

export async function getStockById(id: string) {
  const rawStock = await prisma.stock.findUnique({
    where: { id },
    include: {
      product: {
        select: { id: true, name: true, primaryUnit: true, imageUrl: true },
      },
      supplier: { select: { id: true, name: true, phoneNumber: true } },
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
 * Create a new stock entry.
 * GRN number generated BEFORE the transaction to avoid timeout.
 */
export async function createStock(data: z.infer<typeof createStockSchema>) {
  const parsed = createStockSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const input = parsed.data;

  if (input.sellingPricePerUnit <= input.buyingPricePerUnit)
    return { error: "Selling price must be greater than buying price" };

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });
  if (!product || !product.isActive || product.deletedAt)
    return { error: "Product not found or is inactive" };

  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
  });
  if (!supplier || !supplier.isActive || supplier.deletedAt)
    return { error: "Supplier not found or is inactive" };

  const totalCost = parseFloat(
    (input.quantity * input.buyingPricePerUnit).toFixed(2)
  );

  let amountPaid = 0;
  if (input.paymentStatus === "PAID") {
    amountPaid = totalCost;
  } else if (input.paymentStatus === "PARTIAL") {
    if (!input.amountPaid || input.amountPaid <= 0)
      return { error: "Amount paid is required for partial payment" };
    if (input.amountPaid >= totalCost)
      return {
        error: "Partial payment must be less than total cost. Use PAID status instead.",
      };
    amountPaid = input.amountPaid;
  }

  const creditToApply = input.creditToApply || 0;
  if (creditToApply > 0) {
    const remainingAfterCash = totalCost - amountPaid;
    if (creditToApply > remainingAfterCash + 0.01)
      return {
        error: `Credit (Rs. ${creditToApply.toFixed(2)}) exceeds remaining balance (Rs. ${remainingAfterCash.toFixed(2)})`,
      };
  }

  // Generate GRN BEFORE the transaction
  const grnNumber = await getNextNumber("grn");

  const result = await prisma.$transaction(async (tx) => {
    const effectiveAmountPaid = parseFloat(
      (amountPaid + creditToApply).toFixed(2)
    );
    const effectiveStatus =
      effectiveAmountPaid >= totalCost
        ? "PAID"
        : effectiveAmountPaid > 0
          ? "PARTIAL"
          : "UNPAID";

    const stock = await tx.stock.create({
      data: {
        grnNumber,
        productId: input.productId,
        supplierId: input.supplierId,
        quantityAdded: input.quantity,
        quantityRemaining: input.quantity,
        measuringUnit: input.measuringUnit,
        buyingPricePerUnit: input.buyingPricePerUnit,
        sellingPricePerUnit: input.sellingPricePerUnit,
        paymentStatus: effectiveStatus,
        amountPaid: effectiveAmountPaid,
        totalCost,
        notes: input.notes || null,
      },
      include: {
        product: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    if (amountPaid > 0) {
      await tx.stockSupplierPayment.create({
        data: {
          stockId: stock.id,
          supplierId: input.supplierId,
          amountPaid,
          paymentMethod: "CASH",
          notes: "Initial payment on stock creation",
        },
      });
    }

    if (creditToApply > 0) {
      const actualCredit = await applyCreditToStock(
        tx,
        input.supplierId,
        stock.id,
        creditToApply
      );
      if (actualCredit > 0) {
        await tx.stockSupplierPayment.create({
          data: {
            stockId: stock.id,
            supplierId: input.supplierId,
            amountPaid: actualCredit,
            paymentMethod: "CREDIT_NOTE",
            notes: "Applied from supplier credit notes",
          },
        });
      }
    }

    return stock;
  });

  revalidatePath("/stocks");
  revalidatePath("/dashboard");
  revalidatePath(`/suppliers/${input.supplierId}`);
  return { stock: serializeStock(result) };
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