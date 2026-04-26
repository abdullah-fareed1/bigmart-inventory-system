// src/actions/settings.ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================
// SCHEMAS
// ============================================

const shopSettingsSchema = z.object({
  shopName: z.string().min(2, "Shop name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  phone: z.string().regex(/^0[0-9]{9}$/, "Invalid phone number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  logoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  returnPolicyDays: z.number().int().min(1, "Return policy days must be at least 1").default(7),
});

// ============================================
// GET SHOP SETTINGS
// ============================================
export async function getShopSettings() {
  try {
    let settings = await prisma.shopSettings.findFirst();
    
    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.shopSettings.create({
        data: {
          id: "shop-settings",
          shopName: "My Textile Shop",
          address: "Enter your address",
          phone: "0000000000",
        },
      });
    }
    
    return { success: true, data: settings };
  } catch (error) {
    console.error("Get shop settings error:", error);
    return { success: false, error: "Failed to get shop settings" };
  }
}

// ============================================
// UPDATE SHOP SETTINGS
// ============================================
export async function updateShopSettings(data: {
  shopName: string;
  address: string;
  phone: string;
  email?: string;
  logoUrl?: string;
  returnPolicyDays?: number;
}) {
  try {
    // Validate
    const validated = shopSettingsSchema.parse(data);
    
    // Update or create
    const settings = await prisma.shopSettings.upsert({
      where: { id: "shop-settings" },
      update: {
        shopName: validated.shopName,
        address: validated.address,
        phone: validated.phone,
        email: validated.email || null,
        logoUrl: validated.logoUrl || null,
        returnPolicyDays: validated.returnPolicyDays,
      },
      create: {
        id: "shop-settings",
        shopName: validated.shopName,
        address: validated.address,
        phone: validated.phone,
        email: validated.email || null,
        logoUrl: validated.logoUrl || null,
        returnPolicyDays: validated.returnPolicyDays,
      },
    });
    
    revalidatePath("/settings");
    return { success: true, data: settings };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Update shop settings error:", error);
    return { success: false, error: "Failed to update shop settings" };
  }
}

// ============================================
// GET ADMIN INFO (for display)
// ============================================
export async function getAdminInfo() {
  try {
    const admin = await prisma.admin.findFirst({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    
    return { success: true, data: admin };
  } catch (error) {
    console.error("Get admin info error:", error);
    return { success: false, error: "Failed to get admin info" };
  }
}