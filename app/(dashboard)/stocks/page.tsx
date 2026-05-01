// src/app/(dashboard)/stocks/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";

import {
  getStocksGrouped,
  type StockWithRelations,
} from "@/actions/stocks";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";

// Type for grouped stocks
type GroupedStock = Awaited<ReturnType<typeof getStocksGrouped>>["groups"][number];

// ─── Page Component ──────────────────────────────────────────────

export default function StocksPage() {
  const router = useRouter();

  // State
  const [stocks, setStocks] = useState<GroupedStock[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [showLowStock, setShowLowStock] = useState(false);

  // Fetch stocks
  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStocksGrouped({
        search: search || undefined,
        supplierId: supplierId || undefined,
        lowStock: showLowStock || undefined,
        page,
        pageSize: 20,
      });
      setStocks(result.groups);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      toast.error("Failed to load stocks");
    } finally {
      setLoading(false);
    }
  }, [search, supplierId, showLowStock, page]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stocks</h1>
          <p className="text-muted-foreground">
            Manage stock entries and supplier payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/supplier-bills")}>
            <FileText className="mr-2 h-4 w-4" />
            Add Supplier Bill
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product or supplier..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          variant={showLowStock ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setShowLowStock(!showLowStock);
            setPage(1);
          }}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Low Stock
        </Button>
      </div>

      {/* Stats bar */}
      <div className="text-sm text-muted-foreground">
        {total} stock {total === 1 ? "entry" : "entries"} found
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Buying Price</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-right">Total Qty</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead className="text-center">Sources</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : stocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No stocks found</p>
                </TableCell>
              </TableRow>
            ) : (
              stocks.map((group) => {
                const isLow = group.totalQuantityRemaining > 0 && group.totalQuantityRemaining < 10;
                const isOut = group.totalQuantityRemaining <= 0;

                return (
                  <TableRow
                    key={`${group.productId}|${group.supplierId}|${group.buyingPricePerUnit}|${group.sellingPricePerUnit}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      // Navigate to the first stock's detail page
                      const firstStock = group.stocks[0];
                      if (firstStock) {
                        router.push(`/stocks/${firstStock.id}`);
                      }
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            isOut
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {group.product.name}
                        </span>
                        {isOut && (
                          <Badge
                            variant="destructive"
                            className="ml-2 text-xs"
                          >
                            OUT OF STOCK
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{group.supplier.name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(group.buyingPricePerUnit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(group.sellingPricePerUnit)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          isLow ? "text-amber-600 font-medium" : ""
                        }
                      >
                        {formatQuantity(group.totalQuantityRemaining, group.measuringUnit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(group.totalCost)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-xs">
                        {group.stocks.length} {group.stocks.length === 1 ? "source" : "sources"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}