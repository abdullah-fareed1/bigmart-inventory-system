// src/app/(dashboard)/stocks/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Printer,
  CreditCard,
  RotateCcw,
  Loader2,
  Package,
  Truck,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import {
  getStockById,
  recordStockPayment,
  returnStockToSupplier,
  type StockDetail,
} from "@/actions/stocks";
import { printGRN } from "@/components/receipts/grn-receipt";
import { formatCurrency, formatDateTime, formatQuantity, formatDate } from "@/lib/format";

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

// ─── Loading Skeleton ────────────────────────────────────────────

function StockDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

// ─── Page Component ──────────────────────────────────────────────

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stockId = params.id as string;

  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Return dialog state
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnReason, setReturnReason] = useState("DAMAGED");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);

  // Shop settings for GRN print (we'll use a simple default)
  const [shopSettings, setShopSettings] = useState({
    shopName: "Textile Palace",
    address: "123 Main Street, Colombo",
    phone: "0112345678",
  });

  // Fetch stock
  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStockById(stockId);
      if (result.error || !result.stock) {
        toast.error(result.error || "Stock not found");
        router.push("/stocks");
        return;
      }
      setStock(result.stock);
    } catch {
      toast.error("Failed to load stock details");
    } finally {
      setLoading(false);
    }
  }, [stockId, router]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // Handle print GRN
  const handlePrintGRN = () => {
    if (!stock) return;
    printGRN(
      {
        ...stock,
        quantityAdded: Number(stock.quantityAdded),
        quantityRemaining: Number(stock.quantityRemaining),
        buyingPricePerUnit: Number(stock.buyingPricePerUnit),
        sellingPricePerUnit: Number(stock.sellingPricePerUnit),
        totalCost: Number(stock.totalCost),
        amountPaid: Number(stock.amountPaid),
      },
      shopSettings
    );
  };

  // Handle record payment
  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setPaymentLoading(true);
    try {
      const result = await recordStockPayment({
        stockId,
        amountPaid: amount,
        paymentMethod: paymentMethod as "CASH" | "BANK_TRANSFER" | "CHECK",
        notes: paymentNotes || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Payment recorded successfully");
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setPaymentNotes("");
      fetchStock();
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle return to supplier
  const handleReturn = async () => {
    const qty = parseFloat(returnQuantity);
    const refund = parseFloat(refundAmount);

    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (refund < 0) {
      toast.error("Refund amount cannot be negative");
      return;
    }

    setReturnLoading(true);
    try {
      const result = await returnStockToSupplier({
        stockId,
        quantityReturned: qty,
        reason: returnReason as "DAMAGED" | "WRONG_ITEM" | "EXCESS" | "OTHER",
        refundAmount: refund || 0,
        refundMethod: refundMethod as "CASH" | "BANK_TRANSFER" | "CREDIT_NOTE",
        notes: returnNotes || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Stock returned. Return #: ${result.supplierReturn?.returnNumber}`
      );
      setShowReturnDialog(false);
      setReturnQuantity("");
      setRefundAmount("");
      setReturnNotes("");
      fetchStock();
    } catch {
      toast.error("Failed to process return");
    } finally {
      setReturnLoading(false);
    }
  };

  if (loading) {
    return <StockDetailSkeleton />;
  }

  if (!stock) {
    return null;
  }

  const totalCost = Number(stock.totalCost);
  const amountPaid = Number(stock.amountPaid);
  const balance = totalCost - amountPaid;
  const remaining = Number(stock.quantityRemaining);
  const isLow = remaining > 0 && remaining < 10;
  const isOut = remaining <= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/stocks")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-mono">
              {stock.grnNumber}
            </h1>
            <p className="text-muted-foreground">
              {stock.product.name} from {stock.supplier.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrintGRN}>
            <Printer className="mr-2 h-4 w-4" />
            Print GRN
          </Button>
          {stock.paymentStatus !== "PAID" && (
            <Button onClick={() => setShowPaymentDialog(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}
          {remaining > 0 && (
            <Button variant="outline" onClick={() => setShowReturnDialog(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Return to Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stock Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium">{stock.product.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier</span>
              <span className="font-medium">{stock.supplier.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplied Date</span>
              <span>{formatDateTime(stock.suppliedDate)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity Added</span>
              <span>
                {formatQuantity(stock.quantityAdded)} {stock.measuringUnit}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Qty Remaining</span>
              <span className={`font-medium ${isOut ? "text-destructive" : isLow ? "text-amber-600" : ""}`}>
                {formatQuantity(remaining)} {stock.measuringUnit}
                {isOut && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    OUT OF STOCK
                  </Badge>
                )}
                {isLow && !isOut && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    LOW
                  </Badge>
                )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buying Price</span>
              <span>{formatCurrency(stock.buyingPricePerUnit)} / {stock.measuringUnit}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Selling Price</span>
              <span>{formatCurrency(stock.sellingPricePerUnit)} / {stock.measuringUnit}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profit Margin</span>
              <span className="text-green-600 font-medium">
                {formatCurrency(
                  Number(stock.sellingPricePerUnit) - Number(stock.buyingPricePerUnit)
                )}{" "}
                / {stock.measuringUnit}
              </span>
            </div>
            {stock.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground text-sm">Notes</span>
                  <p className="mt-1 text-sm">{stock.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Status
            </CardTitle>
            <CardDescription>
              <PaymentStatusBadge status={stock.paymentStatus} />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Cost</span>
              <span className="font-medium">{formatCurrency(totalCost)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="text-green-600 font-medium">
                {formatCurrency(amountPaid)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance Due</span>
              <span className={`font-semibold ${balance > 0 ? "text-destructive" : ""}`}>
                {formatCurrency(balance)}
              </span>
            </div>

            {/* Payment Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Payment Progress</span>
                <span>{totalCost > 0 ? Math.round((amountPaid / totalCost) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stock.paymentStatus === "PAID"
                      ? "bg-green-500"
                      : "bg-amber-500"
                  }`}
                  style={{
                    width: `${totalCost > 0 ? Math.min((amountPaid / totalCost) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Supplier Info */}
            <Separator className="my-4" />
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Supplier Info</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span>{stock.supplier.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Phone</span>
              <span>{stock.supplier.phoneNumber}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            All payments made for this stock entry
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stock.payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No payments recorded yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDateTime(payment.paymentDate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.paymentMethod.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amountPaid)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {payment.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Supplier Returns Table */}
      {stock.supplierReturns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Supplier Returns</CardTitle>
            <CardDescription>
              Quantities returned to supplier from this stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Qty Returned</TableHead>
                  <TableHead className="text-right">Refund</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.supplierReturns.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-mono">{ret.returnNumber}</TableCell>
                    <TableCell>{formatDate(ret.returnDate)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ret.reason.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatQuantity(ret.quantityReturned)} {stock.measuringUnit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(ret.refundAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ret.refundMethod.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── Record Payment Dialog ──────────────────────────────── */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Outstanding balance: {formatCurrency(balance)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={balance}
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(balance.toFixed(2))}
                >
                  Pay Full ({formatCurrency(balance)})
                </Button>
              </div>
            </div>
            <div>
              <Label>Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={paymentLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={paymentLoading}>
              {paymentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Return to Supplier Dialog ──────────────────────────── */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to Supplier</DialogTitle>
            <DialogDescription>
              Available quantity: {formatQuantity(remaining)} {stock.measuringUnit}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quantity to Return *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                placeholder="0.00"
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label>Reason *</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                  <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                  <SelectItem value="EXCESS">Excess Stock</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Refund Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Refund Method *</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReturnDialog(false)}
              disabled={returnLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReturn}
              disabled={returnLoading}
            >
              {returnLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}