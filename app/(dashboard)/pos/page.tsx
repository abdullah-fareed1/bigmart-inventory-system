// src/app/(dashboard)/pos/page.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { roundQuantity, getIncrementStep, getMinimumQuantity } from "@/lib/utils";
import { ProductSearch } from "@/components/pos/product-search";
import { Cart } from "@/components/pos/cart";
import { CheckoutDialog } from "@/components/pos/checkout-dialog";
import { CartDiscountDialog } from "@/components/pos/discount-dialog";
import { getTransactionById } from "@/actions/transactions";
import { getShopSettings } from "@/actions/settings";
import { printSaleReceipt } from "@/components/receipts/sale-receipt";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

export default function POSPage() {
  const cart = useCart();
  const searchRef = useRef<HTMLInputElement>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCartDiscount, setShowCartDiscount] = useState(false);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    stockId: string;
    productId: string;
    productName: string;
    supplierName: string;
    sellingPrice: number;
    quantityRemaining: number;
    measuringUnit: string;
  } | null>(null);
  const [quantityInput, setQuantityInput] = useState("1");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastSale, setLastSale] = useState<{
    id: string;
    receiptNumber: string;
    totalAmount: number;
    pointsEarned: number;
    changeGiven: number;
  } | null>(null);

  const handleProductSelect = useCallback(
    (item: {
      stockId: string;
      productId: string;
      productName: string;
      supplierName: string;
      sellingPrice: number;
      quantityRemaining: number;
      measuringUnit: string;
    }) => {
      setSelectedProduct(item);
      setQuantityInput("1");
      setShowQuantityDialog(true);
    },
    []
  );

  const handleAddToCart = useCallback(() => {
    if (!selectedProduct) return;
    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (qty > selectedProduct.quantityRemaining) {
      toast.error(
        `Maximum available: ${selectedProduct.quantityRemaining} ${selectedProduct.measuringUnit}`
      );
      return;
    }

    cart.addItem({
      stockId: selectedProduct.stockId,
      productId: selectedProduct.productId,
      productName: selectedProduct.productName,
      supplierName: selectedProduct.supplierName,
      quantity: roundQuantity(qty, String(selectedProduct.measuringUnit)),
      pricePerUnit: selectedProduct.sellingPrice,
      measuringUnit: String(selectedProduct.measuringUnit),
      itemDiscount: 0,
      maxQuantity: selectedProduct.quantityRemaining,
    });

    setShowQuantityDialog(false);
    setSelectedProduct(null);
    toast.success(`${selectedProduct.productName} added to cart`);
    searchRef.current?.focus();
  }, [selectedProduct, quantityInput, cart]);

  const handleSaleSuccess = useCallback(
    (result: {
      id: string;
      receiptNumber: string;
      totalAmount: number;
      pointsEarned: number;
      changeGiven: number;
    }) => {
      setLastSale(result);
      setShowSuccessDialog(true);
    },
    []
  );

  const handlePrintReceipt = useCallback(async () => {
    if (!lastSale) return;

    const result = await getTransactionById(lastSale.id);
    if (!result.success || !result.data) {
      toast.error("Failed to load receipt data");
      return;
    }

    const shopSettingsResult = await getShopSettings();
    const shopSettings = shopSettingsResult.success ? shopSettingsResult.data : null;

    const tx = result.data;
    printSaleReceipt({
      receiptNumber: tx.receiptNumber,
      saleDateTime: tx.saleDateTime,
      customerName: tx.customer?.name,
      customerPhone: tx.customer?.phoneNumber,
      paymentMethod: tx.paymentMethod,
      items: tx.items.map(
        (item: {
          productName: string;
          quantity: number;
          measuringUnit: string;
          pricePerUnit: number;
          itemDiscount: number;
          lineTotal: number;
        }) => ({
          productName: item.productName,
          quantity: item.quantity,
          measuringUnit: item.measuringUnit,
          pricePerUnit: item.pricePerUnit,
          itemDiscount: item.itemDiscount,
          lineTotal: item.lineTotal,
        })
      ),
      subtotal: tx.subtotal,
      totalItemDiscount: tx.totalItemDiscount,
      cartDiscount: tx.cartDiscount,
      pointsRedeemed: tx.pointsRedeemed,
      pointsRedeemedValue: tx.pointsRedeemedValue,
      totalAmount: tx.totalAmount,
      amountPaid: tx.amountPaid ?? tx.totalAmount,
      changeGiven: tx.changeGiven ?? 0,
      pointsEarned: tx.pointsEarned,
      returnPolicyDays: shopSettings?.returnPolicyDays,
      shopName: shopSettings?.shopName,
      shopAddress: shopSettings?.address,
      shopPhone: shopSettings?.phone,
    });
  }, [lastSale]);

  useKeyboardShortcuts({
    onNewSale: () => {
      cart.clearCart();
      searchRef.current?.focus();
    },
    onFocusSearch: () => searchRef.current?.focus(),
    onFocusCart: () => {
      document
        .getElementById("pos-cart")
        ?.scrollIntoView({ behavior: "smooth" });
    },
    onCheckout: () => {
      if (cart.items.length > 0) setShowCheckout(true);
    },
    onCartDiscount: () => {
      if (cart.items.length > 0) setShowCartDiscount(true);
    },
    onEscape: () => {
      if (showCheckout) setShowCheckout(false);
      else if (showCartDiscount) setShowCartDiscount(false);
      else if (showQuantityDialog) setShowQuantityDialog(false);
      else if (showSuccessDialog) setShowSuccessDialog(false);
    },
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* Left Panel - Product Search */}
      <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Point of Sale
            </h1>
            <p className="text-sm text-muted-foreground">
              Search products and add to cart
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              cart.clearCart();
              searchRef.current?.focus();
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            New Sale (F1)
          </Button>
        </div>

        <ProductSearch onSelect={handleProductSelect} searchRef={searchRef} />

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">
                F1
              </kbd>{" "}
              New Sale
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">
                /
              </kbd>{" "}
              Search
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">
                F3
              </kbd>{" "}
              Checkout
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">
                F4
              </kbd>{" "}
              Cart Discount
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">
                Esc
              </kbd>{" "}
              Close
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div
        id="pos-cart"
        className="w-full lg:w-[400px] xl:w-[440px] border-l bg-card flex flex-col"
      >
        <Cart onCheckout={() => setShowCheckout(true)} />
      </div>

      {/* Quantity Dialog */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to Cart</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 py-2">
              <div>
                <p className="font-medium">{selectedProduct.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProduct.supplierName} •{" "}
                  {formatCurrency(selectedProduct.sellingPrice)}/
                  {selectedProduct.measuringUnit}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {selectedProduct.quantityRemaining}{" "}
                  {selectedProduct.measuringUnit}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quantity ({selectedProduct.measuringUnit})
                </label>
                <input
                  type="number"
                  step={getIncrementStep(selectedProduct.measuringUnit)}
                  min={getMinimumQuantity(selectedProduct.measuringUnit)}
                  max={selectedProduct.quantityRemaining}
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddToCart()}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  autoFocus
                />
              </div>

              <div className="flex justify-between text-sm bg-muted rounded-md p-3">
                <span>Line Total:</span>
                <span className="font-semibold">
                  {formatCurrency(
                    (parseFloat(quantityInput) || 0) *
                      selectedProduct.sellingPrice
                  )}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowQuantityDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddToCart}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={showCheckout}
        onOpenChange={setShowCheckout}
        onSuccess={handleSaleSuccess}
      />

      {/* Cart Discount Dialog */}
      <CartDiscountDialog
        open={showCartDiscount}
        onOpenChange={setShowCartDiscount}
      />

      {/* Sale Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 dark:text-green-400">
              Sale Completed!
            </DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-4 py-2 text-center">
              <div className="text-4xl font-bold">
                {formatCurrency(lastSale.totalAmount)}
              </div>
              <div className="text-sm text-muted-foreground">
                Receipt: {lastSale.receiptNumber}
              </div>
              {lastSale.changeGiven > 0 && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-3">
                  <p className="text-sm text-muted-foreground">Change</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(lastSale.changeGiven)}
                  </p>
                </div>
              )}
              {lastSale.pointsEarned > 0 && (
                <p className="text-sm text-muted-foreground">
                  Points earned: +{lastSale.pointsEarned}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={handlePrintReceipt}>
              Print Receipt
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                searchRef.current?.focus();
              }}
            >
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}