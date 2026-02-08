// src/actions/suppliers.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Validation Schemas ──────────────────────────────────────────

const createSupplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phoneNumber: z
    .string()
    .regex(/^0[0-9]{9}$/, "Phone must be 10 digits starting with 0"),
  notes: z.string().optional(),
});

const updateSupplierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phoneNumber: z
    .string()
    .regex(/^0[0-9]{9}$/, "Phone must be 10 digits starting with 0")
    .optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── Types ───────────────────────────────────────────────────────

export type SupplierWithStats = Awaited<
  ReturnType<typeof getSuppliers>
>["suppliers"][number];

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Fetch all suppliers with optional search and active filter.
 */
export async function getSuppliers(params?: {
  search?: string;
  isActive?: boolean;
}) {
  const { search, isActive } = params || {};

  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phoneNumber: { contains: search } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          stocks: true,
        },
      },
    },
  });

  return { suppliers };
}

/**
 * Get a single supplier by ID with stock summary stats.
 */
export async function getSupplierById(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      stocks: {
        where: { deletedAt: null },
        select: {
          id: true,
          isActive: true,
          totalCost: true,
          amountPaid: true,
          paymentStatus: true,
        },
      },
    },
  });

  if (!supplier) {
    return { error: "Supplier not found" };
  }

  // Calculate summary stats
  const totalStocks = supplier.stocks.length;
  const activeStocks = supplier.stocks.filter((s) => s.isActive).length;
  const totalValue = supplier.stocks.reduce(
    (sum, s) => sum + Number(s.totalCost),
    0
  );
  const totalPaid = supplier.stocks.reduce(
    (sum, s) => sum + Number(s.amountPaid),
    0
  );
  const unpaidBalance = totalValue - totalPaid;

  return {
    supplier,
    stats: { totalStocks, activeStocks, totalValue, unpaidBalance },
  };
}

/**
 * Create a new supplier.
 */
export async function createSupplier(data: z.infer<typeof createSupplierSchema>) {
  const parsed = createSupplierSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Check phone uniqueness
  const existing = await prisma.supplier.findUnique({
    where: { phoneNumber: parsed.data.phoneNumber },
  });
  if (existing) {
    if (existing.deletedAt) {
      return { error: "A deleted supplier with this phone number exists. Contact support." };
    }
    return { error: "A supplier with this phone number already exists" };
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: parsed.data.name,
      phoneNumber: parsed.data.phoneNumber,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/stocks");
  return { supplier };
}

/**
 * Update an existing supplier.
 */
export async function updateSupplier(data: z.infer<typeof updateSupplierSchema>) {
  const parsed = updateSupplierSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, ...updateData } = parsed.data;

  // Verify supplier exists
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    return { error: "Supplier not found" };
  }

  // If phone changed, check uniqueness
  if (updateData.phoneNumber && updateData.phoneNumber !== existing.phoneNumber) {
    const phoneExists = await prisma.supplier.findUnique({
      where: { phoneNumber: updateData.phoneNumber },
    });
    if (phoneExists) {
      return { error: "A supplier with this phone number already exists" };
    }
  }

  // Build clean update object (remove undefined values)
  const cleanUpdate: Record<string, unknown> = {};
  if (updateData.name !== undefined) cleanUpdate.name = updateData.name;
  if (updateData.phoneNumber !== undefined) cleanUpdate.phoneNumber = updateData.phoneNumber;
  if (updateData.notes !== undefined) cleanUpdate.notes = updateData.notes;
  if (updateData.isActive !== undefined) cleanUpdate.isActive = updateData.isActive;

  const supplier = await prisma.supplier.update({
    where: { id },
    data: cleanUpdate,
  });

  revalidatePath("/settings");
  revalidatePath("/stocks");
  return { supplier };
}

/**
 * Soft delete a supplier (set deletedAt and isActive=false).
 * Only allowed if supplier has no active stocks.
 */
export async function deleteSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      stocks: {
        where: {
          isActive: true,
          deletedAt: null,
          quantityRemaining: { gt: 0 },
        },
      },
    },
  });

  if (!supplier) {
    return { error: "Supplier not found" };
  }

  if (supplier.stocks.length > 0) {
    return { error: "Cannot delete supplier with active stock entries" };
  }

  await prisma.supplier.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/stocks");
  return { success: true };
}