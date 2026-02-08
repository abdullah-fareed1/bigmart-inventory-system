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
  buyingPricePerUnit: z.number().positive("Buying price must be greater than 0"),
  sellingPricePerUnit: z.number().positive("Selling price must be greater than 0"),
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

  const [stocks, total] = await Promise.all([
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
    stocks,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Fetch a single stock entry with full details including payment history and returns.
 */
export async function getStockById(id: string) {
  const stock = await prisma.stock.findUnique({
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

  if (!stock) {
    return { stock: null, error: "Stock not found" };
  }

  return { stock };
}

/**
 * Create a new stock entry with GRN number.
 * Uses a Prisma transaction for atomicity.
 *
 * Business logic:
 * - totalCost = quantity × buyingPricePerUnit
 * - PAID → amountPaid = totalCost (auto)
 * - UNPAID → amountPaid = 0 (auto)
 * - PARTIAL → amountPaid must be provided and < totalCost
 * - sellingPrice must be > buyingPrice
 * - Creates initial payment record if PAID or PARTIAL
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
        error: "Partial payment amount must be less than total cost. Use PAID status instead.",
      };
    }
    amountPaid = input.amountPaid;
  }
  // UNPAID → amountPaid stays 0

  // Transaction: generate GRN + create stock + optional payment record
  const result = await prisma.$transaction(async (tx) => {
    // Get next GRN number
    const grnNumber = await getNextNumber("grn");

    // Create stock entry
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

    // Create initial payment record if PAID or PARTIAL
    if (input.paymentStatus === "PAID" || input.paymentStatus === "PARTIAL") {
      await tx.stockSupplierPayment.create({
        data: {
          stockId: stock.id,
          supplierId: input.supplierId,
          amountPaid,
          paymentMethod: "CASH", // Default for initial payment
          notes: "Initial payment on stock creation",
        },
      });
    }

    return stock;
  });

  revalidatePath("/stocks");
  revalidatePath("/dashboard");
  return { stock: result };
}

/**
 * Record a payment for an existing stock entry.
 * Updates payment status to PAID if fully paid, else PARTIAL.
 */
export async function recordStockPayment(
  data: z.infer<typeof recordPaymentSchema>
) {
  const parsed = recordPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;

  // Get current stock
  const stock = await prisma.stock.findUnique({
    where: { id: input.stockId },
  });
  if (!stock) {
    return { error: "Stock not found" };
  }

  if (stock.paymentStatus === "PAID") {
    return { error: "This stock is already fully paid" };
  }

  // Calculate new total paid
  const currentPaid = Number(stock.amountPaid);
  const newTotalPaid = parseFloat((currentPaid + input.amountPaid).toFixed(2));
  const totalCost = Number(stock.totalCost);

  if (newTotalPaid > totalCost) {
    const remaining = parseFloat((totalCost - currentPaid).toFixed(2));
    return {
      error: `Payment exceeds outstanding balance. Maximum payment: Rs. ${remaining.toFixed(2)}`,
    };
  }

  // Determine new status
  const newStatus = newTotalPaid >= totalCost ? "PAID" : "PARTIAL";

  // Transaction: create payment + update stock
  const result = await prisma.$transaction(async (tx) => {
    // Create payment record
    await tx.stockSupplierPayment.create({
      data: {
        stockId: input.stockId,
        supplierId: stock.supplierId,
        amountPaid: input.amountPaid,
        paymentMethod: input.paymentMethod,
        notes: input.notes || null,
      },
    });

    // Update stock payment info
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
  return { stock: result };
}

/**
 * Return stock to supplier.
 * Creates a SupplierReturn record and decrements quantityRemaining.
 * If quantityRemaining reaches 0, marks stock as inactive.
 */
export async function returnStockToSupplier(
  data: z.infer<typeof returnStockSchema>
) {
  const parsed = returnStockSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;

  // Get stock details
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

  // Transaction: create return + update stock
  const result = await prisma.$transaction(async (tx) => {
    // Get next return number
    const returnNumber = await getNextNumber("grn_return");

    const newRemaining = parseFloat(
      (remaining - input.quantityReturned).toFixed(2)
    );

    // Create return record
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

    // Update stock
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
  return { supplierReturn: result };
}