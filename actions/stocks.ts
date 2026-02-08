// src/actions/stocks.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getNextNumber } from "./counters";

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
  notes: z.string().optional(),
});

const recordPaymentSchema = z.object({
  stockId: z.string().min(1),
  amountPaid: z.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHECK"]),
  notes: z.string().optional(),
});

const returnStockSchema = z.object({
  stockId: z.string().min(1),
  quantityReturned: z.number().positive("Quantity must be greater than 0"),
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "EXCESS", "OTHER"]),
  refundAmount: z.number().min(0, "Refund amount cannot be negative"),
  refundMethod: z.enum(["CASH", "BANK_TRANSFER", "CREDIT_NOTE"]),
  notes: z.string().optional(),
});

// ─── Serialization Helper ────────────────────────────────────────
// Prisma returns Decimal objects for @db.Decimal fields.
// Next.js cannot serialize Decimal across Server→Client boundary.
// These helpers convert Decimal fields to plain numbers.
// Using `any` here because Prisma model types include Decimal
// which we're intentionally converting — strict typing happens
// at the function return level via the exported types.

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

/**
 * Fetch stocks with filters and pagination.
 * Serializes Decimal → number for client components.
 */
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

  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (supplierId) {
    where.supplierId = supplierId;
  }

  if (paymentStatus) {
    where.paymentStatus = paymentStatus;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

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

  // Serialize Decimal fields to plain numbers
  const stocks = rawStocks.map((s) => serializeStock(s));

  return {
    stocks,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Fetch a single stock entry with full details.
 * Serializes Decimal → number for client components.
 */
export async function getStockById(id: string) {
  const rawStock = await prisma.stock.findUnique({
    where: { id },
    include: {
      product: {
        select: { id: true, name: true, primaryUnit: true, imageUrl: true },
      },
      supplier: {
        select: { id: true, name: true, phoneNumber: true },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
      },
      supplierReturns: {
        orderBy: { returnDate: "desc" },
      },
    },
  });

  if (!rawStock) {
    return { stock: null, error: "Stock not found" };
  }

  // Serialize all Decimal fields
  const stock = {
    ...serializeStock(rawStock),
    payments: rawStock.payments.map((p) => serializePayment(p)),
    supplierReturns: rawStock.supplierReturns.map((r) => serializeReturn(r)),
  };

  return { stock };
}

/**
 * Create a new stock entry with GRN number.
 */
export async function createStock(data: z.infer<typeof createStockSchema>) {
  const parsed = createStockSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;

  // Validate selling > buying
  if (input.sellingPricePerUnit <= input.buyingPricePerUnit) {
    return { error: "Selling price must be greater than buying price" };
  }

  // Verify product exists and is active
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });
  if (!product || !product.isActive || product.deletedAt) {
    return { error: "Product not found or is inactive" };
  }

  // Verify supplier exists and is active
  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
  });
  if (!supplier || !supplier.isActive || supplier.deletedAt) {
    return { error: "Supplier not found or is inactive" };
  }

  // Calculate total cost
  const totalCost = parseFloat(
    (input.quantity * input.buyingPricePerUnit).toFixed(2)
  );

  // Determine amount paid based on payment status
  let amountPaid = 0;
  if (input.paymentStatus === "PAID") {
    amountPaid = totalCost;
  } else if (input.paymentStatus === "PARTIAL") {
    if (!input.amountPaid || input.amountPaid <= 0) {
      return { error: "Amount paid is required for partial payment" };
    }
    if (input.amountPaid >= totalCost) {
      return {
        error:
          "Partial payment amount must be less than total cost. Use PAID status instead.",
      };
    }
    amountPaid = input.amountPaid;
  }

  // Transaction: generate GRN + create stock + optional payment record
  const result = await prisma.$transaction(async (tx) => {
    const grnNumber = await getNextNumber("grn");

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
        paymentStatus: input.paymentStatus,
        amountPaid,
        totalCost,
        notes: input.notes || null,
      },
      include: {
        product: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });

    if (input.paymentStatus === "PAID" || input.paymentStatus === "PARTIAL") {
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

    return stock;
  });

  revalidatePath("/stocks");
  revalidatePath("/dashboard");

  // Serialize the result before returning
  return { stock: serializeStock(result) };
}

/**
 * Record a payment for an existing stock entry.
 */
export async function recordStockPayment(
  data: z.infer<typeof recordPaymentSchema>
) {
  const parsed = recordPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;

  const stock = await prisma.stock.findUnique({
    where: { id: input.stockId },
  });
  if (!stock) {
    return { error: "Stock not found" };
  }

  if (stock.paymentStatus === "PAID") {
    return { error: "This stock is already fully paid" };
  }

  const currentPaid = Number(stock.amountPaid);
  const newTotalPaid = parseFloat((currentPaid + input.amountPaid).toFixed(2));
  const totalCost = Number(stock.totalCost);

  if (newTotalPaid > totalCost) {
    const remaining = parseFloat((totalCost - currentPaid).toFixed(2));
    return {
      error: `Payment exceeds outstanding balance. Maximum payment: Rs. ${remaining.toFixed(2)}`,
    };
  }

  const newStatus = newTotalPaid >= totalCost ? "PAID" : "PARTIAL";

  const result = await prisma.$transaction(async (tx) => {
    await tx.stockSupplierPayment.create({
      data: {
        stockId: input.stockId,
        supplierId: stock.supplierId,
        amountPaid: input.amountPaid,
        paymentMethod: input.paymentMethod,
        notes: input.notes || null,
      },
    });

    const updatedStock = await tx.stock.update({
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

    return updatedStock;
  });

  revalidatePath(`/stocks/${input.stockId}`);
  revalidatePath("/stocks");

  return {
    stock: {
      ...serializeStock(result),
      payments: result.payments.map((p) => serializePayment(p)),
    },
  };
}

/**
 * Return stock to supplier.
 */
export async function returnStockToSupplier(
  data: z.infer<typeof returnStockSchema>
) {
  const parsed = returnStockSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;

  const stock = await prisma.stock.findUnique({
    where: { id: input.stockId },
    include: {
      product: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
  });

  if (!stock) {
    return { error: "Stock not found" };
  }

  const remaining = Number(stock.quantityRemaining);
  if (input.quantityReturned > remaining) {
    return {
      error: `Cannot return more than remaining quantity (${remaining})`,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const returnNumber = await getNextNumber("grn_return");

    const newRemaining = parseFloat(
      (remaining - input.quantityReturned).toFixed(2)
    );

    const supplierReturn = await tx.supplierReturn.create({
      data: {
        returnNumber,
        stockId: input.stockId,
        supplierId: stock.supplierId,
        productId: stock.productId,
        quantityReturned: input.quantityReturned,
        reason: input.reason,
        refundAmount: input.refundAmount,
        refundMethod: input.refundMethod,
        notes: input.notes || null,
      },
    });

    await tx.stock.update({
      where: { id: input.stockId },
      data: {
        quantityRemaining: newRemaining,
        isActive: newRemaining > 0,
      },
    });

    return supplierReturn;
  });

  revalidatePath(`/stocks/${input.stockId}`);
  revalidatePath("/stocks");
  revalidatePath("/dashboard");

  return { supplierReturn: serializeReturn(result) };
}