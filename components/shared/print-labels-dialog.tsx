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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { getShopSettings } from "@/actions/settings";
import { printBarcodeLabels } from "@/components/receipts/barcode-label";
import { formatCurrency } from "@/lib/format";

interface LabelItem {
  grnNumber: string;
  productName: string;
  sellingPricePerUnit: number;
  measuringUnit: string;
}

interface PrintLabelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LabelItem[];
}

interface LabelSize {
  label: string;
  widthMm: number;
  heightMm: number;
}

const LABEL_SIZES: LabelSize[] = [
  { label: "40×30mm", widthMm: 40, heightMm: 30 },
  { label: "50×30mm", widthMm: 50, heightMm: 30 },
  { label: "60×40mm", widthMm: 60, heightMm: 40 },
  { label: "30×20mm", widthMm: 30, heightMm: 20 },
  { label: "80×50mm", widthMm: 80, heightMm: 50 },
  { label: "80×20mm", widthMm: 80, heightMm: 20 },
  { label: "70×25mm", widthMm: 70, heightMm: 25 },
  { label: "60×20mm", widthMm: 60, heightMm: 20 },
  { label: "75×30mm", widthMm: 75, heightMm: 30 },
];

export function PrintLabelsDialog({
  open,
  onOpenChange,
  items,
}: PrintLabelsDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("40×30mm");
  const [shopName, setShopName] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (open) {
      getShopSettings().then((result) => {
        if (result.success && result.data?.shopName) {
          setShopName(result.data.shopName);
        }
        setLoadingSettings(false);
      });
    }
  }, [open]);

  const handlePrint = () => {
    const selectedLabelSize = LABEL_SIZES.find(
      (size) => size.label === selectedSize
    );
    if (!selectedLabelSize) return;

    printBarcodeLabels({
      items,
      quantityPerItem: quantity,
      labelWidthMm: selectedLabelSize.widthMm,
      labelHeightMm: selectedLabelSize.heightMm,
      shopName,
    });
  };

  const currentSize = LABEL_SIZES.find((size) => size.label === selectedSize);
  const totalLabels = items.length * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Print Barcode Labels</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity per Item</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="999"
              value={quantity}
              onChange={(e) => {
                const val = Math.max(1, Math.min(999, parseInt(e.target.value) || 1));
                setQuantity(val);
              }}
              className="w-full"
            />
          </div>

          {/* Label Size Selector */}
          <div className="space-y-2">
            <Label htmlFor="size">Label Size</Label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger id="size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LABEL_SIZES.map((size) => (
                  <SelectItem key={size.label} value={size.label}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Preview Mockup */}
          {currentSize && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="border border-dashed border-gray-300 rounded p-4 bg-gray-50 flex items-center justify-center"
                style={{
                  aspectRatio: `${currentSize.widthMm} / ${currentSize.heightMm}`,
                  maxWidth: "200px",
                }}
              >
                <div
                  className="font-mono text-xs text-center space-y-1"
                  style={{ fontSize: "8px" }}
                >
                  <div className="font-bold uppercase border-b pb-0.5">
                    {shopName || "Shop Name"}
                  </div>
                  <div className="truncate px-2" style={{ maxWidth: "100%" }}>
                    Product Name
                  </div>
                  <div className="border border-gray-400 px-1 py-0.5">
                    ▌▌▌▌▌▌▌
                  </div>
                  <div>GRN-00023</div>
                  <div className="font-bold">Rs. 000.00 / UNIT</div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Total Count */}
          <div className="flex items-center justify-between rounded bg-blue-50 p-3">
            <span className="text-sm font-medium">
              {items.length} item type(s) × {quantity} =
            </span>
            <Badge variant="secondary" className="ml-2">
              {totalLabels} labels
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            disabled={loadingSettings}
          >
            {loadingSettings ? "Loading..." : "Print Labels"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
