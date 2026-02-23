// src/components/pos/discount-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/format";

interface ItemDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockId: string | null;
}

export function ItemDiscountDialog({
  open,
  onOpenChange,
  stockId,
}: ItemDiscountDialogProps) {
  const { items, updateItemDiscount } = useCart();
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  const item = items.find((i) => i.stockId === stockId);
  const lineGross = item ? item.quantity * item.pricePerUnit : 0;

  useEffect(() => {
    if (open && item) {
      setDiscountAmount(item.itemDiscount > 0 ? String(item.itemDiscount) : "");
      setDiscountPercent(
        item.itemDiscount > 0
          ? String(parseFloat(((item.itemDiscount / lineGross) * 100).toFixed(2)))
          : ""
      );
    }
  }, [open, item, lineGross]);

  const handleAmountChange = (val: string) => {
    setDiscountAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && lineGross > 0) {
      setDiscountPercent(
        parseFloat(((num / lineGross) * 100).toFixed(2)).toString()
      );
    } else {
      setDiscountPercent("");
    }
  };

  const handlePercentChange = (val: string) => {
    setDiscountPercent(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setDiscountAmount(parseFloat(((num / 100) * lineGross).toFixed(2)).toString());
    } else {
      setDiscountAmount("");
    }
  };

  const handleApply = () => {
    if (!stockId) return;
    const amount = parseFloat(discountAmount) || 0;
    updateItemDiscount(stockId, parseFloat(amount.toFixed(2)));
    onOpenChange(false);
  };

  const handleClear = () => {
    if (!stockId) return;
    updateItemDiscount(stockId, 0);
    setDiscountAmount("");
    setDiscountPercent("");
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Item Discount</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{item.productName}</p>
            <p>
              {item.quantity} {item.measuringUnit} ×{" "}
              {formatCurrency(item.pricePerUnit)} ={" "}
              {formatCurrency(lineGross)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount-amount">Amount (Rs.)</Label>
              <Input
                id="discount-amount"
                type="number"
                step="0.01"
                min="0"
                max={lineGross}
                value={discountAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-percent">Percentage (%)</Label>
              <Input
                id="discount-percent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => handlePercentChange(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {parseFloat(discountAmount) > 0 && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span>Original</span>
                <span>{formatCurrency(lineGross)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Discount</span>
                <span>-{formatCurrency(parseFloat(discountAmount))}</span>
              </div>
              <div className="flex justify-between font-semibold border-t mt-1 pt-1">
                <span>After Discount</span>
                <span>
                  {formatCurrency(lineGross - parseFloat(discountAmount))}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleApply}>Apply Discount</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CART DISCOUNT DIALOG ────────────────────────────────────────

interface CartDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDiscountDialog({
  open,
  onOpenChange,
}: CartDiscountDialogProps) {
  const { cartDiscount, setCartDiscount, getAfterItemDiscounts } = useCart();
  const [amount, setAmount] = useState("");
  const [percent, setPercent] = useState("");

  const afterItemDiscounts = getAfterItemDiscounts();

  useEffect(() => {
    if (open) {
      setAmount(cartDiscount > 0 ? String(cartDiscount) : "");
      setPercent(
        cartDiscount > 0 && afterItemDiscounts > 0
          ? String(
              parseFloat(((cartDiscount / afterItemDiscounts) * 100).toFixed(2))
            )
          : ""
      );
    }
  }, [open, cartDiscount, afterItemDiscounts]);

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && afterItemDiscounts > 0) {
      setPercent(
        parseFloat(((num / afterItemDiscounts) * 100).toFixed(2)).toString()
      );
    } else {
      setPercent("");
    }
  };

  const handlePercentChange = (val: string) => {
    setPercent(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setAmount(
        parseFloat(((num / 100) * afterItemDiscounts).toFixed(2)).toString()
      );
    } else {
      setAmount("");
    }
  };

  const handleApply = () => {
    const discountAmount = parseFloat(amount) || 0;
    setCartDiscount(parseFloat(discountAmount.toFixed(2)));
    onOpenChange(false);
  };

  const handleClear = () => {
    setCartDiscount(0);
    setAmount("");
    setPercent("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cart Discount</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            Cart subtotal (after item discounts):{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(afterItemDiscounts)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cart-discount-amount">Amount (Rs.)</Label>
              <Input
                id="cart-discount-amount"
                type="number"
                step="0.01"
                min="0"
                max={afterItemDiscounts}
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cart-discount-percent">Percentage (%)</Label>
              <Input
                id="cart-discount-percent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={percent}
                onChange={(e) => handlePercentChange(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleApply}>Apply Cart Discount</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}