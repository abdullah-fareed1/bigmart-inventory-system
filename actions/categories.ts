"use server";

import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations/category";
import { revalidatePath } from "next/cache";

// ─── GET ALL CATEGORIES ─────────────────────────────
export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: categories };
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return { success: false, error: "Failed to fetch categories" };
  }
}

// ─── CREATE CATEGORY ────────────────────────────────
export async function createCategory(formData: { name: string }) {
  try {
    const validated = categorySchema.parse(formData);

    // Check if name already exists (case-insensitive)
    const existing = await prisma.category.findFirst({
      where: {
        name: {
          equals: validated.name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return { success: false, error: "Category already exists" };
    }

    const category = await prisma.category.create({
      data: { name: validated.name },
    });

    revalidatePath("/products");
    return { success: true, data: category };
  } catch (error) {
    console.error("Failed to create category:", error);
    return { success: false, error: "Failed to create category" };
  }
}

// ─── UPDATE CATEGORY ────────────────────────────────
export async function updateCategory(id: string, formData: { name: string }) {
  try {
    const validated = categorySchema.parse(formData);

    // Check category exists
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return { success: false, error: "Category not found" };
    }

    // Check name conflict (exclude self)
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: validated.name, mode: "insensitive" },
        id: { not: id },
      },
    });

    if (existing) {
      return { success: false, error: "Category name already exists" };
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name: validated.name },
    });

    revalidatePath("/products");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to update category:", error);
    return { success: false, error: "Failed to update category" };
  }
}

// ─── DELETE CATEGORY ────────────────────────────────
export async function deleteCategory(id: string) {
  try {
    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: id, deletedAt: null },
    });

    if (productCount > 0) {
      return {
        success: false,
        error: `Cannot delete category with ${productCount} product(s). Move or delete products first.`,
      };
    }

    await prisma.category.delete({ where: { id } });

    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete category:", error);
    return { success: false, error: "Failed to delete category" };
  }
}