// src/lib/validations/customer.ts
import { z } from "zod";

export const customerSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^0[0-9]{9}$/, "Phone must be 10 digits starting with 0"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .trim(),
  email: z.string().email("Invalid email address").optional().nullable(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;