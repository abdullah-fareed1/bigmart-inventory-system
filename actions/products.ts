"use server";

import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// ─── GET PRODUCTS (PAGINATED + FILTERED) ─────────────
export async function getProducts(params?: {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  try {
    const {
      search,
      categoryId,
      isActive,
      page = 1,
      pageSize = 10,
    } = params ?? {};

    const where: Prisma.ProductWhereInput = {
      deletedAt: null, // Exclude soft-deleted
    };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: { stocks: { where: { isActive: true, deletedAt: null } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: {
        products,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return { success: false, error: "Failed to fetch products" };
  }
}

// ─── GET PRODUCT BY ID ───────────────────────────────
export async function getProductById(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        unitConversions: true,
        stocks: {
          where: { isActive: true, deletedAt: null },
          include: { supplier: true },
          orderBy: { suppliedDate: "asc" }, // FIFO order
        },
      },
    });

    if (!product || product.deletedAt) {
      return { success: false, error: "Product not found" };
    }

    // Serialize Decimals to numbers for client components
    const serialized = {
      ...product,
      stocks: product.stocks.map((stock) => ({
        ...stock,
        quantityAdded: Number(stock.quantityAdded),
        quantityRemaining: Number(stock.quantityRemaining),
        buyingPricePerUnit: Number(stock.buyingPricePerUnit),
        sellingPricePerUnit: Number(stock.sellingPricePerUnit),
        amountPaid: Number(stock.amountPaid),
        totalCost: Number(stock.totalCost),
      })),
      unitConversions: product.unitConversions.map((uc) => ({
        ...uc,
        conversionFactor: Number(uc.conversionFactor),
      })),
    };

    return { success: true, data: serialized };
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return { success: false, error: "Failed to fetch product" };
  }
}

// ─── CREATE PRODUCT ──────────────────────────────────
export async function createProduct(formData: {
  name: string;
  description?: string | null;
  categoryId: string;
  primaryUnit: string;
  imageUrl?: string | null;
}) {
  try {
    const validated = productSchema.parse(formData);

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: validated.categoryId },
    });
    if (!category) {
      return { success: false, error: "Category not found" };
    }

    // Create product with auto unit conversion (spec: Section 7.5)
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: validated.name,
          description: validated.description ?? null,
          categoryId: validated.categoryId,
          primaryUnit: validated.primaryUnit,
          imageUrl: validated.imageUrl ?? null,
        },
        include: { category: true },
      });

      // Auto-create unit conversions for YARDS ↔ METERS
      if (validated.primaryUnit === "YARDS") {
        await tx.productUnitConversion.create({
          data: {
            productId: created.id,
            unitName: "METERS",
            conversionFactor: 0.914, // 1 yard = 0.914 meters
          },
        });
      } else if (validated.primaryUnit === "METERS") {
        await tx.productUnitConversion.create({
          data: {
            productId: created.id,
            unitName: "YARDS",
            conversionFactor: 1.094, // 1 meter = 1.094 yards
          },
        });
      }

      return created;
    });

    revalidatePath("/products");
    return { success: true, data: product };
  } catch (error) {
    console.error("Failed to create product:", error);
    return { success: false, error: "Failed to create product" };
  }
}

// ─── UPDATE PRODUCT ──────────────────────────────────
export async function updateProduct(
  id: string,
  formData: {
    name?: string;
    description?: string | null;
    categoryId?: string;
    primaryUnit?: string;
    imageUrl?: string | null;
    isActive?: boolean;
  }
) {
  try {
    // Verify product exists
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return { success: false, error: "Product not found" };
    }

    // If categoryId provided, verify it exists
    if (formData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: formData.categoryId },
      });
      if (!category) {
        return { success: false, error: "Category not found" };
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(formData.name !== undefined && { name: formData.name }),
        ...(formData.description !== undefined && {
          description: formData.description,
        }),
        ...(formData.categoryId !== undefined && {
          categoryId: formData.categoryId,
        }),
        ...(formData.primaryUnit !== undefined && {
          primaryUnit: formData.primaryUnit,
        }),
        ...(formData.imageUrl !== undefined && { imageUrl: formData.imageUrl }),
        ...(formData.isActive !== undefined && { isActive: formData.isActive }),
      },
      include: { category: true },
    });

    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return { success: true, data: product };
  } catch (error) {
    console.error("Failed to update product:", error);
    return { success: false, error: "Failed to update product" };
  }
}

// ─── DELETE PRODUCT (SOFT DELETE) ────────────────────
export async function deleteProduct(id: string) {
  try {
    const product = await prisma.product.findUnique({
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

    if (!product || product.deletedAt) {
      return { success: false, error: "Product not found" };
    }

    // Check if product has active stocks with quantity > 0
    if (product.stocks.length > 0) {
      return {
        success: false,
        error: "Cannot delete product with active stock. Deplete or return stock first.",
      };
    }

    // Soft delete: set deletedAt + isActive = false
    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete product:", error);
    return { success: false, error: "Failed to delete product" };
  }
}