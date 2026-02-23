// src/components/pos/cart.tsx
"use client";

import { useState } from "react";
import { ShoppingCart, Percent, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { CartItemRow } from "./cart-item";
import { ItemDiscountDialog, CartDiscountDialog } from "./discount-dialog";
import { formatCurrency } from "@/lib/format";

interface CartProps {
  onCheckout: () => void;
}

export function Cart({ onCheckout }: CartProps) {
  const cart = useCart();
  const [discountStockId, setDiscountStockId] = useState<string | null>(null);
  const [showCartDiscount, setShowCartDiscount] = useState(false);

  const subtotal = cart.getSubtotal();
  const totalItemDiscount = cart.getTotalItemDiscount();
  const afterItemDiscounts = cart.getAfterItemDiscounts();
  const total = cart.getTotal();

  return (
    <div className="flex h-full flex-col">
      {/* Cart Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <h2 className="font-semibold text-lg">Cart</h2>
          {cart.items.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {cart.items.length}
            </Badge>
          )}
        </div>
        {cart.items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={() => cart.clearCart()}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Cart Items */}
      {cart.items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Cart is empty</p>
          <p className="text-xs text-muted-foreground mt-1">
            Search and add products to start a sale
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-2">
            {cart.items.map((item) => (
              <CartItemRow
                key={item.stockId}
                item={item}
                onDiscountClick={(stockId) => setDiscountStockId(stockId)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Cart Footer */}
      {cart.items.length > 0 && (
        <div className="border-t px-4 py-3 space-y-3">
          {/* Discount summary */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {totalItemDiscount > 0 && (
              <div className="flex justify-between text-destructive text-xs">
                <span>Item Discounts</span>
                <span>-{formatCurrency(totalItemDiscount)}</span>
              </div>
            )}

            {cart.cartDiscount > 0 && (
              <div className="flex justify-between text-destructive text-xs">
                <span>Cart Discount</span>
                <span>-{formatCurrency(cart.cartDiscount)}</span>
              </div>
            )}

            <Separator className="my-1" />

            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Cart discount button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowCartDiscount(true)}
          >
            <Percent className="h-4 w-4 mr-2" />
            {cart.cartDiscount > 0
              ? `Cart Discount: -${formatCurrency(cart.cartDiscount)}`
              : "Add Cart Discount"}
          </Button>

          {/* Multiple discount warning */}
          {cart.hasMultipleDiscounts() && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
              Multiple discounts applied
            </p>
          )}

          {/* Checkout button */}
          <Button size="lg" className="w-full text-base" onClick={onCheckout}>
            Checkout ({formatCurrency(total)})
          </Button>

          {/* Shortcut hint */}
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1 rounded bg-muted font-mono text-xs">F3</kbd> to checkout
          </p>
        </div>
      )}

      {/* Dialogs */}
      <ItemDiscountDialog
        open={discountStockId !== null}
        onOpenChange={(open) => !open && setDiscountStockId(null)}
        stockId={discountStockId}
      />
      <CartDiscountDialog
        open={showCartDiscount}
        onOpenChange={setShowCartDiscount}
      />
    </div>
  );
}