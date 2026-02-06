import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "default" | "lg";
  text?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  default: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({
  className,
  size = "default",
  text,
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        className
      )}
    >
      <Loader2
        className={cn("animate-spin text-muted-foreground", sizeMap[size])}
      />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}