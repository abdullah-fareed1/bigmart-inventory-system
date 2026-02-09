// src/app/(dashboard)/stocks/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Loader2,
  Printer,
  CreditCard as CreditCardIcon,
  Undo2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import {
  getStockById,
  recordStockPayment,
  returnStockToSupplier,
  type StockDetail,
} from "@/actions/stocks";
import { getAvailableCredit } from "@/actions/credit-notes";
import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format";
import { printGRN } from "@/components/receipts/grn-receipt";
import { printSupplierReturn } from "@/components/receipts/supplier-return-receipt";

// ─── Helpers ─────────────────────────────────────────────────────

function PaymentStatusBadge({ status }: { status: string }) {
  const variant =
    status === "PAID"
      ? "default"
      : status === "PARTIAL"
        ? "secondary"
        : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}

function RefundMethodBadge({ method }: { method: string }) {
  const labels: Record<string, string> = {
    DEBT_OFFSET: "Debt Offset",
    CASH: "Cash Refund",
    BANK_TRANSFER: "Bank Transfer",
    CREDIT_NOTE: "Credit Note",
  };
  return <Badge variant="outline">{labels[method] || method}</Badge>;
}

function StockDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stockId = params.id as string;

  const [stock, setStock] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  // Credit in payment
  const [availableCredit, setAvailableCredit] = useState(0);
  const [usePaymentCredit, setUsePaymentCredit] = useState(false);
  const [paymentCreditAmount, setPaymentCreditAmount] = useState("");

  // Return dialog
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnReason, setReturnReason] = useState("DAMAGED");
  const [refundMethod, setRefundMethod] = useState("CREDIT_NOTE");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);

  // Fetch
  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStockById(stockId);
      if (result.error || !result.stock) {
        toast.error(result.error || "Stock not found");
        router.push("/stocks");
        return;
      }
      setStock(result.stock as StockDetail);
    } catch {
      toast.error("Failed to load stock details");
    } finally {
      setLoading(false);
    }
  }, [stockId, router]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // Fetch credit when opening payment dialog
  const openPaymentDialog = async () => {
    if (stock) {
      const res = await getAvailableCredit(stock.supplier.id);
      setAvailableCredit(res.availableCredit);
    }
    setShowPaymentDialog(true);
  };

  // ── Record Payment ──────────────────────────────────────────
  const handleRecordPayment = async () => {
    const cashAmount = parseFloat(paymentAmount) || 0;
    const creditApply = usePaymentCredit
      ? parseFloat(paymentCreditAmount) || 0
      : 0;

    if (cashAmount <= 0 && creditApply <= 0) {
      toast.error("Please enter a payment amount or apply credit");
      return;
    }

    setPaymentLoading(true);
    try {
      const result = await recordStockPayment({
        stockId,
        amountPaid: cashAmount > 0 ? cashAmount : 0.01, // schema requires positive
        paymentMethod: paymentMethod as "CASH" | "BANK_TRANSFER" | "CHECK",
        creditToApply: creditApply > 0 ? creditApply : undefined,
        notes: paymentNotes || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      let msg = "Payment recorded successfully";
      if (creditApply > 0) {
        msg += ` (${formatCurrency(creditApply)} from credit notes)`;
      }
      toast.success(msg);
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setPaymentCreditAmount("");
      setUsePaymentCredit(false);
      setPaymentNotes("");
      fetchStock();
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Return to Supplier ──────────────────────────────────────
  const handleReturn = async () => {
    const qty = parseFloat(returnQuantity);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    setReturnLoading(true);
    try {
      const stockIsPaid = stock?.paymentStatus === "PAID";
      const result = await returnStockToSupplier({
        stockId,
        quantityReturned: qty,
        reason: returnReason as "DAMAGED" | "WRONG_ITEM" | "EXCESS" | "OTHER",
        ...(stockIsPaid && {
          refundMethod: refundMethod as
            | "CASH"
            | "BANK_TRANSFER"
            | "CREDIT_NOTE",
        }),
        notes: returnNotes || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }

      let message = `Return #${result.supplierReturn?.returnNumber} processed.`;
      if (result.creditNote) {
        message += ` Credit Note ${result.creditNote.creditNoteNumber} created (${formatCurrency(result.creditNote.originalAmount)}).`;
      }
      if (result.refundMethod === "DEBT_OFFSET") {
        message += ` ${formatCurrency(result.refundAmount || 0)} offset from outstanding debt.`;
      }
      toast.success(message, { duration: 6000 });
      setShowReturnDialog(false);
      setReturnQuantity("");
      setReturnNotes("");
      fetchStock();
    } catch {
      toast.error("Failed to process return");
    } finally {
      setReturnLoading(false);
    }
  };

  // ── Print ───────────────────────────────────────────────────
  const shopSettings = {
    shopName: "Bigmart Textiles",
    address: "123 Main Street, Colombo 07",
    phone: "0112345678",
  };

  const handlePrintGRN = () => {
    if (!stock) return;
    printGRN(stock, shopSettings);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePrintReturn = (ret: any) => {
    if (!stock) return;
    printSupplierReturn(
      {
        returnNumber: ret.returnNumber,
        returnDate: ret.returnDate,
        quantityReturned: ret.quantityReturned,
        reason: ret.reason,
        refundAmount: ret.refundAmount,
        refundMethod: ret.refundMethod,
        notes: ret.notes,
        product: stock.product,
        supplier: stock.supplier,
        stock: {
          grnNumber: stock.grnNumber,
          measuringUnit: stock.measuringUnit,
          buyingPricePerUnit: Number(stock.buyingPricePerUnit),
        },
        creditNote: ret.creditNote || null,
      },
      shopSettings
    );
  };

  if (loading) return <StockDetailSkeleton />;
  if (!stock) return null;

  // ── Computed ────────────────────────────────────────────────
  const totalCost = Number(stock.totalCost);
  const amountPaid = Number(stock.amountPaid);
  const remaining = Number(stock.quantityRemaining);
  const buyingPrice = Number(stock.buyingPricePerUnit);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRefunded = (stock as any).totalRefunded || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalReturnedQty = (stock as any).totalReturnedQty || 0;
  const balanceDue = parseFloat(Math.max(0, totalCost - amountPaid).toFixed(2));
  const isPaid = stock.paymentStatus === "PAID";

  // Return preview
  const returnQtyNum = parseFloat(returnQuantity) || 0;
  const previewRefund = parseFloat((returnQtyNum * buyingPrice).toFixed(2));
  const outstandingDebt = balanceDue;

  // Payment dialog credit
  const payCashNum = parseFloat(paymentAmount) || 0;
  const payCreditNum = usePaymentCredit
    ? parseFloat(paymentCreditAmount) || 0
    : 0;
  const payMaxCredit = Math.min(availableCredit, balanceDue - payCashNum);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/stocks")}
          >
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handlePrintGRN}>
            <Printer className="mr-2 h-4 w-4" /> Print GRN
          </Button>
          {!isPaid && (
            <Button onClick={openPaymentDialog}>
              <CreditCardIcon className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          )}
          {remaining > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowReturnDialog(true)}
            >
              <Undo2 className="mr-2 h-4 w-4" /> Return to Supplier
            </Button>
          )}
        </div>
      </div>

      {/* ── Cards Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium">{stock.product.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Supplier</span>
              <span>{stock.supplier.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date Received</span>
              <span>{formatDateTime(stock.suppliedDate)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Qty Added</span>
              <span>
                {formatQuantity(stock.quantityAdded)} {stock.measuringUnit}
              </span>
            </div>
            {totalReturnedQty > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Qty Returned</span>
                <span className="text-destructive">
                  -{formatQuantity(totalReturnedQty)} {stock.measuringUnit}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Qty Remaining</span>
              <span
                className={`font-medium ${remaining <= 0 ? "text-destructive" : remaining < 10 ? "text-amber-600" : ""}`}
              >
                {formatQuantity(remaining)} {stock.measuringUnit}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Buying Price/Unit</span>
              <span>{formatCurrency(buyingPrice)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Selling Price/Unit</span>
              <span>{formatCurrency(stock.sellingPricePerUnit)}</span>
            </div>
            {stock.notes && (
              <>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes: </span>
                  {stock.notes}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <PaymentStatusBadge status={stock.paymentStatus} />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Cost</span>
              <span className="font-medium">{formatCurrency(totalCost)}</span>
            </div>
            {totalRefunded > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Refunded</span>
                <span className="text-green-600 font-medium">
                  -{formatCurrency(totalRefunded)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium">{formatCurrency(amountPaid)}</span>
            </div>
            {balanceDue > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">
                  Balance Due
                </span>
                <span className="text-destructive font-bold text-base">
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            )}
            {balanceDue <= 0 && totalCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="text-green-600 font-medium">
                  Fully Settled
                </span>
              </div>
            )}
            {totalReturnedQty > 0 && (
              <>
                <Separator />
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Return Summary
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Qty Returned</span>
                  <span>
                    {formatQuantity(totalReturnedQty)} {stock.measuringUnit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Refund Value</span>
                  <span>{formatCurrency(totalRefunded)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Payment History ────────────────────────────────── */}
      {stock.payments && stock.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
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
                {stock.payments.map(
                  (payment: Record<string, unknown>, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm">
                        {formatDateTime(payment.paymentDate as string | Date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            payment.paymentMethod === "CREDIT_NOTE"
                              ? "secondary"
                              : payment.paymentMethod === "DEBT_OFFSET"
                                ? "outline"
                                : "default"
                          }
                        >
                          {payment.paymentMethod === "CREDIT_NOTE"
                            ? "Credit Note"
                            : payment.paymentMethod === "DEBT_OFFSET"
                              ? "Debt Offset"
                              : (payment.paymentMethod as string)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amountPaid as number)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(payment.notes as string) || "—"}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Supplier Returns ───────────────────────────────── */}
      {stock.supplierReturns && stock.supplierReturns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Supplier Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Refund</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Credit Note</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.supplierReturns.map(
                  (ret: Record<string, unknown>, idx: number) => {
                    const cn = ret.creditNote as {
                      creditNoteNumber: string;
                      originalAmount: number;
                    } | null;
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">
                          {ret.returnNumber as string}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(ret.returnDate as string | Date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {ret.reason as string}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatQuantity(ret.quantityReturned as number)}{" "}
                          {stock.measuringUnit}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(ret.refundAmount as number)}
                        </TableCell>
                        <TableCell>
                          <RefundMethodBadge
                            method={ret.refundMethod as string}
                          />
                        </TableCell>
                        <TableCell>
                          {cn ? (
                            <span className="text-sm font-mono text-blue-600">
                              {cn.creditNoteNumber}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePrintReturn(ret)}
                            title="Print return note"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Record Payment Dialog ──────────────────────────── */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Outstanding: {formatCurrency(balanceDue)}
              {availableCredit > 0 && (
                <span className="ml-2 text-blue-600">
                  · Credit available: {formatCurrency(availableCredit)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cash/Bank Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={balanceDue}
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
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

            {/* Credit Note Section */}
            {availableCredit > 0 && (
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCardIcon className="h-4 w-4 text-blue-600" />
                      <Label className="text-sm font-medium">
                        Apply Credit Notes
                      </Label>
                    </div>
                    <Switch
                      checked={usePaymentCredit}
                      onCheckedChange={(checked) => {
                        setUsePaymentCredit(checked);
                        if (!checked) setPaymentCreditAmount("");
                      }}
                    />
                  </div>
                  {usePaymentCredit && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={payMaxCredit > 0 ? payMaxCredit : 0}
                        placeholder="0.00"
                        value={paymentCreditAmount}
                        onChange={(e) =>
                          setPaymentCreditAmount(e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPaymentCreditAmount(
                            Math.max(0, payMaxCredit).toFixed(2)
                          )
                        }
                      >
                        Max
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Summary */}
            {(payCashNum > 0 || payCreditNum > 0) && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Payment Summary
                </div>
                {payCashNum > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Cash / {paymentMethod.replace("_", " ")}</span>
                    <span>{formatCurrency(payCashNum)}</span>
                  </div>
                )}
                {payCreditNum > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Credit Notes</span>
                    <span>{formatCurrency(payCreditNum)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Payment</span>
                  <span>
                    {formatCurrency(payCashNum + payCreditNum)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Remaining after
                  </span>
                  <span>
                    {formatCurrency(
                      Math.max(0, balanceDue - payCashNum - payCreditNum)
                    )}
                  </span>
                </div>
              </div>
            )}

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
            <Button
              onClick={handleRecordPayment}
              disabled={
                paymentLoading ||
                (payCashNum <= 0 && payCreditNum <= 0)
              }
            >
              {paymentLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Return to Supplier Dialog ──────────────────────── */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to Supplier</DialogTitle>
            <DialogDescription>
              Available: {formatQuantity(remaining)} {stock.measuringUnit} ·
              Buying price: {formatCurrency(buyingPrice)}/{stock.measuringUnit}
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
              <p className="text-xs text-muted-foreground mt-1">
                Max: {formatQuantity(remaining)} {stock.measuringUnit}
              </p>
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

            {isPaid && (
              <div>
                <Label>Refund Method *</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash Refund</SelectItem>
                    <SelectItem value="BANK_TRANSFER">
                      Bank Transfer
                    </SelectItem>
                    <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Credit Note can be used against future purchases from this
                  supplier.
                </p>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>

            {returnQtyNum > 0 && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Refund Preview
                </div>
                <div className="flex justify-between text-sm">
                  <span>Refund Amount</span>
                  <span className="font-bold">
                    {formatQuantity(returnQtyNum)} ×{" "}
                    {formatCurrency(buyingPrice)} ={" "}
                    {formatCurrency(previewRefund)}
                  </span>
                </div>
                {!isPaid && outstandingDebt > 0 && (
                  <>
                    <Separator />
                    {previewRefund <= outstandingDebt ? (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Debt reduced by</span>
                        <span className="font-medium">
                          {formatCurrency(previewRefund)}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Debt cleared</span>
                          <span>{formatCurrency(outstandingDebt)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-blue-600">
                          <span>Credit Note created</span>
                          <span>
                            {formatCurrency(previewRefund - outstandingDebt)}
                          </span>
                        </div>
                      </>
                    )}
                  </>
                )}
                {isPaid && refundMethod === "CREDIT_NOTE" && (
                  <div className="text-xs text-blue-600">
                    A credit note for {formatCurrency(previewRefund)} will be
                    created for {stock.supplier.name}.
                  </div>
                )}
              </div>
            )}
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
              disabled={
                returnLoading ||
                returnQtyNum <= 0 ||
                returnQtyNum > remaining
              }
            >
              {returnLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}