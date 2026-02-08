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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  getStocks,
  createStock,
  type StockWithRelations,
} from "@/actions/stocks";
import { getProducts } from "@/actions/products";
import { getSuppliers } from "@/actions/suppliers";
import { StockForm, type StockFormData } from "@/components/forms/stock-form";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/format";

// ─── Payment Status Badge ────────────────────────────────────────

function PaymentStatusBadge({ status }: { status: string }) {
  const variant =
    status === "PAID"
      ? "default"
      : status === "PARTIAL"
        ? "secondary"
        : "destructive";

  return <Badge variant={variant}>{status}</Badge>;
}

// ─── Page Component ──────────────────────────────────────────────

export default function StocksPage() {
  const router = useRouter();

  // State
  const [stocks, setStocks] = useState<StockWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [showLowStock, setShowLowStock] = useState(false);

  // Add stock dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [products, setProducts] = useState<
    { id: string; name: string; primaryUnit: string }[]
  >([]);
  const [suppliers, setSuppliers] = useState<
    { id: string; name: string; phoneNumber: string }[]
  >([]);

  // Fetch stocks
  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStocks({
        search: search || undefined,
        supplierId: supplierId || undefined,
        paymentStatus: paymentStatus || undefined,
        lowStock: showLowStock || undefined,
        page,
        pageSize: 20,
      });
      setStocks(result.stocks);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      toast.error("Failed to load stocks");
    } finally {
      setLoading(false);
    }
  }, [search, supplierId, paymentStatus, showLowStock, page]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Load products and suppliers for the form
  const loadFormData = async () => {
    try {
      const [productsResult, suppliersResult] = await Promise.all([
        getProducts({ isActive: true }),
        getSuppliers({ isActive: true }),
      ]);

      // getProducts returns { success, data: { products: [...] } }
      // Extract correctly based on actual response shape
      if (productsResult.success && productsResult.data) {
        setProducts(
          productsResult.data.products.map(
            (p: { id: string; name: string; primaryUnit: string }) => ({
              id: p.id,
              name: p.name,
              primaryUnit: p.primaryUnit,
            })
          )
        );
      } else {
        setProducts([]);
      }

      // getSuppliers returns { suppliers: [...] }
      setSuppliers(
        (suppliersResult.suppliers || []).map(
          (s: { id: string; name: string; phoneNumber: string }) => ({
            id: s.id,
            name: s.name,
            phoneNumber: s.phoneNumber,
          })
        )
      );
    } catch {
      toast.error("Failed to load form data");
    }
  };

  const handleOpenAddDialog = async () => {
    await loadFormData();
    setShowAddDialog(true);
  };

  // Handle create stock
  const handleCreateStock = async (data: StockFormData) => {
    const result = await createStock(data);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Stock added with GRN: ${result.stock?.grnNumber}`);
    setShowAddDialog(false);
    fetchStocks();
  };

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
        <Button onClick={handleOpenAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Stock
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by GRN, product, or supplier..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={paymentStatus}
          onValueChange={(val) => {
            setPaymentStatus(val === "ALL" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
          </SelectContent>
        </Select>

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
              <TableHead>GRN #</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Qty Remaining</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : stocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No stocks found</p>
                </TableCell>
              </TableRow>
            ) : (
              stocks.map((stock) => {
                const remaining = Number(stock.quantityRemaining);
                const isLow = remaining > 0 && remaining < 10;
                const isOut = remaining <= 0;

                return (
                  <TableRow
                    key={stock.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/stocks/${stock.id}`)}
                  >
                    <TableCell className="font-mono text-sm">
                      {stock.grnNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            isOut
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {stock.product.name}
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
                    <TableCell>{stock.supplier.name}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          isLow ? "text-amber-600 font-medium" : ""
                        }
                      >
                        {formatQuantity(remaining)} {stock.measuringUnit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(stock.sellingPricePerUnit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(stock.totalCost)}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={stock.paymentStatus} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(stock.suppliedDate)}
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

      {/* Add Stock Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Stock</DialogTitle>
            <DialogDescription>
              Add a new stock entry. A GRN number will be automatically
              generated.
            </DialogDescription>
          </DialogHeader>
          <StockForm
            products={products}
            suppliers={suppliers}
            onSubmit={handleCreateStock}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}