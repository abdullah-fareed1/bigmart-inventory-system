// src/components/forms/stock-form.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

// ─── Schema ──────────────────────────────────────────────────────
// IMPORTANT: Using z.number() instead of z.coerce.number().
// In Zod v4, z.coerce infers the INPUT type as `unknown`, which
// causes type mismatches with @hookform/resolvers v5 + RHF v7.71.
// The string→number coercion is handled by the Input onChange
// handlers via e.target.valueAsNumber instead.

const stockFormSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  quantity: z.number({ message: "Quantity is required" }).positive("Quantity must be greater than 0"),
  measuringUnit: z.string().min(1, "Measuring unit is required"),
  buyingPricePerUnit: z
    .number({ message: "Buying price is required" })
    .positive("Buying price must be greater than 0"),
  sellingPricePerUnit: z
    .number({ message: "Selling price is required" })
    .positive("Selling price must be greater than 0"),
  paymentStatus: z.enum(["PAID", "UNPAID", "PARTIAL"]),
  amountPaid: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export type StockFormData = z.infer<typeof stockFormSchema>;

// ─── Types ───────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  primaryUnit: string;
}

interface Supplier {
  id: string;
  name: string;
  phoneNumber: string;
}

interface StockFormProps {
  products: Product[];
  suppliers: Supplier[];
  onSubmit: (data: StockFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// ─── Unit Options ────────────────────────────────────────────────

const MEASURING_UNITS = [
  "METERS",
  "YARDS",
  "GRAMS",
  "KILOGRAMS",
  "PACKETS",
  "PIECES",
];

// ─── Component ───────────────────────────────────────────────────

export function StockForm({
  products,
  suppliers,
  onSubmit,
  onCancel,
  isLoading = false,
}: StockFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<StockFormData>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: {
      productId: "",
      supplierId: "",
      quantity: undefined,
      measuringUnit: "",
      buyingPricePerUnit: undefined,
      sellingPricePerUnit: undefined,
      paymentStatus: "UNPAID",
      amountPaid: 0,
      notes: "",
    },
  });

  const watchedProductId = form.watch("productId");
  const watchedQuantity = form.watch("quantity");
  const watchedBuyingPrice = form.watch("buyingPricePerUnit");
  const watchedPaymentStatus = form.watch("paymentStatus");

  // Auto-set measuring unit when product changes
  useEffect(() => {
    if (watchedProductId) {
      const product = products.find((p) => p.id === watchedProductId);
      if (product) {
        form.setValue("measuringUnit", product.primaryUnit);
      }
    }
  }, [watchedProductId, products, form]);

  // Calculate total cost for display
  const totalCost = useMemo(() => {
    const qty = watchedQuantity || 0;
    const price = watchedBuyingPrice || 0;
    return parseFloat((qty * price).toFixed(2));
  }, [watchedQuantity, watchedBuyingPrice]);

  // Auto-set amountPaid based on payment status
  useEffect(() => {
    if (watchedPaymentStatus === "PAID") {
      form.setValue("amountPaid", totalCost);
    } else if (watchedPaymentStatus === "UNPAID") {
      form.setValue("amountPaid", 0);
    }
  }, [watchedPaymentStatus, totalCost, form]);

  // Cross-field validation + submit
  const handleSubmit = async (data: StockFormData) => {
    let hasError = false;

    // Validate: sellingPrice > buyingPrice
    if (data.sellingPricePerUnit <= data.buyingPricePerUnit) {
      form.setError("sellingPricePerUnit", {
        type: "manual",
        message: "Selling price must be greater than buying price",
      });
      hasError = true;
    }

    // Validate: partial payment requires amountPaid > 0
    if (data.paymentStatus === "PARTIAL") {
      if (!data.amountPaid || data.amountPaid <= 0) {
        form.setError("amountPaid", {
          type: "manual",
          message: "Amount paid is required for partial payment",
        });
        hasError = true;
      }
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  };

  const loading = isLoading || submitting;

  // Helper: parse number from input, return undefined for empty/NaN
  const handleNumberChange = (
    onChange: (value: number | undefined) => void
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.valueAsNumber;
      onChange(isNaN(val) ? undefined : val);
    };
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Product & Supplier Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.phoneNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={field.value ?? ""}
                    onChange={handleNumberChange(field.onChange)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="measuringUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Measuring Unit *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MEASURING_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="buyingPricePerUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buying Price (per unit) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={field.value ?? ""}
                    onChange={handleNumberChange(field.onChange)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellingPricePerUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price (per unit) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={field.value ?? ""}
                    onChange={handleNumberChange(field.onChange)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>Must be higher than buying price</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Total Cost Summary */}
        {totalCost > 0 && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(totalCost)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {watchedQuantity || 0} × {formatCurrency(watchedBuyingPrice || 0)}
              </p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Payment Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="paymentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Status *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedPaymentStatus === "PARTIAL" && (
            <FormField
              control={form.control}
              name="amountPaid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Paid *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={field.value ?? ""}
                      onChange={handleNumberChange(field.onChange)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>
                    Remaining: {formatCurrency(totalCost - (field.value || 0))}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter notes (optional)"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Stock
          </Button>
        </div>
      </form>
    </Form>
  );
}