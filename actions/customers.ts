// src/actions/customers.ts
"use server";

import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations/customer";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────

export type CustomerWithStats = Awaited<
  ReturnType<typeof getCustomers>
>["data"] extends { customers: (infer T)[] } ? T : never;

// ─── GET CUSTOMERS (PAGINATED + FILTERED) ────────────────────────

export async function getCustomers(params?: {
  search?: string;
  membershipTier?: string;
  page?: number;
  pageSize?: number;
}) {
  try {
    const { search, membershipTier, page = 1, pageSize = 10 } = params ?? {};

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search } },
      ];
    }

    if (membershipTier) {
      where.membershipTier = membershipTier;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { transactions: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      success: true,
      data: {
        customers,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return { success: false, error: "Failed to fetch customers" };
  }
}

// ─── GET CUSTOMER BY PHONE ───────────────────────────────────────

export async function getCustomerByPhone(phoneNumber: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { phoneNumber },
      include: {
        transactions: {
          orderBy: { saleDateTime: "desc" },
          take: 10,
          select: {
            id: true,
            receiptNumber: true,
            totalAmount: true,
            pointsEarned: true,
            pointsRedeemed: true,
            saleDateTime: true,
            paymentMethod: true,
          },
        },
        pointHistory: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            pointsChange: true,
            reason: true,
            balanceAfter: true,
            createdAt: true,
            transaction: {
              select: {
                receiptNumber: true,
              },
            },
          },
        },
      },
    });

    if (!customer || customer.deletedAt) {
      return { success: false, error: "Customer not found" };
    }

    // Serialize Decimals
    const serialized = {
      ...customer,
      transactions: customer.transactions.map((t) => ({
        ...t,
        totalAmount: Number(t.totalAmount),
      })),
    };

    return { success: true, data: serialized };
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    return { success: false, error: "Failed to fetch customer" };
  }
}

// ─── CREATE CUSTOMER ─────────────────────────────────────────────

export async function createCustomer(formData: {
  phoneNumber: string;
  name: string;
  email?: string | null;
}) {
  try {
    const validated = customerSchema.parse(formData);

    // Check if phone already exists
    const existing = await prisma.customer.findUnique({
      where: { phoneNumber: validated.phoneNumber },
    });

    if (existing) {
      if (existing.deletedAt) {
        return {
          success: false,
          error:
            "A deleted customer with this phone number exists. Contact support.",
        };
      }
      return { success: false, error: "A customer with this phone number already exists" };
    }

    const customer = await prisma.customer.create({
      data: {
        phoneNumber: validated.phoneNumber,
        name: validated.name,
        email: validated.email || null,
        totalPoints: 0,
        membershipTier: "SILVER",
      },
    });

    revalidatePath("/customers");
    return { success: true, data: customer };
  } catch (error) {
    console.error("Failed to create customer:", error);
    return { success: false, error: "Failed to create customer" };
  }
}

// ─── UPDATE CUSTOMER ─────────────────────────────────────────────

export async function updateCustomer(
  phoneNumber: string,
  formData: {
    name?: string;
    email?: string | null;
    isActive?: boolean;
  }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { phoneNumber },
    });

    if (!customer || customer.deletedAt) {
      return { success: false, error: "Customer not found" };
    }

    const updated = await prisma.customer.update({
      where: { phoneNumber },
      data: {
        ...(formData.name !== undefined && { name: formData.name }),
        ...(formData.email !== undefined && { email: formData.email }),
        ...(formData.isActive !== undefined && { isActive: formData.isActive }),
      },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${phoneNumber}`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to update customer:", error);
    return { success: false, error: "Failed to update customer" };
  }
}

// ─── SEARCH CUSTOMERS (QUICK SEARCH FOR POS) ────────────────────

export async function searchCustomers(query: string, limit: number = 5) {
  try {
    if (!query || query.trim().length === 0) {
      return { success: true, data: [] };
    }

    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { phoneNumber: { contains: query } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        phoneNumber: true,
        name: true,
        totalPoints: true,
        membershipTier: true,
      },
      take: limit,
      orderBy: { name: "asc" },
    });

    return { success: true, data: customers };
  } catch (error) {
    console.error("Failed to search customers:", error);
    return { success: false, error: "Failed to search customers" };
  }
}

// ─── DELETE CUSTOMER (SOFT DELETE) ───────────────────────────────

export async function deleteCustomer(phoneNumber: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { phoneNumber },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!customer || customer.deletedAt) {
      return { success: false, error: "Customer not found" };
    }

    await prisma.customer.update({
      where: { phoneNumber },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return { success: false, error: "Failed to delete customer" };
  }
}