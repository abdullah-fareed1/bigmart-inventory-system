// src/actions/transactions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getNextNumber } from "./counters";
import { Prisma } from "@prisma/client";

// ─── Validation Schemas ──────────────────────────────────────────

const createTransactionSchema = z.object({
  customerPhone: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        stockId: z.string().min(1),
        quantity: z.number().positive(),
        itemDiscount: z.number().min(0),
      })
    )
    .min(1, "At least one item is required"),
  cartDiscount: z.number().min(0),
  pointsRedeemed: z.number().min(0).int(),
  paymentMethod: z.enum(["CASH", "CARD"]),
  amountPaid: z.number().min(0).optional(),
});

// ─── Serialization ──────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function serializeTransaction(tx: any) {
  return {
    ...tx,
    subtotal: Number(tx.subtotal),
    totalItemDiscount: Number(tx.totalItemDiscount),
    cartDiscount: Number(tx.cartDiscount),
    pointsRedeemedValue: Number(tx.pointsRedeemedValue),
    totalAmount: Number(tx.totalAmount),
    amountPaid: tx.amountPaid ? Number(tx.amountPaid) : null,
    changeGiven: tx.changeGiven ? Number(tx.changeGiven) : null,
    items: tx.items?.map((item: any) => ({
      ...item,
      quantity: Number(item.quantity),
      pricePerUnit: Number(item.pricePerUnit),
      itemDiscount: Number(item.itemDiscount),
      lineTotal: Number(item.lineTotal),
    })),
    refunds: tx.refunds?.map((r: any) => ({
      ...r,
      totalRefundAmount: Number(r.totalRefundAmount),
      items: r.items?.map((ri: any) => ({
        ...ri,
        quantityReturned: Number(ri.quantityReturned),
        pricePerUnit: Number(ri.pricePerUnit),
        refundAmount: Number(ri.refundAmount),
      })),
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Tier Helpers ────────────────────────────────────────────────

function calculateTier(points: number): string {
  if (points >= 200) return "PLATINUM";
  if (points >= 100) return "GOLD";
  return "SILVER";
}

function tierRank(tier: string): number {
  switch (tier) {
    case "PLATINUM":
      return 3;
    case "GOLD":
      return 2;
    case "SILVER":
      return 1;
    default:
      return 0;
  }
}

// ─── GET TRANSACTIONS ────────────────────────────────────────────

export async function getTransactions(params?: {
  search?: string;
  customerPhone?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const {
      search,
      customerPhone,
      paymentMethod,
      dateFrom,
      dateTo,
      page = 1,
      pageSize = 10,
    } = params ?? {};

    const where: Prisma.TransactionWhereInput = {};

    if (search) {
      where.receiptNumber = { contains: search, mode: "insensitive" };
    }

    if (customerPhone) {
      where.customerPhone = customerPhone;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (dateFrom || dateTo) {
      where.saleDateTime = {};
      if (dateFrom) {
        where.saleDateTime.gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Set to end of day
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.saleDateTime.lte = endDate;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: {
            select: { phoneNumber: true, name: true },
          },
          _count: {
            select: { items: true, refunds: true },
          },
        },
        orderBy: { saleDateTime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    const serialized = transactions.map((tx) => ({
      ...tx,
      subtotal: Number(tx.subtotal),
      totalItemDiscount: Number(tx.totalItemDiscount),
      cartDiscount: Number(tx.cartDiscount),
      pointsRedeemedValue: Number(tx.pointsRedeemedValue),
      totalAmount: Number(tx.totalAmount),
      amountPaid: tx.amountPaid ? Number(tx.amountPaid) : null,
      changeGiven: tx.changeGiven ? Number(tx.changeGiven) : null,
    }));

    return {
      success: true,
      data: {
        transactions: serialized,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return { success: false, error: "Failed to fetch transactions" };
  }
}

// ─── GET TRANSACTION BY ID ───────────────────────────────────────

export async function getTransactionById(id: string) {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { id: true, name: true } },
            stock: { select: { id: true, grnNumber: true } },
            refundItems: {
              select: {
                id: true,
                quantityReturned: true,
              },
            },
          },
        },
        refunds: {
          include: {
            items: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!transaction) {
      return { success: false, error: "Transaction not found" };
    }

    return { success: true, data: serializeTransaction(transaction) };
  } catch (error) {
    console.error("Failed to fetch transaction:", error);
    return { success: false, error: "Failed to fetch transaction" };
  }
}

// ─── CREATE TRANSACTION ⚠️ CRITICAL ─────────────────────────────

export async function createTransaction(input: {
  customerPhone?: string | null;
  items: {
    stockId: string;
    quantity: number;
    itemDiscount: number;
  }[];
  cartDiscount: number;
  pointsRedeemed: number;
  paymentMethod: "CASH" | "CARD";
  amountPaid?: number;
}) {
  try {
    // 1. VALIDATE INPUT
    const validated = createTransactionSchema.parse(input);

    if (validated.items.length === 0) {
      return { success: false, error: "Cart is empty" };
    }

    // 2. Verify customer exists if provided
    let customer = null;
    if (validated.customerPhone) {
      customer = await prisma.customer.findUnique({
        where: { phoneNumber: validated.customerPhone },
      });
      if (!customer || !customer.isActive || customer.deletedAt) {
        return { success: false, error: "Customer not found or inactive" };
      }
    }

    // 3. Verify points if redeeming
    if (validated.pointsRedeemed > 0) {
      if (!customer) {
        return {
          success: false,
          error: "Cannot redeem points without a customer",
        };
      }
      if (validated.pointsRedeemed > customer.totalPoints) {
        return {
          success: false,
          error: `Customer only has ${customer.totalPoints} points`,
        };
      }
    }

    // 4. Fetch all stocks and validate availability with FIFO support
    const { getRelatedStocksForDeduction } = await import("@/actions/stocks");
    
    const stockIds = validated.items.map((i) => i.stockId);
    const stocks = await prisma.stock.findMany({
      where: { id: { in: stockIds } },
      include: {
        product: { select: { id: true, name: true } },
        supplier: { select: { name: true } },
      },
    });

    const stockMap = new Map(stocks.map((s) => [s.id, s]));

    // For each item, get all related stocks for FIFO validation
    const deductionPlans: Array<{
      productId: string;
      productName: string;
      supplierName: string;
      quantity: number;
      measuringUnit: string;
      pricePerUnit: number;
      deductions: Array<{ stockId: string; quantity: number }>;
    }> = [];

    for (const item of validated.items) {
      const stock = stockMap.get(item.stockId);
      if (!stock) {
        return { success: false, error: `Stock ${item.stockId} not found` };
      }

      // Get all related stocks for FIFO deduction
      const relatedResult = await getRelatedStocksForDeduction(item.stockId);
      if (relatedResult.error || !relatedResult.stocks) {
        return {
          success: false,
          error: `Cannot find related stocks for ${stock.product.name}`,
        };
      }

      // Calculate total available from all related stocks
      const totalAvailable = relatedResult.stocks.reduce(
        (sum, s) => sum + s.quantityRemaining,
        0
      );

      if (totalAvailable < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${stock.product.name}. Available: ${totalAvailable}`,
        };
      }

      // Plan deductions in FIFO order
      let quantityNeeded = item.quantity;
      const deductions: Array<{ stockId: string; quantity: number }> = [];

      for (const relatedStock of relatedResult.stocks) {
        if (quantityNeeded <= 0) break;

        const deductFromThis = Math.min(
          quantityNeeded,
          relatedStock.quantityRemaining
        );
        deductions.push({
          stockId: relatedStock.id,
          quantity: deductFromThis,
        });
        quantityNeeded -= deductFromThis;
      }

      deductionPlans.push({
        productId: stock.product.id,
        productName: stock.product.name,
        supplierName: stock.supplier.name,
        quantity: item.quantity,
        measuringUnit: stock.measuringUnit,
        pricePerUnit: Number(stock.sellingPricePerUnit),
        deductions,
      });
    }

    // 5. CALCULATE TOTALS
    let subtotal = 0;
    let totalItemDiscount = 0;

    const itemsData = validated.items.map((item) => {
      const stock = stockMap.get(item.stockId)!;
      const lineGross = parseFloat(
        (item.quantity * Number(stock.sellingPricePerUnit)).toFixed(2)
      );
      const lineNet = parseFloat((lineGross - item.itemDiscount).toFixed(2));

      subtotal += lineGross;
      totalItemDiscount += item.itemDiscount;

      return {
        stockId: item.stockId,
        productId: stock.product.id,
        productName: stock.product.name,
        supplierName: stock.supplier.name,
        quantity: item.quantity,
        measuringUnit: stock.measuringUnit,
        pricePerUnit: Number(stock.sellingPricePerUnit),
        itemDiscount: item.itemDiscount,
        lineTotal: lineNet,
      };
    });

    subtotal = parseFloat(subtotal.toFixed(2));
    totalItemDiscount = parseFloat(totalItemDiscount.toFixed(2));

    const afterItemDiscounts = parseFloat(
      (subtotal - totalItemDiscount).toFixed(2)
    );
    const afterCartDiscount = parseFloat(
      (afterItemDiscounts - validated.cartDiscount).toFixed(2)
    );

    // Points redeemed value is capped at afterCartDiscount
    const pointsRedeemedValue = Math.min(
      validated.pointsRedeemed,
      afterCartDiscount
    );
    const totalAmount = parseFloat(
      Math.max(0, afterCartDiscount - pointsRedeemedValue).toFixed(2)
    );

    // Points earned on FINAL amount: floor(totalAmount / 100)
    const pointsEarned = Math.floor(totalAmount / 100);

    // Validate cash payment
    if (validated.paymentMethod === "CASH") {
      const paid = validated.amountPaid ?? 0;
      if (paid < totalAmount) {
        return {
          success: false,
          error: `Amount paid (Rs. ${paid}) is less than total (Rs. ${totalAmount})`,
        };
      }
    }

    const changeGiven =
      validated.paymentMethod === "CASH"
        ? parseFloat(
            ((validated.amountPaid ?? totalAmount) - totalAmount).toFixed(2)
          )
        : 0;

    // 6. Generate receipt number BEFORE writes (Neon timeout prevention)
    const receiptNumber = await getNextNumber("receipt");

    // 7. SEQUENTIAL QUERIES (no $transaction wrapper — avoids Neon 5s timeout)
    // Single-store, single-user system so race conditions are negligible.

    // a. Create Transaction record
    const transaction = await prisma.transaction.create({
      data: {
        receiptNumber,
        customerPhone: validated.customerPhone || null,
        paymentMethod: validated.paymentMethod,
        subtotal,
        totalItemDiscount,
        cartDiscount: validated.cartDiscount,
        pointsRedeemed: validated.pointsRedeemed,
        pointsRedeemedValue,
        totalAmount,
        amountPaid:
          validated.paymentMethod === "CASH"
            ? (validated.amountPaid ?? totalAmount)
            : totalAmount,
        changeGiven,
        pointsEarned,
        saleDateTime: new Date(),
      },
    });

    // b. Create Transaction Items
    await prisma.transactionItem.createMany({
      data: itemsData.map((item) => ({
        transactionId: transaction.id,
        ...item,
      })),
    });

    // c. Deduct stock quantities using deduction plans (FIFO across multiple stocks)
    const allStockIdsToUpdate = new Set<string>();
    
    for (const plan of deductionPlans) {
      for (const deduction of plan.deductions) {
        await prisma.$executeRaw`
          UPDATE "Stock"
          SET "quantityRemaining" = "quantityRemaining" - ${deduction.quantity}::numeric,
              "updatedAt" = NOW()
          WHERE id = ${deduction.stockId}
          AND "quantityRemaining" >= ${deduction.quantity}::numeric
        `;
        allStockIdsToUpdate.add(deduction.stockId);
      }
    }

    // d. Mark depleted stocks as inactive
    await prisma.stock.updateMany({
      where: {
        id: { in: Array.from(allStockIdsToUpdate) },
        quantityRemaining: { lte: 0 },
      },
      data: { isActive: false },
    });

    // e. Handle customer points
    if (customer && validated.customerPhone) {
      const currentPoints = customer.totalPoints;
      let newPoints = currentPoints;

      // Deduct redeemed points
      if (validated.pointsRedeemed > 0) {
        newPoints = Math.max(0, newPoints - validated.pointsRedeemed);

        await prisma.customerPoint.create({
          data: {
            customerPhone: validated.customerPhone,
            transactionId: transaction.id,
            pointsChange: -validated.pointsRedeemed,
            reason: "REDEMPTION",
            balanceAfter: newPoints,
          },
        });
      }

      // Add earned points
      if (pointsEarned > 0) {
        newPoints += pointsEarned;

        await prisma.customerPoint.create({
          data: {
            customerPhone: validated.customerPhone,
            transactionId: transaction.id,
            pointsChange: pointsEarned,
            reason: "PURCHASE",
            balanceAfter: newPoints,
          },
        });
      }

      // Update customer total points
      await prisma.customer.update({
        where: { phoneNumber: validated.customerPhone },
        data: { totalPoints: newPoints },
      });

      // Recalculate tier (UPGRADE ONLY - never downgrade!)
      const newTier = calculateTier(newPoints);
      if (tierRank(newTier) > tierRank(customer.membershipTier)) {
        await prisma.customer.update({
          where: { phoneNumber: validated.customerPhone },
          data: { membershipTier: newTier },
        });
      }
    }

    revalidatePath("/pos");
    revalidatePath("/transactions");
    revalidatePath("/stocks");
    revalidatePath("/customers");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        id: transaction.id,
        receiptNumber: transaction.receiptNumber,
        totalAmount: Number(transaction.totalAmount),
        pointsEarned: transaction.pointsEarned,
        changeGiven: Number(transaction.changeGiven ?? 0),
      },
    };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create transaction",
    };
  }
}

// ─── SEARCH PRODUCTS FOR POS ─────────────────────────────────────

export async function searchProductsForPOS(query: string) {
  try {
    if (!query || query.trim().length === 0) {
      return { success: true, data: [] };
    }

    // Find all stocks with matching product names, GRN numbers, or external barcodes
    const stocks = await prisma.stock.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            product: {
              deletedAt: null,
              name: { contains: query, mode: "insensitive" },
            },
          },
          {
            grnNumber: { contains: query, mode: "insensitive" },
          },
          {
            externalBarcode: { contains: query, mode: "insensitive" },
          },
        ],
      },
      include: {
        product: {
          select: { id: true, name: true, primaryUnit: true, imageUrl: true },
        },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: [
        { product: { name: "asc" } },
        { suppliedDate: "asc" }, // FIFO: oldest first
      ],
    });

    // Group by (productId, supplierId, sellingPrice) and aggregate quantities
    type GroupKey = string;
    type GroupedResult = {
      productId: string;
      productName: string;
      supplierName: string;
      sellingPrice: number;
      totalQuantityRemaining: number;
      measuringUnit: string;
      imageUrl: string | null;
      isActive: boolean;
      // For POS, we pick the first stock ID in FIFO order for linking
      representativeStockId: string;
      grnNumbers: string[];
    };

    const groupMap = new Map<GroupKey, GroupedResult>();

    for (const stock of stocks) {
      const key = `${stock.productId}|${stock.supplierId}|${Number(stock.sellingPricePerUnit).toFixed(2)}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          productId: stock.product.id,
          productName: stock.product.name,
          supplierName: stock.supplier.name,
          sellingPrice: Number(stock.sellingPricePerUnit),
          totalQuantityRemaining: Number(stock.quantityRemaining),
          measuringUnit: String(stock.measuringUnit),
          imageUrl: stock.product.imageUrl,
          isActive: stock.isActive,
          representativeStockId: stock.id, // First in FIFO order
          grnNumbers: [stock.grnNumber],
        });
      } else {
        const group = groupMap.get(key)!;
        group.totalQuantityRemaining += Number(stock.quantityRemaining);
        group.grnNumbers.push(stock.grnNumber);
        // Keep the first stock ID for linking
      }
    }

    const results = Array.from(groupMap.values()).map((group) => ({
      stockId: group.representativeStockId,
      productId: group.productId,
      productName: group.productName,
      supplierName: group.supplierName,
      sellingPrice: group.sellingPrice,
      quantityRemaining: group.totalQuantityRemaining,
      measuringUnit: String(group.measuringUnit),
      imageUrl: group.imageUrl,
      isActive: group.isActive,
      isOutOfStock: group.totalQuantityRemaining <= 0,
      grnNumbers: group.grnNumbers,
      isAlternative: false,
    }));

    // EXHAUSTED GRN HANDLING: If GRN search found only out-of-stock batches, 
    // show all active batches of the same product + similar products
    const isGRNSearch = query.toUpperCase().includes("GRN");
    const allResultsOutOfStock = results.length > 0 && results.every(r => r.isOutOfStock);

    if (isGRNSearch && allResultsOutOfStock) {
      // Get product names from the out-of-stock results
      const productNames = results.map(r => r.productName);

      // Fetch all active stocks for these products
      const activeStocks = await prisma.stock.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          quantityRemaining: { gt: 0 },
          product: {
            deletedAt: null,
            name: { in: productNames },
          },
        },
        include: {
          product: {
            select: { id: true, name: true, primaryUnit: true, imageUrl: true },
          },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: [
          { product: { name: "asc" } },
          { suppliedDate: "asc" },
        ],
      });

      // Group active stocks by (productId, supplierId, sellingPrice)
      const activeGroupMap = new Map<GroupKey, GroupedResult>();

      for (const stock of activeStocks) {
        const key = `${stock.productId}|${stock.supplierId}|${Number(stock.sellingPricePerUnit).toFixed(2)}`;

        if (!activeGroupMap.has(key)) {
          activeGroupMap.set(key, {
            productId: stock.product.id,
            productName: stock.product.name,
            supplierName: stock.supplier.name,
            sellingPrice: Number(stock.sellingPricePerUnit),
            totalQuantityRemaining: Number(stock.quantityRemaining),
            measuringUnit: stock.measuringUnit,
            imageUrl: stock.product.imageUrl,
            isActive: stock.isActive,
            representativeStockId: stock.id,
            grnNumbers: [stock.grnNumber],
          });
        } else {
          const group = activeGroupMap.get(key)!;
          group.totalQuantityRemaining += Number(stock.quantityRemaining);
          group.grnNumbers.push(stock.grnNumber);
        }
      }

      const alternativeResults = Array.from(activeGroupMap.values()).map((group) => ({
        stockId: group.representativeStockId,
        productId: group.productId,
        productName: group.productName,
        supplierName: group.supplierName,
        sellingPrice: group.sellingPrice,
        quantityRemaining: group.totalQuantityRemaining,
        measuringUnit: group.measuringUnit,
        imageUrl: group.imageUrl,
        isActive: group.isActive,
        isOutOfStock: false,
        grnNumbers: group.grnNumbers,
        isAlternative: true,
      }));

      // Return out-of-stock results first, then alternatives
      return { success: true, data: [...results, ...alternativeResults] };
    }

    return { success: true, data: results };
  } catch (error) {
    console.error("Failed to search products:", error);
    return { success: false, error: "Failed to search products" };
  }
}