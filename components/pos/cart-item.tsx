// src/components/pos/cart-item.tsx
"use client";

import { Minus, Plus, Trash2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartItem as CartItemType, useCart } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/format";
import { getIncrementStep, roundQuantity, getMinimumQuantity } from "@/lib/utils";
import { useState } from "react";

interface CartItemProps {
  item: CartItemType;
  onDiscountClick: (cartKey: string) => void;
}

export function CartItemRow({ item, onDiscountClick }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const [editingQty, setEditingQty] = useState(false);
  const [qtyInput, setQtyInput] = useState(String(item.quantity));

  const lineGross = item.quantity * item.pricePerUnit;
  const lineNet = lineGross - item.itemDiscount;

  const handleQtyBlur = () => {
    const val = parseFloat(qtyInput);
    if (!isNaN(val) && val > 0) {
      const rounded = roundQuantity(val, item.measuringUnit);
      updateQuantity(item.cartKey, rounded);
    } else {
      setQtyInput(String(item.quantity));
    }
    setEditingQty(false);
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
      {/* Product info row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.productName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {item.supplierName} • {formatCurrency(item.pricePerUnit)}/
            {item.measuringUnit}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => removeItem(item.cartKey)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Quantity + discount + total row */}
      <div className="flex items-center gap-2">
        {/* Quantity controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const step = getIncrementStep(item.measuringUnit);
              const minQty = getMinimumQuantity(item.measuringUnit);
              const newQty = Math.max(minQty, item.quantity - step);
              updateQuantity(item.cartKey, roundQuantity(newQty, item.measuringUnit));
            }}
            disabled={item.quantity <= getMinimumQuantity(item.measuringUnit)}
          >
            <Minus className="h-3 w-3" />
          </Button>

          {editingQty ? (
            <Input
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={handleQtyBlur}
              onKeyDown={(e) => e.key === "Enter" && handleQtyBlur()}
              className="h-7 w-16 text-center text-sm"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setQtyInput(String(item.quantity));
                setEditingQty(true);
              }}
              className="h-7 w-16 rounded border text-center text-sm font-medium hover:bg-accent transition-colors"
            >
              {item.quantity}
            </button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const step = getIncrementStep(item.measuringUnit);
              const newQty = Math.min(item.maxQuantity, item.quantity + step);
              updateQuantity(item.cartKey, roundQuantity(newQty, item.measuringUnit));
            }}
            disabled={item.quantity >= item.maxQuantity}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Discount button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onDiscountClick(item.cartKey)}
        >
          <Percent className="h-3 w-3 mr-1" />
          {item.itemDiscount > 0
            ? `-${formatCurrency(item.itemDiscount)}`
            : "Discount"}
        </Button>

        {/* Line total */}
        <div className="ml-auto text-right">
          {item.itemDiscount > 0 && (
            <p className="text-xs text-muted-foreground line-through">
              {formatCurrency(lineGross)}
            </p>
          )}
          <p className="font-semibold text-sm">{formatCurrency(lineNet)}</p>
        </div>
      </div>
    </div>
  );
}