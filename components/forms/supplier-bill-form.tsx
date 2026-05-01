"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CreditCard, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { getAvailableCredit } from "@/actions/credit-notes";

// ─── Types ───────────────────────────────────────────────────────

export type SupplierBillFormData = {
  supplierId: string;
  supplierInvoiceRef?: string;
  items: {
    productId: string;
    quantity: number;
    measuringUnit: string;
    buyingPricePerUnit: number;
    sellingPricePerUnit: number;
    notes?: string;
  }[];
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID";
  amountPaid?: number;
  creditToApply?: number;
  notes?: string;
};

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

interface SupplierBillFormProps {
  products: Product[];
  suppliers: Supplier[];
  onSubmit: (data: SupplierBillFormData) => Promise<void>;
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

export function SupplierBillForm({
  products,
  suppliers,
  onSubmit,
  onCancel,
  isLoading = false,
}: SupplierBillFormProps) {
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState("");
  const [lineItems, setLineItems] = useState([
    {
      productId: "",
      quantity: 0,
      measuringUnit: "",
      buyingPricePerUnit: 0,
      sellingPricePerUnit: 0,
      notes: "",
    },
  ]);
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "PARTIAL" | "UNPAID">("UNPAID");
  const [amountPaid, setAmountPaid] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [availableCredit, setAvailableCredit] = useState(0);
  const [billNotes, setBillNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get supplier name
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Calculate total cost
  const totalCost = useMemo(() => {
    return parseFloat(
      lineItems
        .reduce((sum, item) => sum + item.quantity * item.buyingPricePerUnit, 0)
        .toFixed(2)
    );
  }, [lineItems]);

  const creditToApply = useCredit ? parseFloat(creditAmount) || 0 : 0;
  const effectivePaid = amountPaid + creditToApply;
  const balance = Math.max(0, totalCost - effectivePaid);

  // Max credit that can be applied
  const maxCredit = useMemo(() => {
    const remaining = totalCost - amountPaid;
    return Math.min(availableCredit, Math.max(0, remaining));
  }, [totalCost, amountPaid, availableCredit]);

  // Fetch available credit when supplier changes
  useEffect(() => {
    if (selectedSupplierId) {
      getAvailableCredit(selectedSupplierId).then((res) => {
        setAvailableCredit(res.availableCredit);
        setUseCredit(false);
        setCreditAmount("");
      });
    } else {
      setAvailableCredit(0);
      setUseCredit(false);
      setCreditAmount("");
    }
  }, [selectedSupplierId]);

  // Auto-set measuring unit when product changes in a line item
  const handleLineItemChange = (
    index: number,
    field: string,
    value: unknown
  ) => {
    const newItems = [...lineItems];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (newItems[index] as any)[field] = value;

    // Auto-set measuring unit if product changed
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].measuringUnit = product.primaryUnit;
      }
    }

    setLineItems(newItems);
  };

  // Add new line item
  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: "",
        quantity: 0,
        measuringUnit: "",
        buyingPricePerUnit: 0,
        sellingPricePerUnit: 0,
        notes: "",
      },
    ]);
  };

  // Remove line item
  const handleRemoveLineItem = (index: number) => {
    const newItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newItems.length === 0 ? [{
      productId: "",
      quantity: 0,
      measuringUnit: "",
      buyingPricePerUnit: 0,
      sellingPricePerUnit: 0,
      notes: "",
    }] : newItems);
  };

  // Check if last line item is complete
  const isLastItemComplete =
    lineItems.length > 0 &&
    lineItems[lineItems.length - 1].productId &&
    lineItems[lineItems.length - 1].quantity > 0 &&
    lineItems[lineItems.length - 1].measuringUnit &&
    lineItems[lineItems.length - 1].buyingPricePerUnit > 0 &&
    lineItems[lineItems.length - 1].sellingPricePerUnit > 0;

  // Validation and submit
  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!selectedSupplierId) newErrors.supplier = "Supplier is required";
    if (lineItems.filter((item) => item.productId).length === 0) {
      newErrors.items = "At least one product is required";
    }

    // Validate each line item
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.productId) continue; // Skip empty items

      if (item.quantity <= 0) newErrors[`qty_${i}`] = "Quantity must be > 0";
      if (!item.measuringUnit) newErrors[`unit_${i}`] = "Unit is required";
      if (item.buyingPricePerUnit <= 0) {
        newErrors[`buyPrice_${i}`] = "Buying price must be > 0";
      }
      if (item.sellingPricePerUnit <= 0) {
        newErrors[`sellPrice_${i}`] = "Selling price must be > 0";
      }
      if (item.sellingPricePerUnit <= item.buyingPricePerUnit) {
        newErrors[`sellPrice_${i}`] = "Selling price must be > buying price";
      }
    }

    if (paymentStatus === "PARTIAL") {
      if (amountPaid <= 0) {
        newErrors.amountPaid = "Amount paid is required for partial payment";
      } else if (effectivePaid >= totalCost) {
        newErrors.amountPaid = "Should be less than total. Use PAID status instead.";
      }
    }

    if (creditToApply > availableCredit) {
      newErrors.creditAmount = `Exceeds available credit (${formatCurrency(availableCredit)})`;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        supplierId: selectedSupplierId,
        supplierInvoiceRef: supplierInvoiceRef || undefined,
        items: lineItems.filter((item) => item.productId),
        paymentStatus,
        amountPaid: paymentStatus === "PARTIAL" ? amountPaid : undefined,
        creditToApply: creditToApply > 0 ? creditToApply : undefined,
        notes: billNotes || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const loading = isLoading || submitting;

  return (
    <div className="space-y-4">
      {/* Supplier Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Supplier *</Label>
          <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier..." />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.phoneNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.supplier && (
            <p className="text-xs text-destructive mt-1">{errors.supplier}</p>
          )}
        </div>

        <div>
          <Label>Supplier Invoice Ref (optional)</Label>
          <Input
            placeholder="Enter supplier invoice reference..."
            value={supplierInvoiceRef}
            onChange={(e) => setSupplierInvoiceRef(e.target.value)}
          />
        </div>
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

      {/* Line Items Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-medium">Products Received *</Label>
        </div>

        {errors.items && (
          <p className="text-xs text-destructive mb-2">{errors.items}</p>
        )}

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Product</TableHead>
                <TableHead className="w-[130px]">Unit</TableHead>
                <TableHead className="w-[90px] text-right">Qty</TableHead>
                <TableHead className="w-[120px] text-right">Buy Price</TableHead>
                <TableHead className="w-[120px] text-right">Sell Price</TableHead>
                <TableHead className="w-[130px] text-right">Line Cost</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item, index) => {
                const lineCost = item.quantity * item.buyingPricePerUnit;
                return (
                  <TableRow key={index}>
                    <TableCell className="w-[200px] p-2">
                      <Select
                        value={item.productId}
                        onValueChange={(value) =>
                          handleLineItemChange(index, "productId", value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[`product_${index}`] && (
                        <p className="text-xs text-destructive mt-1">
                          {errors[`product_${index}`]}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="w-[130px] p-2">
                      <Select
                        value={item.measuringUnit}
                        onValueChange={(value) =>
                          handleLineItemChange(index, "measuringUnit", value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MEASURING_UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[`unit_${index}`] && (
                        <p className="text-xs text-destructive mt-1">
                          {errors[`unit_${index}`]}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="w-[90px] p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="w-full text-right"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "quantity",
                            e.target.valueAsNumber || 0
                          )
                        }
                      />
                      {errors[`qty_${index}`] && (
                        <p className="text-xs text-destructive mt-1">
                          {errors[`qty_${index}`]}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="w-[120px] p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="w-full text-right"
                        value={item.buyingPricePerUnit || ""}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "buyingPricePerUnit",
                            e.target.valueAsNumber || 0
                          )
                        }
                      />
                      {errors[`buyPrice_${index}`] && (
                        <p className="text-xs text-destructive mt-1">
                          {errors[`buyPrice_${index}`]}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="w-[120px] p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="w-full text-right"
                        value={item.sellingPricePerUnit || ""}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "sellingPricePerUnit",
                            e.target.valueAsNumber || 0
                          )
                        }
                      />
                      {errors[`sellPrice_${index}`] && (
                        <p className="text-xs text-destructive mt-1">
                          {errors[`sellPrice_${index}`]}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="w-[130px] text-right font-medium p-2">
                      {formatCurrency(lineCost)}
                    </TableCell>
                    <TableCell className="w-10 p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLineItem(index)}
                        disabled={lineItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddLineItem}
          disabled={!isLastItemComplete}
          className="mt-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Bill Totals */}
      {totalCost > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Cost</span>
              <span className="font-medium">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid So Far</span>
              <span className="font-medium">{formatCurrency(effectivePaid)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-medium">
              <span>Remaining</span>
              <span className={balance > 0 ? "text-destructive" : "text-green-600"}>
                {balance > 0 ? formatCurrency(balance) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Status & Amount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Payment Status *</Label>
          <Select value={paymentStatus} onValueChange={(value: any) => setPaymentStatus(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentStatus === "PARTIAL" && (
          <div>
            <Label>Cash Amount Paid *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amountPaid || ""}
              onChange={(e) => setAmountPaid(e.target.valueAsNumber || 0)}
            />
            {errors.amountPaid && (
              <p className="text-xs text-destructive mt-1">{errors.amountPaid}</p>
            )}
          </div>
        )}
      </div>

      {/* Credit Note Section */}
      {availableCredit > 0 && totalCost > 0 && paymentStatus !== "PAID" && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <Label className="text-sm font-medium">Apply Credit Notes</Label>
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
                    onClick={() => setCreditAmount(maxCredit.toFixed(2))}
                  >
                    Max ({formatCurrency(maxCredit)})
                  </Button>
                </div>
                {errors.creditAmount && (
                  <p className="text-xs text-destructive">{errors.creditAmount}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Available: {formatCurrency(availableCredit)} · Max applicable:{" "}
                  {formatCurrency(maxCredit)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <div>
        <Label>Bill Notes (optional)</Label>
        <Textarea
          placeholder="Enter notes..."
          rows={2}
          value={billNotes}
          onChange={(e) => setBillNotes(e.target.value)}
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Supplier Bill
        </Button>
      </div>
    </div>
  );
}
