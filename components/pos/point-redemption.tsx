// src/components/pos/point-redemption.tsx
"use client";

import { useState, useEffect } from "react";
import { Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

interface PointRedemptionProps {
  availablePoints: number;
  maxRedeemable: number; // capped at cart total (after cart discount)
  pointsRedeemed: number;
  onChange: (points: number) => void;
}

export function PointRedemption({
  availablePoints,
  maxRedeemable,
  pointsRedeemed,
  onChange,
}: PointRedemptionProps) {
  const [inputValue, setInputValue] = useState(String(pointsRedeemed));

  // Cap: min(availablePoints, maxRedeemable)
  const maxPoints = Math.min(availablePoints, Math.floor(maxRedeemable));

  useEffect(() => {
    setInputValue(String(pointsRedeemed));
  }, [pointsRedeemed]);

  const handleChange = (val: string) => {
    setInputValue(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      onChange(Math.min(Math.max(0, num), maxPoints));
    } else if (val === "") {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setInputValue(String(pointsRedeemed));
  };

  const handleMax = () => {
    onChange(maxPoints);
    setInputValue(String(maxPoints));
  };

  if (availablePoints <= 0) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground text-center">
        <Crown className="h-4 w-4 mx-auto mb-1" />
        No points available to redeem
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm">
          <Crown className="h-4 w-4 text-amber-500" />
          Redeem Points
        </Label>
        <span className="text-xs text-muted-foreground">
          Available: {availablePoints} pts (= {formatCurrency(availablePoints)})
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          type="number"
          min="0"
          max={maxPoints}
          step="1"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="0"
          className="flex-1"
        />
        <Button variant="outline" size="sm" onClick={handleMax}>
          Max ({maxPoints})
        </Button>
      </div>

      {pointsRedeemed > 0 && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Deducting {formatCurrency(pointsRedeemed)} from total (1 point = Rs. 1)
        </p>
      )}
    </div>
  );
}