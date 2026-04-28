"use client";

import { useState, useCallback, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Printer, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDateTime, formatDate, formatQuantity } from "@/lib/format";
import { getSupplierBillById, recordBillPayment } from "@/actions/supplier-bills";
import { getAvailableCredit } from "@/actions/credit-notes";
import { printBillGRN } from "@/components/receipts/bill-grn-receipt";
import { getShopSettings } from "@/actions/settings";

export default function SupplierBillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availableCredit, setAvailableCredit] = useState(0);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Payment dialog state
  const [cashAmount, setCashAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [useCredit, setUseCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const fetchBill = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSupplierBillById(id);
      if (result.success && result.data) {
        setBill(result.data);

        const creditResult = await getAvailableCredit(result.data.supplier.id);
        setAvailableCredit(creditResult.availableCredit);
      } else {
        toast.error("Bill not found");
        router.push("/supplier-bills");
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const handleRecordPayment = async () => {
    const creditToApply = useCredit ? parseFloat(creditAmount) || 0 : 0;
    const totalPayment = cashAmount + creditToApply;

    if (totalPayment <= 0) {
      toast.error("Enter cash or credit amount");
      return;
    }

    if (creditToApply > availableCredit) {
      toast.error("Insufficient credit available");
      return;
    }

    const outstanding = bill.totalCost - bill.amountPaid;
    if (totalPayment > outstanding + 0.01) {
      toast.error("Payment exceeds outstanding balance");
      return;
    }

    setPaymentLoading(true);
    try {
      const result = await recordBillPayment({
        billId: id,
        amountPaid: cashAmount,
        paymentMethod: paymentMethod as any,
        creditToApply: creditToApply > 0 ? creditToApply : undefined,
        notes: paymentNotes || undefined,
      });

      if (result.success && result.data) {
        toast.success("Payment recorded successfully");
        setBill(result.data);
        setShowPaymentDialog(false);
        setCashAmount(0);
        setCreditAmount("");
        setPaymentNotes("");
        setUseCredit(false);
        await fetchBill();
      } else {
        toast.error(result.error || "Failed to record payment");
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePrintGRN = async () => {
    try {
      const settingsResult = await getShopSettings();
      const settings = settingsResult.success ? settingsResult.data : null;

      printBillGRN(bill, {
        shopName: settings?.shopName || "Shop",
        address: settings?.address || "",
        phone: settings?.phone || "",
      });
    } catch (error) {
      toast.error("Failed to print GRN");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Bill not found</p>
      </div>
    );
  }

  const isPaid = bill.paymentStatus === "PAID";
  const outstanding = bill.totalCost - bill.amountPaid;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/supplier-bills")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-mono">{bill.billNumber}</h1>
            <p className="text-muted-foreground mt-1">
              {bill.supplier.name}
              {bill.supplierInvoiceRef && ` — Inv: ${bill.supplierInvoiceRef}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintGRN}>
            <Printer className="mr-2 h-4 w-4" />
            Print Bill GRN
          </Button>
          {!isPaid && (
            <Button size="sm" onClick={() => setShowPaymentDialog(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Two Column Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bill Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bill Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-medium cursor-pointer hover:underline" onClick={() => router.push(`/suppliers/${bill.supplier.id}`)}>
                {bill.supplier.name}
              </p>
              <p className="text-sm text-muted-foreground">{bill.supplier.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date Received</p>
              <p className="font-medium">{formatDateTime(bill.createdAt)}</p>
            </div>
            {bill.supplierInvoiceRef && (
              <div>
                <p className="text-sm text-muted-foreground">Supplier Invoice Ref</p>
                <p className="font-medium">{bill.supplierInvoiceRef}</p>
              </div>
            )}
            {bill.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{bill.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Financial Summary</CardTitle>
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
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Cost</span>
              <span className="font-medium">{formatCurrency(bill.totalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount Paid</span>
              <span className="font-medium">{formatCurrency(bill.amountPaid)}</span>
            </div>
            <Separator />
            <div className={`flex justify-between font-medium ${outstanding > 0 ? "text-destructive" : ""}`}>
              <span>Balance Due</span>
              <span>{outstanding > 0 ? formatCurrency(outstanding) : "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Received */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Products Received</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN #</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty Added</TableHead>
                  <TableHead className="text-right">Qty Remaining</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Buy Price</TableHead>
                  <TableHead className="text-right">Sell Price</TableHead>
                  <TableHead className="text-right">Line Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.stocks.map((stock: any) => (
                  <TableRow
                    key={stock.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/stocks/${stock.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {stock.grnNumber}
                    </TableCell>
                    <TableCell>{stock.product.name}</TableCell>
                    <TableCell className="text-right">{formatQuantity(stock.quantityAdded, stock.measuringUnit)}</TableCell>
                    <TableCell className="text-right">{formatQuantity(stock.quantityRemaining, stock.measuringUnit)}</TableCell>
                    <TableCell>{stock.measuringUnit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(stock.buyingPricePerUnit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(stock.sellingPricePerUnit)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(stock.totalCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {bill.payments && bill.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
                  {bill.payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">{formatDateTime(payment.paymentDate)}</TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline">{payment.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(payment.amountPaid)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{payment.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Outstanding Balance */}
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <p className="text-sm text-muted-foreground">Outstanding Balance</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(outstanding)}
              </p>
            </div>

            {/* Cash Amount */}
            <div>
              <Label>Cash Amount (Rs.)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={cashAmount || ""}
                onChange={(e) => setCashAmount(e.target.valueAsNumber || 0)}
              />
            </div>

            {/* Payment Method */}
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

            {/* Credit Notes */}
            {availableCredit > 0 && (
              <Card className="border-blue-200">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <Label className="text-sm font-medium">Apply Credit Notes</Label>
                    </div>
                    <Switch
                      checked={useCredit}
                      onCheckedChange={(checked) => {
                        setUseCredit(checked);
                        if (!checked) setCreditAmount("");
                      }}
                    />
                  </div>

                  {useCredit && (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={Math.min(availableCredit, outstanding - cashAmount)}
                        placeholder="0.00"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Available: {formatCurrency(availableCredit)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Summary */}
            {cashAmount > 0 || creditAmount > "0" ? (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
                    Payment Summary
                  </div>
                  {cashAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Cash</span>
                      <span>{formatCurrency(cashAmount)}</span>
                    </div>
                  )}
                  {creditAmount > "0" && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Credit</span>
                      <span>{formatCurrency(parseFloat(creditAmount))}</span>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex justify-between font-medium">
                    <span>Total Payment</span>
                    <span>
                      {formatCurrency(cashAmount + (parseFloat(creditAmount) || 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Notes */}
            <div>
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Enter payment notes..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-4">
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
