"use server";

import { prisma } from "@/lib/prisma";
import { getNextNumber } from "@/actions/counters";

// ─── Types ─────────────────────────────────────────────────────────────────

interface RefundItemInput {
  transactionItemId: string;
  quantityReturned: number;
  isRestocked: boolean;
  reason: string; // DAMAGED | CHANGE_OF_MIND | WRONG_ITEM | OTHER
  notes?: string;
}

interface CreateRefundInput {
  transactionId: string;
  refundMethod: string; // CASH | CARD
  items: RefundItemInput[];
}

// ─── Serializer ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeRefund(refund: any) {
  return {
    ...refund,
    totalRefundAmount: Number(refund.totalRefundAmount),
    refundDate: refund.refundDate?.toISOString?.() ?? refund.refundDate,
    createdAt: refund.createdAt?.toISOString?.() ?? refund.createdAt,
    items: (refund.items ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => ({
        ...item,
        quantityReturned: Number(item.quantityReturned),
        pricePerUnit: Number(item.pricePerUnit),
        refundAmount: Number(item.refundAmount),
        createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
      })
    ),
  };
}

// ─── getRefundsByTransaction ────────────────────────────────────────────────

export async function getRefundsByTransaction(transactionId: string) {
  try {
    const refunds = await prisma.refund.findMany({
      where: { originalTransactionId: transactionId },
      include: { items: true },
      orderBy: { refundDate: "asc" },
    });

    return { success: true, data: refunds.map(serializeRefund) };
  } catch (error) {
    console.error("getRefundsByTransaction error:", error);
    return { success: false, error: "Failed to fetch refunds" };
  }
}

// ─── getRefundById ──────────────────────────────────────────────────────────

export async function getRefundById(refundId: string) {
  try {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        items: true,
        customer: true,
        originalTransaction: {
          select: { receiptNumber: true, totalAmount: true },
        },
      },
    });

    if (!refund) return { success: false, error: "Refund not found" };

    return { success: true, data: serializeRefund(refund) };
  } catch (error) {
    console.error("getRefundById error:", error);
    return { success: false, error: "Failed to fetch refund" };
  }
}

// ─── createRefund ───────────────────────────────────────────────────────────

export async function createRefund(input: CreateRefundInput) {
  try {
    // ── 1. Fetch original transaction with items ──────────────────────────
    const transaction = await prisma.transaction.findUnique({
      where: { id: input.transactionId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!transaction) return { success: false, error: "Transaction not found" };

    // ── 2. Validate each item ─────────────────────────────────────────────
    for (const inputItem of input.items) {
      const originalItem = transaction.items.find(
        (i) => i.id === inputItem.transactionItemId
      );
      if (!originalItem) {
        return {
          success: false,
          error: `Transaction item ${inputItem.transactionItemId} not found`,
        };
      }

      // Check that we haven't already refunded more than available
      const previouslyRefunded = await prisma.refundItem.aggregate({
        where: { originalTransactionItemId: inputItem.transactionItemId },
        _sum: { quantityReturned: true },
      });
      const alreadyRefunded = Number(
        previouslyRefunded._sum.quantityReturned ?? 0
      );
      const originalQty = Number(originalItem.quantity);
      const available = originalQty - alreadyRefunded;

      if (inputItem.quantityReturned > available + 0.001) {
        return {
          success: false,
          error: `Cannot refund ${inputItem.quantityReturned} of "${originalItem.productName}". Only ${available.toFixed(2)} available.`,
        };
      }
    }

    // ── 3. Calculate refund amounts ────────────────────────────────────────
    const refundLineItems = input.items.map((inputItem) => {
      const originalItem = transaction.items.find(
        (i) => i.id === inputItem.transactionItemId
      )!;
      const originalQty = Number(originalItem.quantity);
      const pricePerUnit = Number(originalItem.pricePerUnit);
      const itemDiscount = Number(originalItem.itemDiscount);
      const lineTotal = Number(originalItem.lineTotal);

      // proportion of this item being returned
      const proportion = inputItem.quantityReturned / originalQty;

      // refundAmount = lineTotal × proportion
      // lineTotal already accounts for item discount
      const refundAmount = parseFloat((lineTotal * proportion).toFixed(2));

      return {
        transactionItemId: inputItem.transactionItemId,
        stockId: originalItem.stockId,
        productName: originalItem.productName,
        quantityReturned: inputItem.quantityReturned,
        pricePerUnit,
        itemDiscount,
        lineTotal,
        proportion,
        refundAmount,
        isRestocked: inputItem.isRestocked,
        reason: inputItem.reason,
        notes: inputItem.notes,
      };
    });

    const totalRefundAmount = parseFloat(
      refundLineItems.reduce((sum, i) => sum + i.refundAmount, 0).toFixed(2)
    );

    // ── 4. Calculate proportional point deduction ─────────────────────────
    const originalTotal = Number(transaction.totalAmount);
    const originalPointsEarned = transaction.pointsEarned;
    const refundProportion =
      originalTotal > 0 ? totalRefundAmount / originalTotal : 0;
    const rawPointsToDeduct = Math.floor(
      originalPointsEarned * refundProportion
    );

    let actualPointsDeducted = 0;
    let customer: any = null;
    if (transaction.customerPhone && rawPointsToDeduct > 0) {
      customer = await prisma.customer.findUnique({
        where: { phoneNumber: transaction.customerPhone },
      });
      if (customer) {
        // Cannot deduct more points than customer currently has
        actualPointsDeducted = Math.min(rawPointsToDeduct, customer.totalPoints);
      }
    }

    // ── 5. Get refund number (outside transaction to avoid timeout) ────────
    const refundNumber = await getNextNumber("refund");

    // ── 6. Persist everything sequentially (Neon 5s timeout workaround) ───

    // 6a. Create the Refund record
    const refund = await prisma.refund.create({
      data: {
        refundReceiptNumber: refundNumber,
        originalTransactionId: input.transactionId,
        customerPhone: transaction.customerPhone ?? null,
        refundMethod: input.refundMethod,
        totalRefundAmount,
        pointsDeducted: actualPointsDeducted,
      },
    });

    // 6b. Create RefundItem records
    for (const item of refundLineItems) {
      await prisma.refundItem.create({
        data: {
          refundId: refund.id,
          originalTransactionItemId: item.transactionItemId,
          stockId: item.stockId,
          productName: item.productName,
          quantityReturned: item.quantityReturned,
          pricePerUnit: item.pricePerUnit,
          refundAmount: item.refundAmount,
          isRestocked: item.isRestocked,
          reason: item.reason,
          notes: item.notes ?? null,
        },
      });

      // 6c. Restock if requested
      if (item.isRestocked) {
        // Fetch current stock state and original transaction item metadata
        const [stock, transactionItem] = await Promise.all([
          prisma.stock.findUnique({ where: { id: item.stockId } }),
          prisma.transactionItem.findUnique({
            where: { id: item.transactionItemId },
            select: {
              soldInSplitUnit: true,
              splitUnitsPerWhole: true,
            },
          }),
        ]);

        if (stock) {
          const restockAmount =
            transactionItem?.soldInSplitUnit &&
            transactionItem.splitUnitsPerWhole != null &&
            Number(transactionItem.splitUnitsPerWhole) > 0
              ? parseFloat(
                  (
                    item.quantityReturned /
                    Number(transactionItem.splitUnitsPerWhole)
                  ).toFixed(6)
                )
              : item.quantityReturned;

          const newRemaining =
            Number(stock.quantityRemaining) + restockAmount;

          await prisma.stock.update({
            where: { id: item.stockId },
            data: {
              quantityRemaining: newRemaining,
              isActive: true,
            },
          });
        }
      }

      if (customer) {
        const newPoints = Math.max(
          0,
          customer.totalPoints - actualPointsDeducted
        );

        await prisma.customer.update({
          where: { phoneNumber: customer.phoneNumber },
          data: { totalPoints: newPoints },
        });

        await prisma.customerPoint.create({
          data: {
            customerPhone: customer.phoneNumber,
            transactionId: input.transactionId,
            pointsChange: -actualPointsDeducted,
            reason: `REFUND (${refundNumber})`,
            balanceAfter: newPoints,
          },
        });
      }
    }

    // ── 7. Return the completed refund ─────────────────────────────────────
    const fullRefund = await prisma.refund.findUnique({
      where: { id: refund.id },
      include: {
        items: true,
        customer: true,
        originalTransaction: {
          select: { receiptNumber: true },
        },
      },
    });

    return {
      success: true,
      data: serializeRefund(fullRefund),
      refundNumber,
    };
  } catch (error) {
    console.error("createRefund error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create refund";
    return { success: false, error: msg };
  }
}

// ─── getAlreadyRefundedQty ─────────────────────────────────────────────────
// Helper to know how much has already been refunded per item
export async function getAlreadyRefundedQty(transactionId: string) {
  try {
    const refundItems = await prisma.refundItem.findMany({
      where: {
        refund: { originalTransactionId: transactionId },
      },
      select: {
        originalTransactionItemId: true,
        quantityReturned: true,
      },
    });

    // Group by transactionItemId
    const map: Record<string, number> = {};
    for (const ri of refundItems) {
      map[ri.originalTransactionItemId] =
        (map[ri.originalTransactionItemId] ?? 0) +
        Number(ri.quantityReturned);
    }

    return { success: true, data: map };
  } catch (error) {
    console.error("getAlreadyRefundedQty error:", error);
    return { success: false, data: {} as Record<string, number> };
  }
}