// src/app/(dashboard)/stocks/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  CreditCard,
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
    status === "PAID" ? "default" : status === "PARTIAL" ? "secondary" : "destructive";
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

  // Payment credit note
  const [paymentAvailableCredit, setPaymentAvailableCredit] = useState(0);
  const [paymentUseCredit, setPaymentUseCredit] = useState(false);
  const [paymentCreditAmount, setPaymentCreditAmount] = useState("");

  // Return dialog
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnReason, setReturnReason] = useState("DAMAGED");
  const [refundMethod, setRefundMethod] = useState("CREDIT_NOTE");
  // Update default refund method when stock loads
  useEffect(() => {
    if (stock && stock.paymentStatus !== "PAID") {
      setRefundMethod("DEBT_OFFSET");
    } else {
      setRefundMethod("CREDIT_NOTE");
    }
  }, [stock]);
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

  useEffect(() => { fetchStock(); }, [fetchStock]);

  // Fetch available credit when opening payment dialog
  const openPaymentDialog = async () => {
    setShowPaymentDialog(true);
    if (stock) {
      try {
        const result = await getAvailableCredit(stock.supplier.id);
        setPaymentAvailableCredit(result.availableCredit);
      } catch {
        setPaymentAvailableCredit(0);
      }
    }
  };

  // ── Record Payment ──────────────────────────────────────────
  const handleRecordPayment = async () => {
    const cashAmount = parseFloat(paymentAmount) || 0;
    const creditApply = paymentUseCredit ? (parseFloat(paymentCreditAmount) || 0) : 0;
    const totalPayment = cashAmount + creditApply;

    if (totalPayment <= 0) {
      toast.error("Please enter a payment amount (cash and/or credit)");
      return;
    }
    if (cashAmount < 0 || creditApply < 0) {
      toast.error("Amounts cannot be negative");
      return;
    }

    setPaymentLoading(true);
    try {
      const result = await recordStockPayment({
        stockId,
        amountPaid: cashAmount,
        paymentMethod: paymentMethod as "CASH" | "BANK_TRANSFER" | "CHECK",
        creditToApply: creditApply > 0 ? creditApply : undefined,
        notes: paymentNotes || undefined,
      });
      if (result.error) { toast.error(result.error); return; }

      let msg = "Payment recorded successfully";
      if (creditApply > 0) msg += ` (${formatCurrency(creditApply)} from credit notes)`;
      toast.success(msg);

      setShowPaymentDialog(false);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentUseCredit(false);
      setPaymentCreditAmount("");
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
    if (!qty || qty <= 0) { toast.error("Please enter a valid quantity"); return; }
    setReturnLoading(true);
    try {
      const result = await returnStockToSupplier({
        stockId,
        quantityReturned: qty,
        reason: returnReason as "DAMAGED" | "WRONG_ITEM" | "EXCESS" | "OTHER",
        refundMethod: refundMethod as "CASH" | "BANK_TRANSFER" | "CREDIT_NOTE" | "DEBT_OFFSET",
        notes: returnNotes || undefined,
      });
      if (result.error) { toast.error(result.error); return; }

      let message = `Return #${result.supplierReturn?.returnNumber} processed.`;
      if (result.creditNote) {
        message += ` Credit Note ${result.creditNote.creditNoteNumber} (${formatCurrency(result.creditNote.originalAmount)}).`;
      }
      if (result.refundMethod === "DEBT_OFFSET") {
        message += ` ${formatCurrency(result.refundAmount || 0)} offset from debt.`;
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

  // ── Print GRN ───────────────────────────────────────────────
  const handlePrintGRN = () => {
    if (!stock) return;
    const shopSettings = { shopName: "Bigmart Textiles", address: "123 Main Street, Colombo 07", phone: "0112345678" };
    printGRN(stock, shopSettings);
  };

  // ── Print Supplier Return ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePrintReturn = (ret: any) => {
    if (!stock) return;
    const shopSettings = { shopName: "Bigmart Textiles", address: "123 Main Street, Colombo 07", phone: "0112345678" };
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
        creditNote: ret.creditNote,
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

  // Return dialog preview
  const returnQtyNum = parseFloat(returnQuantity) || 0;
  const previewRefund = parseFloat((returnQtyNum * buyingPrice).toFixed(2));
  const outstandingDebt = balanceDue;

  // Payment dialog credit calc
  const paymentCreditApply = paymentUseCredit ? (parseFloat(paymentCreditAmount) || 0) : 0;
  const paymentCashAmount = parseFloat(paymentAmount) || 0;
  const paymentMaxCredit = Math.min(paymentAvailableCredit, balanceDue - paymentCashAmount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/stocks")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-mono">{stock.grnNumber}</h1>
            <p className="text-muted-foreground">{stock.product.name} from {stock.supplier.name}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handlePrintGRN}>
            <Printer className="mr-2 h-4 w-4" /> Print GRN
          </Button>
          {stock.supplierBillId ? (
            <Button
              variant="outline"
              onClick={() => router.push(`/supplier-bills/${stock.supplierBillId}`)}
            >
              <FileText className="mr-2 h-4 w-4" /> View Bill
            </Button>
          ) : (
            !isPaid && (
              <Button onClick={openPaymentDialog}>
                <CreditCard className="mr-2 h-4 w-4" /> Record Payment
              </Button>
            )
          )}
          {remaining > 0 && (
            <Button variant="destructive" onClick={() => setShowReturnDialog(true)}>
              <Undo2 className="mr-2 h-4 w-4" /> Return to Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Details */}
        <Card>
          <CardHeader><CardTitle>Stock Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Product</span><span className="font-medium">{stock.product.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Supplier</span><span>{stock.supplier.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Date Received</span><span>{formatDateTime(stock.suppliedDate)}</span></div>
            <Separator />
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Qty Added</span><span>{formatQuantity(stock.quantityAdded)} {stock.measuringUnit}</span></div>
            {totalReturnedQty > 0 && (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Qty Returned</span><span className="text-destructive">-{formatQuantity(totalReturnedQty)} {stock.measuringUnit}</span></div>)}
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Qty Remaining</span><span className={`font-medium ${remaining <= 0 ? "text-destructive" : remaining < 10 ? "text-amber-600" : ""}`}>{formatQuantity(remaining)} {stock.measuringUnit}</span></div>
            <Separator />
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Buying Price/Unit</span><span>{formatCurrency(buyingPrice)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Selling Price/Unit</span><span>{formatCurrency(stock.sellingPricePerUnit)}</span></div>
            {stock.notes && (<><Separator /><div className="text-sm"><span className="text-muted-foreground">Notes: </span><span>{stock.notes}</span></div></>)}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between">Financial Summary <PaymentStatusBadge status={stock.paymentStatus} /></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Cost (Original)</span><span className="font-medium">{formatCurrency(totalCost)}</span></div>
            {totalRefunded > 0 && (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Refunded</span><span className="text-green-600 font-medium">-{formatCurrency(totalRefunded)}</span></div>)}
            {totalRefunded > 0 && (<div className="flex justify-between text-sm border-t pt-2"><span className="text-muted-foreground">Net Payable</span><span className="font-medium">{formatCurrency(Math.max(0, totalCost - totalRefunded))}</span></div>)}
            <Separator />
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount Paid</span><span className="font-medium">{formatCurrency(amountPaid)}</span></div>
            {balanceDue > 0 && (<div className="flex justify-between text-sm"><span className="text-muted-foreground font-medium">Balance Due</span><span className="text-destructive font-bold text-base">{formatCurrency(balanceDue)}</span></div>)}
            {balanceDue <= 0 && totalCost > 0 && (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><span className="text-green-600 font-medium">Fully Settled</span></div>)}
            {totalReturnedQty > 0 && (
              <><Separator />
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Return Summary</div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Qty Returned</span><span>{formatQuantity(totalReturnedQty)} {stock.measuringUnit}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Refund Value</span><span>{formatCurrency(totalRefunded)}</span></div></>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Part of Supplier Bill Card */}
      {stock.supplierBill && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Part of Supplier Bill
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This stock was received as part of{" "}
              <Button
                variant="link"
                className="h-auto p-0 font-mono"
                onClick={() => router.push(`/supplier-bills/${stock.supplierBill!.id}`)}
              >
                {stock.supplierBill.billNumber}
              </Button>
              . Payment is managed at the bill level.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {stock.payments && stock.payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {stock.payments.map((payment: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">{formatDateTime(payment.paymentDate)}</TableCell>
                    <TableCell>
                      <Badge variant={payment.paymentMethod === "CREDIT_NOTE" ? "default" : payment.paymentMethod === "DEBT_OFFSET" ? "secondary" : "outline"}>
                        {payment.paymentMethod === "CREDIT_NOTE" ? "Credit Note" : payment.paymentMethod === "DEBT_OFFSET" ? "Debt Offset" : payment.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(payment.amountPaid)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{payment.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Supplier Returns History */}
      {stock.supplierReturns && stock.supplierReturns.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Supplier Returns</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Return #</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Refund</TableHead><TableHead>Method</TableHead><TableHead>Credit Note</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {stock.supplierReturns.map((ret: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{ret.returnNumber}</TableCell>
                    <TableCell className="text-sm">{formatDateTime(ret.returnDate)}</TableCell>
                    <TableCell><Badge variant="secondary">{ret.reason}</Badge></TableCell>
                    <TableCell className="text-right">{formatQuantity(ret.quantityReturned)} {stock.measuringUnit}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(ret.refundAmount)}</TableCell>
                    <TableCell><RefundMethodBadge method={ret.refundMethod} /></TableCell>
                    <TableCell>
                      {ret.creditNote ? (
                        <span className="text-sm font-mono text-blue-600">{ret.creditNote.creditNoteNumber}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrintReturn(ret)} title="Print Return Note">
                        <Printer className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── Record Payment Dialog ──────────────────────────── */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Outstanding: {formatCurrency(balanceDue)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cash/Bank Amount</Label>
              <Input
                type="number" step="0.01" min="0" max={balanceDue}
                placeholder="0.00" value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHECK">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Credit Note Option */}
            {paymentAvailableCredit > 0 && (
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Apply Credit Notes</span>
                    <Badge variant="default" className="bg-blue-600 text-xs">
                      {formatCurrency(paymentAvailableCredit)} available
                    </Badge>
                  </div>
                  <Switch checked={paymentUseCredit} onCheckedChange={(v) => {
                    setPaymentUseCredit(v);
                    if (!v) setPaymentCreditAmount("");
                  }} />
                </div>
                {paymentUseCredit && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="0.01" min="0.01"
                        max={Math.max(0, paymentMaxCredit)}
                        placeholder="0.00" value={paymentCreditAmount}
                        onChange={(e) => setPaymentCreditAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" size="sm"
                        onClick={() => setPaymentCreditAmount(Math.max(0, paymentMaxCredit).toFixed(2))}>
                        Max
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Max applicable: {formatCurrency(Math.max(0, paymentMaxCredit))}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Payment Summary */}
            {(paymentCashAmount > 0 || paymentCreditApply > 0) && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase">Payment Summary</div>
                {paymentCashAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{paymentMethod === "CHECK" ? "Check" : paymentMethod === "BANK_TRANSFER" ? "Bank Transfer" : "Cash"}</span>
                    <span>{formatCurrency(paymentCashAmount)}</span>
                  </div>
                )}
                {paymentCreditApply > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Credit Note</span>
                    <span>{formatCurrency(paymentCreditApply)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>Total Payment</span>
                  <span>{formatCurrency(paymentCashAmount + paymentCreditApply)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Remaining after</span>
                  <span>{formatCurrency(Math.max(0, balanceDue - paymentCashAmount - paymentCreditApply))}</span>
                </div>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={paymentLoading}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={paymentLoading}>
              {paymentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Return Dialog ──────────────────────────────────── */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to Supplier</DialogTitle>
            <DialogDescription>Available: {formatQuantity(remaining)} {stock.measuringUnit} · {formatCurrency(buyingPrice)}/{stock.measuringUnit}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quantity to Return *</Label>
              <Input type="number" step="0.01" min="0.01" max={remaining} placeholder="0.00" value={returnQuantity} onChange={(e) => setReturnQuantity(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Max: {formatQuantity(remaining)} {stock.measuringUnit}</p>
            </div>
            <div>
              <Label>Reason *</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAMAGED">Damaged</SelectItem>
                  <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                  <SelectItem value="EXCESS">Excess Stock</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Refund Method *</Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {!isPaid && outstandingDebt > 0 && (
                    <SelectItem value="DEBT_OFFSET">Debt Offset (Reduce Outstanding)</SelectItem>
                  )}
                  <SelectItem value="CREDIT_NOTE">Credit Note (Use Later)</SelectItem>
                  <SelectItem value="CASH">Cash Refund</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {refundMethod === "DEBT_OFFSET"
                  ? "Refund will reduce what you owe for this stock."
                  : refundMethod === "CREDIT_NOTE"
                    ? "Credit note can be used against future purchases from this supplier."
                    : "Supplier will refund directly."}
              </p>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
            </div>
            {returnQtyNum > 0 && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase">Refund Preview</div>
                <div className="flex justify-between text-sm">
                  <span>Refund Amount</span>
                  <span className="font-bold">{formatQuantity(returnQtyNum)} × {formatCurrency(buyingPrice)} = {formatCurrency(previewRefund)}</span>
                </div>
                {!isPaid && outstandingDebt > 0 && refundMethod === "DEBT_OFFSET" && (
                  <>
                    <Separator />
                    {previewRefund <= outstandingDebt ? (
                      <div className="flex justify-between text-sm text-green-600"><span>Debt reduced by</span><span className="font-medium">{formatCurrency(previewRefund)}</span></div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm text-green-600"><span>Debt cleared</span><span className="font-medium">{formatCurrency(outstandingDebt)}</span></div>
                        <div className="flex justify-between text-sm text-blue-600"><span>Excess → Credit Note</span><span className="font-medium">{formatCurrency(previewRefund - outstandingDebt)}</span></div>
                      </>
                    )}
                  </>
                )}
                {refundMethod === "CREDIT_NOTE" && (
                  <div className="text-xs text-blue-600">A credit note for {formatCurrency(previewRefund)} will be created for {stock.supplier.name}.</div>
                )}
                {(refundMethod === "CASH" || refundMethod === "BANK_TRANSFER") && (
                  <div className="text-xs text-muted-foreground">Supplier will refund {formatCurrency(previewRefund)} via {refundMethod === "CASH" ? "cash" : "bank transfer"}.</div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)} disabled={returnLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleReturn} disabled={returnLoading || returnQtyNum <= 0 || returnQtyNum > remaining}>
              {returnLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}