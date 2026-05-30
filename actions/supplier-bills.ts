"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getNextNumber } from "./counters";
import { applyCreditToStock } from "./credit-notes";

// Schema for one line item in a new bill
const billLineItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  measuringUnit: z.string().min(1, "Measuring unit is required"),
  buyingPricePerUnit: z.number().positive("Buying price must be greater than 0"),
  sellingPricePerUnit: z.number().positive("Selling price must be greater than 0"),
  externalBarcode: z.string().optional(),
  notes: z.string().optional(),
  // Dual-unit selling
  canBeSplit: z.boolean().optional(),
  splitUnit: z.string().optional(),
  unitsPerWhole: z.number().optional(),
  splitSellingPrice: z.number().optional(),
});

// Schema for creating a new bill
const createSupplierBillSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  supplierInvoiceRef: z.string().optional(),
  items: z.array(billLineItemSchema).min(1, "At least one product is required"),
  paymentStatus: z.enum(["PAID", "UNPAID", "PARTIAL"]),
  amountPaid: z.number().min(0).optional(),
  creditToApply: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// Schema for recording a payment against an existing bill
const recordBillPaymentSchema = z.object({
  billId: z.string().min(1),
  amountPaid: z.number().min(0),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHECK"]),
  creditToApply: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// ─── Serialization ──────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function serializeBill<T extends Record<string, any>>(bill: T) {
  return {
    ...bill,
    totalCost: Number(bill.totalCost),
    amountPaid: Number(bill.amountPaid),
    payments: (bill.payments ?? []).map((p: any) => ({
      ...p,
      amountPaid: Number(p.amountPaid),
    })),
    stocks: (bill.stocks ?? []).map((s: any) => ({
      ...s,
      quantityAdded: Number(s.quantityAdded),
      quantityRemaining: Number(s.quantityRemaining),
      buyingPricePerUnit: Number(s.buyingPricePerUnit),
      sellingPricePerUnit: Number(s.sellingPricePerUnit),
      amountPaid: Number(s.amountPaid),
      totalCost: Number(s.totalCost),
      unitsPerWhole: s.unitsPerWhole != null ? Number(s.unitsPerWhole) : null,
      splitSellingPrice: s.splitSellingPrice != null ? Number(s.splitSellingPrice) : null,
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Actions ─────────────────────────────────────────────────────

export async function getSupplierBills(params?: {
  supplierId?: string;
  paymentStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const { supplierId, paymentStatus, search, page = 1, pageSize = 20 } = params ?? {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { deletedAt: null };

    if (supplierId) where.supplierId = supplierId;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: "insensitive" } },
        { supplierInvoiceRef: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [rawBills, total] = await Promise.all([
      prisma.supplierBill.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, phoneNumber: true } },
          _count: { select: { stocks: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supplierBill.count({ where }),
    ]);

    const bills = rawBills.map((b) => ({
      ...b,
      totalCost: Number(b.totalCost),
      amountPaid: Number(b.amountPaid),
    }));

    return {
      success: true,
      data: {
        bills,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("getSupplierBills error:", error);
    return { success: false, error: "Failed to fetch supplier bills" };
  }
}

export async function getSupplierBillById(id: string) {
  try {
    const rawBill = await prisma.supplierBill.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true, phoneNumber: true } },
        stocks: {
          where: { deletedAt: null },
          include: {
            product: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!rawBill) return { success: false, error: "Supplier bill not found" };

    return { success: true, data: serializeBill(rawBill) };
  } catch (error) {
    console.error("getSupplierBillById error:", error);
    return { success: false, error: "Failed to fetch supplier bill" };
  }
}

export async function getSupplierBillsBySupplier(supplierId: string) {
  try {
    const rawBills = await prisma.supplierBill.findMany({
      where: { supplierId, deletedAt: null },
      include: {
        _count: { select: { stocks: true } },
        payments: { orderBy: { paymentDate: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    const bills = rawBills.map((b) => ({
      ...b,
      totalCost: Number(b.totalCost),
      amountPaid: Number(b.amountPaid),
      payments: b.payments.map((p) => ({
        ...p,
        amountPaid: Number(p.amountPaid),
      })),
    }));

    return { success: true, bills };
  } catch (error) {
    console.error("getSupplierBillsBySupplier error:", error);
    return { success: false, bills: [], error: "Failed to fetch bills" };
  }
}

export async function createSupplierBill(
  data: z.infer<typeof createSupplierBillSchema>
) {
  try {
    // Step 1: Validate
    const parsed = createSupplierBillSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const input = parsed.data;

    // Step 2: Verify supplier
    const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier || !supplier.isActive || supplier.deletedAt) {
      return { success: false, error: "Supplier not found or inactive" };
    }

    // Step 3 & 4: Validate each item and compute costs
    const lineItems: Array<{
      productId: string;
      quantity: number;
      measuringUnit: string;
      buyingPricePerUnit: number;
      sellingPricePerUnit: number;
      lineCost: number;
      externalBarcode?: string;
      notes?: string;
      // Dual-unit selling
      canBeSplit?: boolean;
      splitUnit?: string;
      unitsPerWhole?: number;
      splitSellingPrice?: number;
    }> = [];

    for (const item of input.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.isActive || product.deletedAt) {
        return { success: false, error: `Product ${item.productId} not found or inactive` };
      }
      if (item.sellingPricePerUnit <= item.buyingPricePerUnit) {
        return {
          success: false,
          error: `Selling price must be greater than buying price for "${product.name}"`,
        };
      }
      const lineCost = parseFloat((item.quantity * item.buyingPricePerUnit).toFixed(2));
      lineItems.push({ ...item, lineCost });
    }

    const totalCost = parseFloat(
      lineItems.reduce((sum, i) => sum + i.lineCost, 0).toFixed(2)
    );

    // Step 5: Validate payment amounts
    let cashAmountPaid = 0;
    if (input.paymentStatus === "PAID") {
      cashAmountPaid = totalCost;
    } else if (input.paymentStatus === "PARTIAL") {
      if (!input.amountPaid || input.amountPaid <= 0) {
        return { success: false, error: "Amount paid is required for partial payment" };
      }
      if (input.amountPaid >= totalCost) {
        return { success: false, error: "Partial amount must be less than total. Use PAID instead." };
      }
      cashAmountPaid = input.amountPaid;
    }

    const creditToApply = input.creditToApply ?? 0;
    const effectiveAmountPaid = parseFloat((cashAmountPaid + creditToApply).toFixed(2));

    // Step 6: Validate credit does not exceed available balance
    if (creditToApply > 0) {
      const remaining = totalCost - cashAmountPaid;
      if (creditToApply > remaining + 0.01) {
        return {
          success: false,
          error: `Credit (Rs. ${creditToApply}) exceeds remaining balance (Rs. ${remaining.toFixed(2)})`,
        };
      }
    }

    // Recompute effective payment status after credit
    const effectivePaymentStatus =
      effectiveAmountPaid >= totalCost
        ? "PAID"
        : effectiveAmountPaid > 0
        ? "PARTIAL"
        : "UNPAID";

    // Step 7 & 8: Generate all counter numbers BEFORE the transaction
    const billNumber = await getNextNumber("supplier_bill");
    const grnNumbers: string[] = [];
    for (let i = 0; i < lineItems.length; i++) {
      grnNumbers.push(await getNextNumber("grn"));
    }

    // Step 9: Run the database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 9a: Create the SupplierBill
      const bill = await tx.supplierBill.create({
        data: {
          billNumber,
          supplierId: input.supplierId,
          supplierInvoiceRef: input.supplierInvoiceRef ?? null,
          totalCost,
          amountPaid: effectiveAmountPaid,
          paymentStatus: effectivePaymentStatus,
          notes: input.notes ?? null,
        },
      });

      // 9b: Create or merge stocks per line item
      const createdStocks: { id: string }[] = [];
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        const grnNumber = grnNumbers[i];

        // Proportional payment per stock line
        const stockAmountPaid = parseFloat(
          ((item.lineCost / totalCost) * effectiveAmountPaid).toFixed(2)
        );
        const stockPaymentStatus =
          stockAmountPaid >= item.lineCost
            ? "PAID"
            : stockAmountPaid > 0
            ? "PARTIAL"
            : "UNPAID";

        // Create new stock linked to the bill (never merge)
        // Each bill maintains its own separate stock records
        const stock = await tx.stock.create({
          data: {
            grnNumber,
            externalBarcode: item.externalBarcode ?? null,
            productId: item.productId,
            supplierId: input.supplierId,
            supplierBillId: bill.id,
            quantityAdded: item.quantity,
            quantityRemaining: item.quantity,
            measuringUnit: item.measuringUnit,
            buyingPricePerUnit: item.buyingPricePerUnit,
            sellingPricePerUnit: item.sellingPricePerUnit,
            // Persist dual-unit selling metadata
            canBeSplit: item.canBeSplit ?? false,
            splitUnit: item.splitUnit ?? null,
            unitsPerWhole: item.unitsPerWhole ?? null,
            splitSellingPrice: item.splitSellingPrice ?? null,
            paymentStatus: stockPaymentStatus,
            amountPaid: stockAmountPaid,
            totalCost: item.lineCost,
            notes: item.notes ?? null,
          },
        });
        createdStocks.push({ id: stock.id });
      }

      // 9c: Record cash payment if any
      if (cashAmountPaid > 0) {
        await tx.supplierBillPayment.create({
          data: {
            billId: bill.id,
            supplierId: input.supplierId,
            amountPaid: cashAmountPaid,
            paymentMethod: "CASH",
            notes: "Initial payment on bill creation",
          },
        });
      }

      // 9d: Apply credit notes if requested (FIFO)
      if (creditToApply > 0) {
        // Use the first stock's id as the stockId anchor for CreditNoteUsage
        const firstStockId = createdStocks[0].id;
        const actualCredit = await applyCreditToStock(
          tx,
          input.supplierId,
          firstStockId,
          creditToApply,
          bill.id,
        );
        if (actualCredit > 0) {
          await tx.supplierBillPayment.create({
            data: {
              billId: bill.id,
              supplierId: input.supplierId,
              amountPaid: actualCredit,
              paymentMethod: "CREDIT_NOTE",
              notes: "Applied from supplier credit notes",
            },
          });
        }
      }

      return bill;
    });

    // Step 10: Revalidate
    revalidatePath("/stocks");
    revalidatePath("/supplier-bills");
    revalidatePath(`/suppliers/${input.supplierId}`);
    revalidatePath("/dashboard");

    return { success: true, data: { id: result.id, billNumber: result.billNumber } };
  } catch (error) {
    console.error("createSupplierBill error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create supplier bill",
    };
  }
}

export async function recordBillPayment(
  data: z.infer<typeof recordBillPaymentSchema>
) {
  try {
    const parsed = recordBillPaymentSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const input = parsed.data;

    // Step 1: Fetch bill and verify it is not fully paid
    const bill = await prisma.supplierBill.findUnique({
      where: { id: input.billId },
      include: {
        stocks: { where: { deletedAt: null }, select: { id: true, totalCost: true } },
      },
    });
    if (!bill) return { success: false, error: "Supplier bill not found" };
    if (bill.paymentStatus === "PAID") {
      return { success: false, error: "This bill is already fully paid" };
    }

    const currentPaid = Number(bill.amountPaid);
    const totalCost = Number(bill.totalCost);
    const creditToApply = input.creditToApply ?? 0;
    const cashAmount = input.amountPaid;
    const totalPayment = parseFloat((cashAmount + creditToApply).toFixed(2));

    if (totalPayment <= 0) {
      return { success: false, error: "Total payment must be greater than 0" };
    }

    const maxPayable = parseFloat((totalCost - currentPaid).toFixed(2));
    if (totalPayment > maxPayable + 0.01) {
      return {
        success: false,
        error: `Total payment (Rs. ${totalPayment.toFixed(2)}) exceeds outstanding balance (Rs. ${maxPayable.toFixed(2)})`,
      };
    }

    const actualTotal = Math.min(totalPayment, maxPayable);
    const newTotalPaid = parseFloat((currentPaid + actualTotal).toFixed(2));
    const newStatus = newTotalPaid >= totalCost ? "PAID" : "PARTIAL";

    // Step 2: Record cash payment
    if (cashAmount > 0) {
      await prisma.supplierBillPayment.create({
        data: {
          billId: input.billId,
          supplierId: bill.supplierId,
          amountPaid: cashAmount,
          paymentMethod: input.paymentMethod,
          notes: input.notes ?? null,
        },
      });
    }

    // Step 3: Apply credit notes if requested
    if (creditToApply > 0) {
      const firstStock = bill.stocks[0];
      if (firstStock) {
        const creditNotes = await prisma.supplierCreditNote.findMany({
          where: {
            supplierId: bill.supplierId,
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
              stockId: firstStock.id,
              amountUsed: useAmount,
              billId: input.billId,
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
          await prisma.supplierBillPayment.create({
            data: {
              billId: input.billId,
              supplierId: bill.supplierId,
              amountPaid: totalCreditApplied,
              paymentMethod: "CREDIT_NOTE",
              notes: `Applied Rs. ${totalCreditApplied.toFixed(2)} from credit notes`,
            },
          });
        }
      }
    }

    // Step 4: Update bill payment status
    await prisma.supplierBill.update({
      where: { id: input.billId },
      data: { amountPaid: newTotalPaid, paymentStatus: newStatus },
    });

    // Step 5: Sync each linked stock's paymentStatus and amountPaid proportionally
    for (const stock of bill.stocks) {
      const lineCost = Number(stock.totalCost);
      const stockAmountPaid = parseFloat(
        ((lineCost / totalCost) * newTotalPaid).toFixed(2)
      );
      const stockPaymentStatus =
        stockAmountPaid >= lineCost
          ? "PAID"
          : stockAmountPaid > 0
          ? "PARTIAL"
          : "UNPAID";

      await prisma.stock.update({
        where: { id: stock.id },
        data: { amountPaid: stockAmountPaid, paymentStatus: stockPaymentStatus },
      });
    }

    // Step 6: Fetch and return updated bill
    const updatedBill = await prisma.supplierBill.findUnique({
      where: { id: input.billId },
      include: {
        supplier: { select: { id: true, name: true } },
        stocks: {
          where: { deletedAt: null },
          include: { product: { select: { id: true, name: true } } },
        },
        payments: { orderBy: { paymentDate: "desc" } },
      },
    });

    revalidatePath(`/supplier-bills/${input.billId}`);
    revalidatePath("/supplier-bills");
    revalidatePath("/stocks");
    revalidatePath(`/suppliers/${bill.supplierId}`);

    return { success: true, data: serializeBill(updatedBill!) };
  } catch (error) {
    console.error("recordBillPayment error:", error);
    return { success: false, error: "Failed to record bill payment" };
  }
}
