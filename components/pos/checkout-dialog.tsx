// src/components/pos/checkout-dialog.tsx
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { CustomerSearch } from "./customer-search";
import { PointRedemption } from "./point-redemption";
import { createTransaction } from "@/actions/transactions";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CustomerResult {
  phoneNumber: string;
  name: string;
  totalPoints: number;
  membershipTier: string;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: {
    id: string;
    receiptNumber: string;
    totalAmount: number;
    pointsEarned: number;
    changeGiven: number;
  }) => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  onSuccess,
}: CheckoutDialogProps) {
  const cart = useCart();
  const [customer, setCustomer] = useState<CustomerResult | null>(null);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCustomer(null);
      setPointsRedeemed(0);
      setPaymentMethod("CASH");
      setAmountPaid("");
    }
  }, [open]);

  // Reset points when customer changes
  useEffect(() => {
    setPointsRedeemed(0);
  }, [customer]);

  // Calculations
  const afterCartDiscount = cart.getAfterCartDiscount();
  const pointsRedeemedValue = Math.min(pointsRedeemed, afterCartDiscount);
  const totalAmount = parseFloat(
    Math.max(0, afterCartDiscount - pointsRedeemedValue).toFixed(2)
  );
  const pointsEarned = Math.floor(totalAmount / 100);
  const amountPaidNum = parseFloat(amountPaid) || 0;
  const changeGiven =
    paymentMethod === "CASH"
      ? parseFloat(Math.max(0, amountPaidNum - totalAmount).toFixed(2))
      : 0;

  const canComplete =
    cart.items.length > 0 &&
    !isProcessing &&
    (paymentMethod === "CARD" || amountPaidNum >= totalAmount);

  const handleComplete = async () => {
    if (!canComplete) return;

    setIsProcessing(true);

    const result = await createTransaction({
      customerPhone: customer?.phoneNumber || null,
      items: cart.items.map((item) => ({
        stockId: item.stockId,
        quantity: item.quantity,
        itemDiscount: item.itemDiscount,
      })),
      cartDiscount: cart.cartDiscount,
      pointsRedeemed: customer ? pointsRedeemed : 0,
      paymentMethod,
      amountPaid: paymentMethod === "CASH" ? amountPaidNum : totalAmount,
    });

    if (result.success && result.data) {
      toast.success(`Sale completed! Receipt: ${result.data.receiptNumber}`);
      cart.clearCart();
      onSuccess(result.data);
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to complete sale");
    }

    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Multiple discount warning */}
          {cart.hasMultipleDiscounts() && (
            <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                Multiple discounts applied (item + cart discounts)
              </AlertDescription>
            </Alert>
          )}

          {/* Customer Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Customer</Label>
            <CustomerSearch
              selectedCustomer={customer}
              onSelect={setCustomer}
            />
          </div>

          {/* Point Redemption (only if customer selected) */}
          {customer && (
            <>
              <Separator />
              <PointRedemption
                availablePoints={customer.totalPoints}
                maxRedeemable={afterCartDiscount}
                pointsRedeemed={pointsRedeemed}
                onChange={setPointsRedeemed}
              />
            </>
          )}

          <Separator />

          {/* Order Summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Subtotal ({cart.items.length} items)
              </span>
              <span>{formatCurrency(cart.getSubtotal())}</span>
            </div>
            {cart.getTotalItemDiscount() > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Item Discounts</span>
                <span>-{formatCurrency(cart.getTotalItemDiscount())}</span>
              </div>
            )}
            {cart.cartDiscount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Cart Discount</span>
                <span>-{formatCurrency(cart.cartDiscount)}</span>
              </div>
            )}
            {pointsRedeemedValue > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Points Redeemed ({pointsRedeemed} pts)</span>
                <span>-{formatCurrency(pointsRedeemedValue)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            {customer && pointsEarned > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Points to earn</span>
                <span className="text-green-600 dark:text-green-400">
                  +{pointsEarned} points
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Method */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Payment Method</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("CASH")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors",
                  paymentMethod === "CASH"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                )}
              >
                <Banknote className="h-5 w-5" />
                Cash
              </button>
              <button
                onClick={() => setPaymentMethod("CARD")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-colors",
                  paymentMethod === "CARD"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/50"
                )}
              >
                <CreditCard className="h-5 w-5" />
                Card
              </button>
            </div>
          </div>

          {/* Cash amount input */}
          {paymentMethod === "CASH" && (
            <div className="space-y-2">
              <Label htmlFor="amount-paid">Amount Received (Rs.)</Label>
              <Input
                id="amount-paid"
                type="number"
                step="0.01"
                min={totalAmount}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={totalAmount.toFixed(2)}
                className="text-lg h-12"
              />
              {/* Quick cash buttons */}
              <div className="flex gap-2 flex-wrap">
                {[
                  totalAmount,
                  Math.ceil(totalAmount / 100) * 100,
                  Math.ceil(totalAmount / 500) * 500,
                  Math.ceil(totalAmount / 1000) * 1000,
                  5000,
                  10000,
                ]
                  .filter(
                    (v, i, arr) =>
                      v >= totalAmount && arr.indexOf(v) === i
                  )
                  .slice(0, 4)
                  .map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setAmountPaid(String(amount))}
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
              </div>
              {amountPaidNum >= totalAmount && changeGiven > 0 && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 text-center">
                  <p className="text-sm text-muted-foreground">Change</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(changeGiven)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!canComplete}
            className="min-w-[140px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Sale
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}