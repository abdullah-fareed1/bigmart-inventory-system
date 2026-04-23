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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { getAvailableCredit } from "@/actions/credit-notes";
import { checkMergeableStock } from "@/actions/stocks";

// ─── Schema ──────────────────────────────────────────────────────

const stockFormSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  quantity: z
    .number({ message: "Quantity is required" })
    .positive("Quantity must be greater than 0"),
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

export type StockFormData = z.infer<typeof stockFormSchema> & {
  creditToApply?: number;
};

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
  "ROLLS",
  "INCHES",
  "FEET",
  "CENTIMETERS",
  "MILLIMETERS",
  "DOZENS",
  "SETS",
  "PAIRS",
  "CONES",
  "BOXES",
  "BUNDLES",
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

  // Credit note state
  const [availableCredit, setAvailableCredit] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");

  // Merge preview state
  const [mergeTarget, setMergeTarget] = useState<{
    id: string;
    grnNumber: string;
    quantityRemaining: number;
  } | null>(null);
  const [isMergeChecking, setIsMergeChecking] = useState(false);

  const form = useForm<z.infer<typeof stockFormSchema>>({
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
  const watchedSupplierId = form.watch("supplierId");
  const watchedQuantity = form.watch("quantity");
  const watchedBuyingPrice = form.watch("buyingPricePerUnit");
  const watchedPaymentStatus = form.watch("paymentStatus");
  const watchedSellingPrice = form.watch("sellingPricePerUnit");
  const watchedUnit = form.watch("measuringUnit");

  // Auto-set measuring unit when product changes
  useEffect(() => {
    if (watchedProductId) {
      const product = products.find((p) => p.id === watchedProductId);
      if (product) {
        form.setValue("measuringUnit", product.primaryUnit);
      }
    }
  }, [watchedProductId, products, form]);

  // Check for mergeable stock when criteria fields change
  useEffect(() => {
    if (
      !watchedProductId ||
      !watchedSupplierId ||
      !watchedBuyingPrice ||
      !watchedSellingPrice ||
      !watchedUnit
    ) {
      setMergeTarget(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsMergeChecking(true);
      const result = await checkMergeableStock({
        productId: watchedProductId,
        supplierId: watchedSupplierId,
        buyingPricePerUnit: watchedBuyingPrice,
        sellingPricePerUnit: watchedSellingPrice,
        measuringUnit: watchedUnit,
      });
      setMergeTarget(result.mergeTarget);
      setIsMergeChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    watchedProductId,
    watchedSupplierId,
    watchedBuyingPrice,
    watchedSellingPrice,
    watchedUnit,
  ]);

  // Fetch available credit when supplier changes
  useEffect(() => {
    if (watchedSupplierId) {
      getAvailableCredit(watchedSupplierId).then((res) => {
        setAvailableCredit(res.availableCredit);
        // Reset credit usage when supplier changes
        setUseCredit(false);
        setCreditAmount("");
      });
    } else {
      setAvailableCredit(0);
      setUseCredit(false);
      setCreditAmount("");
    }
  }, [watchedSupplierId]);

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

  // Calculate credit-related values
  const creditToApply = useCredit ? parseFloat(creditAmount) || 0 : 0;
  const cashPaid = form.watch("amountPaid") || 0;
  const effectivePaid = cashPaid + creditToApply;
  const outstandingAfter = Math.max(0, totalCost - effectivePaid);

  // Max credit that can be applied
  const maxCredit = useMemo(() => {
    const remaining = totalCost - cashPaid;
    return Math.min(availableCredit, Math.max(0, remaining));
  }, [totalCost, cashPaid, availableCredit]);

  // Helper for number inputs
  const handleNumberChange =
    (onChange: (value: number | undefined) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.valueAsNumber;
      onChange(isNaN(val) ? undefined : val);
    };

  // Cross-field validation + submit
  const handleSubmit = async (data: z.infer<typeof stockFormSchema>) => {
    let hasError = false;

    if (data.sellingPricePerUnit <= data.buyingPricePerUnit) {
      form.setError("sellingPricePerUnit", {
        message: "Must be higher than buying price",
      });
      hasError = true;
    }

    if (data.paymentStatus === "PARTIAL") {
      if (!data.amountPaid || data.amountPaid <= 0) {
        form.setError("amountPaid", { message: "Required for partial payment" });
        hasError = true;
      }
      const cost = (data.quantity || 0) * (data.buyingPricePerUnit || 0);
      const totalWithCredit = (data.amountPaid || 0) + creditToApply;
      if (totalWithCredit >= cost) {
        form.setError("amountPaid", {
          message: "Cash + credit should be less than total. Use PAID status instead.",
        });
        hasError = true;
      }
    }

    // Validate credit doesn't exceed available
    if (creditToApply > availableCredit) {
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      await onSubmit({
        ...data,
        creditToApply: creditToApply > 0 ? creditToApply : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const loading = isLoading || submitting;

  // Get supplier name for credit badge
  const selectedSupplier = suppliers.find((s) => s.id === watchedSupplierId);

  // Helper to format quantity
  const formatQuantity = (qty: number, unit: string) =>
    `${qty.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Product & Supplier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.phoneNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Available Credit Badge */}
        {availableCredit > 0 && selectedSupplier && (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <span className="text-sm">
              <span className="font-medium">{selectedSupplier.name}</span> has{" "}
              <Badge variant="secondary" className="text-blue-700 bg-blue-100">
                {formatCurrency(availableCredit)}
              </Badge>{" "}
              in available credit notes
            </span>
          </div>
        )}

        {/* Quantity & Unit */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <FormLabel>Unit *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
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

        {/* Prices */}
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
                <FormDescription>
                  Must be higher than buying price
                </FormDescription>
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

        {/* Merge preview banner */}
        {mergeTarget && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ℹ️ A matching stock record already exists (<span className="font-mono font-medium">{mergeTarget.grnNumber}</span>, {formatQuantity(mergeTarget.quantityRemaining, watchedUnit)} remaining). 
              Adding this will increase the existing stock instead of creating a new entry.
            </p>
          </div>
        )}
        {isMergeChecking && (
          <p className="text-xs text-muted-foreground">Checking for existing stock...</p>
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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
                  <FormLabel>Cash Amount Paid *</FormLabel>
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
          )}
        </div>

        {/* Credit Note Application */}
        {availableCredit > 0 &&
          totalCost > 0 &&
          watchedPaymentStatus !== "PAID" && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <Label className="text-sm font-medium">
                      Apply Credit Notes
                    </Label>
                  </div>
                  <Switch
                    checked={useCredit}
                    onCheckedChange={(checked) => {
                      setUseCredit(checked);
                      if (!checked) setCreditAmount("");
                    }}
                  />
                </div>

                {useCredit && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={maxCredit}
                        placeholder="0.00"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCreditAmount(maxCredit.toFixed(2))
                        }
                      >
                        Max ({formatCurrency(maxCredit)})
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Available: {formatCurrency(availableCredit)} · Max
                      applicable: {formatCurrency(maxCredit)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {/* Payment Summary (when credit is being used) */}
        {totalCost > 0 && creditToApply > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4 space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Payment Breakdown
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Cost</span>
                <span>{formatCurrency(totalCost)}</span>
              </div>
              {cashPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cash/Bank</span>
                  <span>{formatCurrency(cashPaid)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-blue-600">
                <span>Credit Notes</span>
                <span>{formatCurrency(creditToApply)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-sm font-medium">
                <span>Remaining Due</span>
                <span
                  className={
                    outstandingAfter > 0 ? "text-destructive" : "text-green-600"
                  }
                >
                  {outstandingAfter > 0
                    ? formatCurrency(outstandingAfter)
                    : "Fully Covered"}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

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
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Buttons */}
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