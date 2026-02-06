import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface CurrencyDisplayProps {
  amount: number | string;
  showSign?: boolean;
  className?: string;
}

export function CurrencyDisplay({
  amount,
  showSign = false,
  className,
}: CurrencyDisplayProps) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const sign = showSign && num > 0 ? "+" : "";

  return (
    <span
      className={cn(
        showSign && num > 0 && "text-green-600 dark:text-green-400",
        showSign && num < 0 && "text-red-600 dark:text-red-400",
        className
      )}
    >
      {sign}
      {formatCurrency(num)}
    </span>
  );
}