// src/app/(dashboard)/suppliers/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Pencil, Phone } from "lucide-react";
import { toast } from "sonner";

import { getSupplierById, updateSupplier } from "@/actions/suppliers";
import { getStocksGrouped } from "@/actions/stocks";
import { getSupplierBillsBySupplier } from "@/actions/supplier-bills";
import { getCreditNotesBySupplier, getAvailableCredit } from "@/actions/credit-notes";
import { SupplierForm, type SupplierFormData } from "@/components/forms/supplier-form";
import { formatCurrency, formatDate, formatDateTime, formatQuantity } from "@/lib/format";

// ─── Types ───────────────────────────────────────────────────────

interface SupplierInfo {
  id: string;
  name: string;
  phoneNumber: string;
  notes: string | null;
  isActive: boolean;
  joinedDate: Date | string;
}

// ─── Page ────────────────────────────────────────────────────────

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<SupplierInfo | null>(null);
  const [stats, setStats] = useState({
    totalStocks: 0,
    activeStocks: 0,
    totalValue: 0,
    unpaidBalance: 0,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stocks, setStocks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [supplierBills, setSupplierBills] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [availableCredit, setAvailableCredit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [supplierResult, stocksResult, billsResult, cnResult, creditResult] =
        await Promise.all([
          getSupplierById(supplierId),
          getStocksGrouped({ supplierId, pageSize: 100 }),
          getSupplierBillsBySupplier(supplierId),
          getCreditNotesBySupplier(supplierId),
          getAvailableCredit(supplierId),
        ]);

      if (supplierResult.error || !supplierResult.supplier) {
        toast.error("Supplier not found");
        router.push("/suppliers");
        return;
      }

      setSupplier(supplierResult.supplier as unknown as SupplierInfo);
      if (supplierResult.stats) {
        setStats(supplierResult.stats as typeof stats);
      }

      setStocks(stocksResult.groups);
      setSupplierBills(billsResult.bills);
      setCreditNotes(cnResult.creditNotes);
      setAvailableCredit(creditResult.availableCredit);
    } catch {
      toast.error("Failed to load supplier details");
    } finally {
      setLoading(false);
    }
  }, [supplierId, router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Edit supplier
  const handleEdit = async (data: SupplierFormData) => {
    const result = await updateSupplier(supplierId, data);
    if (result.error) { toast.error(result.error); return; }
    toast.success("Supplier updated");
    setShowEditDialog(false);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/suppliers")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span className="font-mono">{supplier.phoneNumber}</span>
              <Badge variant={supplier.isActive ? "default" : "secondary"} className="ml-2">
                {supplier.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowEditDialog(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </div>

      {/* ── Financial Summary Cards ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalStocks}</div>
            <p className="text-xs text-muted-foreground">Total Stocks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Total Purchases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${stats.unpaidBalance > 0 ? "text-destructive" : ""}`}>
              {formatCurrency(stats.unpaidBalance)}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${availableCredit > 0 ? "text-blue-600" : ""}`}>
              {formatCurrency(availableCredit)}
            </div>
            <p className="text-xs text-muted-foreground">Available Credit</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <Tabs defaultValue="stocks">
        <TabsList>
          <TabsTrigger value="stocks">
            Stocks ({stocks.length})
          </TabsTrigger>
          <TabsTrigger value="bills">
            Bills ({supplierBills.length})
          </TabsTrigger>
          <TabsTrigger value="credit-notes">
            Credit Notes ({creditNotes.length})
          </TabsTrigger>
        </TabsList>

        {/* Stocks Tab */}
        <TabsContent value="stocks" className="border rounded-lg mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN #</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Remaining</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No stocks from this supplier
                  </TableCell>
                </TableRow>
              ) : (
                stocks.map((s) => {
                  const balance = Number(s.totalCost) - Number(s.amountPaid);
                  const stockKey = `${s.productId}|${s.supplierId}|${s.buyingPricePerUnit}|${s.sellingPricePerUnit}|${s.measuringUnit}|${s.splitUnit ?? "null"}|${s.unitsPerWhole ?? "null"}|${s.canBeSplit}`;
                  const firstStock = s.stocks[0];
                  return (
                    <TableRow
                      key={stockKey}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (firstStock) {
                          router.push(`/stocks/${firstStock.id}`);
                        }
                      }}
                    >
                      <TableCell className="font-mono text-sm">{s.grnNumber}</TableCell>
                      <TableCell>{s.product.name}</TableCell>
                      <TableCell className="text-right">
                        {formatQuantity(s.quantityRemaining, s.measuringUnit)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(s.totalCost)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.paymentStatus === "PAID"
                              ? "default"
                              : s.paymentStatus === "PARTIAL"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {s.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right ${balance > 0 ? "text-destructive font-medium" : ""}`}>
                        {balance > 0 ? formatCurrency(balance) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(s.suppliedDate)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Bills Tab */}
        <TabsContent value="bills" className="border rounded-lg mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right"># Products</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No bills from this supplier
                  </TableCell>
                </TableRow>
              ) : (
                supplierBills.map((bill) => {
                  const totalCost = Number(bill.totalCost);
                  const amountPaid = Number(bill.amountPaid);
                  const balanceDue = Math.max(0, totalCost - amountPaid);
                  return (
                    <TableRow
                      key={bill.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/supplier-bills/${bill.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{bill.billNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(bill.billDate)}
                      </TableCell>
                      <TableCell className="text-right">{bill._count?.stocks ?? 0}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(amountPaid)}</TableCell>
                      <TableCell className={`text-right ${balanceDue > 0 ? "text-destructive font-medium" : ""}`}>
                        {balanceDue > 0 ? formatCurrency(balanceDue) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            bill.paymentStatus === "PAID"
                              ? "default"
                              : bill.paymentStatus === "PARTIAL"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {bill.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Credit Notes Tab */}
        <TabsContent value="credit-notes" className="mt-4 space-y-4">
          {creditNotes.length === 0 ? (
            <div className="border rounded-lg p-8 text-center text-muted-foreground">
              No credit notes for this supplier
            </div>
          ) : (
            creditNotes.map((cn) => (
              <Card key={cn.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-mono">{cn.creditNoteNumber}</CardTitle>
                    <Badge variant={cn.isFullyUsed ? "secondary" : "default"}>
                      {cn.isFullyUsed ? "Fully Used" : "Available"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Origin info */}
                  <div className="text-sm text-muted-foreground">
                    From return {cn.supplierReturn.returnNumber} · {cn.supplierReturn.stock.product.name} · {formatDateTime(cn.supplierReturn.returnDate)}
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Original</div>
                      <div className="font-medium">{formatCurrency(cn.originalAmount)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Used</div>
                      <div className="font-medium">
                        {formatCurrency(cn.originalAmount - cn.remainingAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Remaining</div>
                      <div className={`font-medium ${cn.remainingAmount > 0 ? "text-blue-600" : ""}`}>
                        {formatCurrency(cn.remainingAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Usage history */}
                  {cn.usages && cn.usages.length > 0 && (
                    <>
                      <Separator />
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Usage History
                      </div>
                      <div className="space-y-1">
                        {cn.usages.map((u: { id: string; amountUsed: number; usedAt: string | Date; stock: { grnNumber: string; product: { name: string } } }) => (
                          <div key={u.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {u.stock.grnNumber} ({u.stock.product.name}) · {formatDate(u.usedAt)}
                            </span>
                            <span className="font-medium">{formatCurrency(u.amountUsed)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Supplier</DialogTitle></DialogHeader>
          <SupplierForm
            initialData={{
              id: supplier.id,
              name: supplier.name,
              phoneNumber: supplier.phoneNumber,
              notes: supplier.notes,
            }}
            onSubmit={handleEdit}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}