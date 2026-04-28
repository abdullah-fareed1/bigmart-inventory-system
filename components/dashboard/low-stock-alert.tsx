import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatQuantity } from "@/lib/format";

interface LowStockAlertProps {
  items: {
    id: string;
    productName: string;
    supplierName: string;
    remaining: number;
    unit: string;
    minStockAlert: number;
  }[];
  threshold?: number;
  isLoading?: boolean;
}

export function LowStockAlert({
  items,
  threshold = 10,
  isLoading,
}: LowStockAlertProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">
            Low Stock Alert
          </CardTitle>
          {items.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            All stocks are above their minimum alert levels
          </p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.supplierName} • Min: {item.minStockAlert} {item.unit}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={item.remaining <= item.minStockAlert / 2 ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {formatQuantity(item.remaining, item.unit)}
                </Badge>
              </div>
            ))}
            {items.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href="/stocks?filter=low">View All Low Stock →</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}