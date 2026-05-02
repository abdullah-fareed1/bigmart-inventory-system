// src/components/refunds/refund-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Loader2, RotateCcw, Package } from "lucide-react";
import { createRefund, getAlreadyRefundedQty } from "@/actions/refunds";
import { getShopSettings } from "@/actions/settings";
import { printRefundReceipt } from "@/components/receipts/refund-receipt";
import { formatCurrency, formatQuantity } from "@/lib/format";
import { getIncrementStep, getMinimumQuantity } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface TransactionItem {
  id: string;
  stockId: string;
  productName: string;
  supplierName: string;
  quantity: number;
  measuringUnit: string;
  pricePerUnit: number;
  itemDiscount: number;
  lineTotal: number;
}

interface Transaction {
  id: string;
  receiptNumber: string;
  saleDateTime: string | Date;
  paymentMethod: string;
  totalAmount: number;
  pointsEarned: number;
  customerPhone?: string | null;
  customer?: { name: string; phoneNumber: string } | null;
  items: TransactionItem[];
}

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  onRefundCreated: () => void;
}

interface ItemRefundState {
  selected: boolean;
  quantityToReturn: string;
  isRestocked: boolean;
  reason: string;
  notes: string;
  alreadyRefunded: number;
  availableQty: number;
}

// ─── Days since sale helper ────────────────────────────────────────────────

function daysSince(date: string | Date): number {
  const sale = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  return Math.floor((now.getTime() - sale.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── RefundDialog ───────────────────────────────────────────────────────────

export function RefundDialog({
  open,
  onOpenChange,
  transaction,
  onRefundCreated,
}: RefundDialogProps) {
  const [refundMethod, setRefundMethod] = useState(transaction.paymentMethod);
  const [isLoading, setIsLoading] = useState(false);
  const [itemStates, setItemStates] = useState<Record<string, ItemRefundState>>(
    {}
  );
  const [isLoadingRefunded, setIsLoadingRefunded] = useState(true);
  const [returnPolicyDays, setReturnPolicyDays] = useState(7);

  const isOverPolicyDays = daysSince(transaction.saleDateTime) > returnPolicyDays;

  // ── Load already-refunded quantities and return policy days ──────────────
  useEffect(() => {
    if (!open) return;
    setIsLoadingRefunded(true);
    
    Promise.all([
      getAlreadyRefundedQty(transaction.id),
      getShopSettings(),
    ]).then(([refundResult, settingsResult]) => {
      // Set return policy days
      if (settingsResult.success && settingsResult.data) {
        setReturnPolicyDays(settingsResult.data.returnPolicyDays || 7);
      }
      
      // Set refunded quantities
      const refundedMap = refundResult.data ?? {};
      const initial: Record<string, ItemRefundState> = {};

      for (const item of transaction.items) {
        const already = refundedMap[item.id] ?? 0;
        const available = Math.max(0, item.quantity - already);
        initial[item.id] = {
          selected: false,
          quantityToReturn: available.toString(),
          isRestocked: true,
          reason: "CHANGE_OF_MIND",
          notes: "",
          alreadyRefunded: already,
          availableQty: available,
        };
      }

      setItemStates(initial);
      setIsLoadingRefunded(false);
    });
  }, [open, transaction]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const updateItem = (
    itemId: string,
    updates: Partial<ItemRefundState>
  ) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...updates },
    }));
  };

  const selectedItems = transaction.items.filter(
    (item) => itemStates[item.id]?.selected
  );

  const totalRefund = selectedItems.reduce((sum, item) => {
    const state = itemStates[item.id];
    const qty = parseFloat(state?.quantityToReturn ?? "0") || 0;
    const proportion = item.quantity > 0 ? qty / item.quantity : 0;
    return sum + item.lineTotal * proportion;
  }, 0);

  const originalTotal = transaction.totalAmount;
  const refundProportion = originalTotal > 0 ? totalRefund / originalTotal : 0;
  const estimatedPointsDeducted = Math.floor(
    transaction.pointsEarned * refundProportion
  );

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("Select at least one item to refund");
      return;
    }

    // Validate quantities
    for (const item of selectedItems) {
      const state = itemStates[item.id];
      const qty = parseFloat(state.quantityToReturn) || 0;
      if (qty <= 0) {
        toast.error(`Enter a valid quantity for "${item.productName}"`);
        return;
      }
      if (qty > state.availableQty + 0.001) {
        toast.error(
          `Quantity for "${item.productName}" exceeds available (${state.availableQty.toFixed(2)})`
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await createRefund({
        transactionId: transaction.id,
        refundMethod,
        items: selectedItems.map((item) => {
          const state = itemStates[item.id];
          return {
            transactionItemId: item.id,
            quantityReturned: parseFloat(state.quantityToReturn),
            isRestocked: state.isRestocked,
            reason: state.reason,
            notes: state.notes || undefined,
          };
        }),
      });

      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to create refund");
        return;
      }

      toast.success(`Refund ${result.refundNumber} created successfully`);

      // Get shop settings
      const shopSettingsResult = await getShopSettings();
      const shopSettings = shopSettingsResult.success ? shopSettingsResult.data : null;

      // Print receipt
      printRefundReceipt({
        refundReceiptNumber: result.data.refundReceiptNumber,
        originalReceiptNumber: transaction.receiptNumber,
        refundDate: result.data.refundDate,
        customerName: transaction.customer?.name,
        customerPhone: transaction.customer?.phoneNumber,
        refundMethod,
        items: result.data.items.map(
          (ri: {
            productName: string;
            quantityReturned: number;
            pricePerUnit: number;
            refundAmount: number;
            isRestocked: boolean;
            reason: string;
          }) => ({
            productName: ri.productName,
            quantityReturned: ri.quantityReturned,
            measuringUnit:
              transaction.items.find(
                (i) => i.productName === ri.productName
              )?.measuringUnit ?? "m",
            pricePerUnit: ri.pricePerUnit,
            refundAmount: ri.refundAmount,
            isRestocked: ri.isRestocked,
            reason: ri.reason,
          })
        ),
        totalRefundAmount: result.data.totalRefundAmount,
        pointsDeducted: result.data.pointsDeducted,
        shopName: shopSettings?.shopName,
        shopAddress: shopSettings?.address,
        shopPhone: shopSettings?.phone,
      });

      onOpenChange(false);
      onRefundCreated();
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Process Refund — {transaction.receiptNumber}
          </DialogTitle>
          <DialogDescription>
            Select items to refund, set quantities and reasons.
          </DialogDescription>
        </DialogHeader>

        {/* 14-day warning */}
        {isOverPolicyDays && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This sale is over {returnPolicyDays} days old. The standard return policy has
              expired. Proceed only with manager approval.
            </AlertDescription>
          </Alert>
        )}

        {isLoadingRefunded ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Items list */}
            {transaction.items.map((item) => {
              const state = itemStates[item.id];
              if (!state) return null;
              const fullyRefunded = state.availableQty <= 0;

              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 space-y-3 transition-colors ${
                    state.selected
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  } ${fullyRefunded ? "opacity-50" : ""}`}
                >
                  {/* Item header */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={state.selected}
                      onCheckedChange={(checked) =>
                        updateItem(item.id, { selected: !!checked })
                      }
                      disabled={fullyRefunded}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`item-${item.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {item.productName}
                      </label>
                      <div className="text-sm text-muted-foreground">
                        {formatQuantity(item.quantity, item.measuringUnit)} ×{" "}
                        {formatCurrency(item.pricePerUnit)} ={" "}
                        {formatCurrency(item.lineTotal)}
                      </div>
                      {state.alreadyRefunded > 0 && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {formatQuantity(state.alreadyRefunded, item.measuringUnit)} already refunded
                        </Badge>
                      )}
                      {fullyRefunded && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          Fully Refunded
                        </Badge>
                      )}
                    </div>
                    <div className="text-right font-medium">
                      {formatCurrency(item.lineTotal)}
                    </div>
                  </div>

                  {/* Item controls (only when selected) */}
                  {state.selected && !fullyRefunded && (
                    <div className="ml-6 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Quantity */}
                        <div>
                          <Label className="text-xs">
                            Quantity to Return{" "}
                            <span className="text-muted-foreground">
                              (max {formatQuantity(state.availableQty, item.measuringUnit)})
                            </span>
                          </Label>
                          <div className="flex gap-1 mt-1">
                            <Input
                              type="number"
                              step={getIncrementStep(item.measuringUnit)}
                              min={getMinimumQuantity(item.measuringUnit)}
                              max={state.availableQty}
                              value={state.quantityToReturn}
                              onChange={(e) =>
                                updateItem(item.id, {
                                  quantityToReturn: e.target.value,
                                })
                              }
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateItem(item.id, {
                                  quantityToReturn:
                                    state.availableQty.toString(),
                                })
                              }
                            >
                              Max
                            </Button>
                          </div>
                        </div>

                        {/* Reason */}
                        <div>
                          <Label className="text-xs">Reason</Label>
                          <Select
                            value={state.reason}
                            onValueChange={(v) =>
                              updateItem(item.id, { reason: v })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CHANGE_OF_MIND">
                                Change of Mind
                              </SelectItem>
                              <SelectItem value="DAMAGED">Damaged</SelectItem>
                              <SelectItem value="WRONG_ITEM">
                                Wrong Item
                              </SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Restock toggle */}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`restock-${item.id}`}
                          checked={state.isRestocked}
                          onCheckedChange={(checked) =>
                            updateItem(item.id, { isRestocked: !!checked })
                          }
                        />
                        <label
                          htmlFor={`restock-${item.id}`}
                          className="text-sm cursor-pointer flex items-center gap-1"
                        >
                          <Package className="h-3.5 w-3.5" />
                          Add back to stock
                        </label>
                        {state.reason === "DAMAGED" && state.isRestocked && (
                          <Badge variant="outline" className="text-xs text-amber-600">
                            Damaged items are usually not restocked
                          </Badge>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <Label className="text-xs">Notes (optional)</Label>
                        <Textarea
                          placeholder="Additional notes..."
                          rows={2}
                          value={state.notes}
                          onChange={(e) =>
                            updateItem(item.id, { notes: e.target.value })
                          }
                          className="mt-1 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <Separator />

            {/* Refund method */}
            <div>
              <Label>Refund Method</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedItems.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="font-medium text-sm">Refund Summary</div>
                {selectedItems.map((item) => {
                  const state = itemStates[item.id];
                  const qty = parseFloat(state.quantityToReturn) || 0;
                  const proportion = item.quantity > 0 ? qty / item.quantity : 0;
                  const amt = item.lineTotal * proportion;
                  return (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.productName} ({formatQuantity(qty, item.measuringUnit)})
                      </span>
                      <span>{formatCurrency(amt)}</span>
                    </div>
                  );
                })}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Refund</span>
                  <span className="text-green-700">
                    {formatCurrency(totalRefund)}
                  </span>
                </div>
                {transaction.customerPhone && estimatedPointsDeducted > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Points to Deduct</span>
                    <span>-{estimatedPointsDeducted} pts</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || isLoadingRefunded || selectedItems.length === 0}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Process Refund ({formatCurrency(totalRefund)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}