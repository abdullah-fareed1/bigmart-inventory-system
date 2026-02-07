"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Password must be at least 8 characters"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ==========================================
// SIGN IN
// ==========================================

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const validatedFields = signInSchema.safeParse({ email, password });

  if (!validatedFields.success) {
    return {
      success: false,
      error: validatedFields.error.message,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password" };
        default:
          return { success: false, error: "Something went wrong" };
      }
    }
    throw error; // Re-throw for redirect errors (NextAuth uses these)
  }
}

// ==========================================
// SIGN OUT
// ==========================================

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

// ==========================================
// CHANGE PASSWORD
// ==========================================

export async function changePasswordAction(formData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  "use server";

  const validatedFields = changePasswordSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: validatedFields.error.message,
    };
  }

  try {
    // Get the first (and only) admin
    const admin = await prisma.admin.findFirst();

    if (!admin) {
      return { success: false, error: "Admin not found" };
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      formData.currentPassword,
      admin.password
    );

    if (!isValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(formData.newPassword, 10);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    console.error("Change password error:", error);
    return { success: false, error: "Failed to update password" };
  }
}