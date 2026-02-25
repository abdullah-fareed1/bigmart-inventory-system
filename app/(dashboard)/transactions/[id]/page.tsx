// src/app/(dashboard)/transactions/[id]/page.tsx
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
  Printer,
  User,
  Receipt,
  Crown,
  CreditCard,
  Banknote,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { getTransactionById } from "@/actions/transactions";
import { printSaleReceipt } from "@/components/receipts/sale-receipt";
import { printRefundReceipt } from "@/components/receipts/refund-receipt";
import { RefundDialog } from "@/components/refunds/refund-dialog";
import { formatCurrency, formatDateTime, formatPhone, formatQuantity } from "@/lib/format";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysSince(date: string | Date): number {
  const sale = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  return Math.floor((now.getTime() - sale.getTime()) / (1000 * 60 * 60 * 24));
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case "DAMAGED": return "Damaged";
    case "CHANGE_OF_MIND": return "Change of Mind";
    case "WRONG_ITEM": return "Wrong Item";
    default: return "Other";
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [transaction, setTransaction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  const fetchTransaction = useCallback(async () => {
    setIsLoading(true);
    const result = await getTransactionById(id);
    if (result.success && result.data) {
      setTransaction(result.data);
    } else {
      toast.error("Transaction not found");
      router.push("/transactions");
    }
    setIsLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  // ── Print original receipt ───────────────────────────────────────────────
  const handlePrint = () => {
    if (!transaction) return;
    printSaleReceipt({
      receiptNumber: transaction.receiptNumber,
      saleDateTime: transaction.saleDateTime,
      customerName: transaction.customer?.name,
      customerPhone: transaction.customer?.phoneNumber,
      paymentMethod: transaction.paymentMethod,
      items: transaction.items.map((item: any) => ({
        productName: item.productName,
        quantity: item.quantity,
        measuringUnit: item.measuringUnit,
        pricePerUnit: item.pricePerUnit,
        itemDiscount: item.itemDiscount,
        lineTotal: item.lineTotal,
      })),
      subtotal: transaction.subtotal,
      totalItemDiscount: transaction.totalItemDiscount,
      cartDiscount: transaction.cartDiscount,
      pointsRedeemed: transaction.pointsRedeemed,
      pointsRedeemedValue: transaction.pointsRedeemedValue,
      totalAmount: transaction.totalAmount,
      amountPaid: transaction.amountPaid ?? transaction.totalAmount,
      changeGiven: transaction.changeGiven ?? 0,
      pointsEarned: transaction.pointsEarned,
    });
  };

  // ── Print refund receipt ─────────────────────────────────────────────────
  const handlePrintRefund = (refund: any) => {
    printRefundReceipt({
      refundReceiptNumber: refund.refundReceiptNumber,
      originalReceiptNumber: transaction.receiptNumber,
      refundDate: refund.refundDate,
      customerName: transaction.customer?.name,
      customerPhone: transaction.customer?.phoneNumber,
      refundMethod: refund.refundMethod,
      items: refund.items.map((ri: any) => {
        const orig = transaction.items.find((i: any) => i.id === ri.originalTransactionItemId);
        return {
          productName: ri.productName,
          quantityReturned: ri.quantityReturned,
          measuringUnit: orig?.measuringUnit ?? "m",
          pricePerUnit: ri.pricePerUnit,
          refundAmount: ri.refundAmount,
          isRestocked: ri.isRestocked,
          reason: ri.reason,
        };
      }),
      totalRefundAmount: refund.totalRefundAmount,
      pointsDeducted: refund.pointsDeducted,
    });
  };

  // ── Computed ─────────────────────────────────────────────────────────────
  const totalRefunded = transaction?.refunds?.reduce(
    (sum: number, r: any) => sum + r.totalRefundAmount,
    0
  ) ?? 0;
  const isFullyRefunded = totalRefunded >= (transaction?.totalAmount ?? 0) - 0.01;
  const over14Days = transaction ? daysSince(transaction.saleDateTime) > 14 : false;

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (isLoading || !transaction) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/transactions")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Receipt className="h-6 w-6" />
            <h1 className="text-2xl font-bold font-mono">
              {transaction.receiptNumber}
            </h1>
            {isFullyRefunded && (
              <Badge variant="destructive">Fully Refunded</Badge>
            )}
            {!isFullyRefunded && totalRefunded > 0 && (
              <Badge variant="secondary">Partially Refunded</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDateTime(transaction.saleDateTime)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
          {!isFullyRefunded && (
            <Button
              variant="outline"
              onClick={() => setShowRefundDialog(true)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Refund
            </Button>
          )}
        </div>
      </div>

      {/* 14-day warning banner */}
      {over14Days && !isFullyRefunded && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          This transaction is over 14 days old. The standard return policy has expired.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Transaction Details ──────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Customer */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Customer</span>
              {transaction.customer ? (
                <button
                  className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                  onClick={() =>
                    router.push(`/customers/${transaction.customer.phoneNumber}`)
                  }
                >
                  <User className="h-3.5 w-3.5" />
                  {transaction.customer.name} (
                  {formatPhone(transaction.customer.phoneNumber)})
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">Walk-in</span>
              )}
            </div>

            {/* Payment */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payment</span>
              <Badge variant="outline" className="flex items-center gap-1">
                {transaction.paymentMethod === "CASH" ? (
                  <Banknote className="h-3.5 w-3.5" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5" />
                )}
                {transaction.paymentMethod}
              </Badge>
            </div>

            {/* Points earned */}
            {transaction.pointsEarned > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Points Earned
                </span>
                <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                  <Crown className="h-3.5 w-3.5" />+{transaction.pointsEarned} pts
                </span>
              </div>
            )}

            {/* Points redeemed */}
            {transaction.pointsRedeemed > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Points Redeemed
                </span>
                <span className="text-sm font-medium text-blue-600">
                  -{transaction.pointsRedeemed} pts (
                  {formatCurrency(transaction.pointsRedeemedValue)})
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Payment Summary ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            {transaction.totalItemDiscount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Item Discounts</span>
                <span>-{formatCurrency(transaction.totalItemDiscount)}</span>
              </div>
            )}
            {transaction.cartDiscount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Cart Discount</span>
                <span>-{formatCurrency(transaction.cartDiscount)}</span>
              </div>
            )}
            {transaction.pointsRedeemedValue > 0 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>Points Redemption</span>
                <span>-{formatCurrency(transaction.pointsRedeemedValue)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(transaction.totalAmount)}</span>
            </div>
            {transaction.paymentMethod === "CASH" &&
              transaction.amountPaid != null && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(transaction.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Change Given</span>
                    <span>{formatCurrency(transaction.changeGiven ?? 0)}</span>
                  </div>
                </>
              )}
            {totalRefunded > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-sm font-medium text-red-600">
                  <span>Total Refunded</span>
                  <span>-{formatCurrency(totalRefunded)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Net Amount</span>
                  <span>{formatCurrency(Math.max(0, transaction.totalAmount - totalRefunded))}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Items Table ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Items ({transaction.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.supplierName}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatQuantity(item.quantity)} {item.measuringUnit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.pricePerUnit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.itemDiscount > 0 ? (
                      <span className="text-red-600">
                        -{formatCurrency(item.itemDiscount)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Refunds Section ─────────────────────────────────────────────── */}
      {transaction.refunds && transaction.refunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-red-500" />
              Refunds ({transaction.refunds.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transaction.refunds.map((refund: any) => (
              <div
                key={refund.id}
                className="border rounded-lg p-4 space-y-3"
              >
                {/* Refund header */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-medium text-sm">
                      {refund.refundReceiptNumber}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatDateTime(refund.refundDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{refund.refundMethod}</Badge>
                    <span className="font-semibold text-red-600">
                      -{formatCurrency(refund.totalRefundAmount)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePrintRefund(refund)}
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Refund items */}
                <div className="space-y-1">
                  {refund.items.map((ri: any) => {
                    const orig = transaction.items.find(
                      (i: any) => i.id === ri.originalTransactionItemId
                    );
                    return (
                      <div
                        key={ri.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span>{ri.productName}</span>
                          <span className="text-muted-foreground">
                            {formatQuantity(ri.quantityReturned)}{" "}
                            {orig?.measuringUnit ?? "m"}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {reasonLabel(ri.reason)}
                          </Badge>
                          {ri.isRestocked && (
                            <Badge
                              variant="outline"
                              className="text-xs text-green-700 border-green-200"
                            >
                              Restocked
                            </Badge>
                          )}
                        </div>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(ri.refundAmount)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Points deducted */}
                {refund.pointsDeducted > 0 && (
                  <div className="text-xs text-red-600">
                    Points Deducted: -{refund.pointsDeducted} pts
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Refund Dialog ───────────────────────────────────────────────── */}
      {showRefundDialog && (
        <RefundDialog
          open={showRefundDialog}
          onOpenChange={setShowRefundDialog}
          transaction={{
            id: transaction.id,
            receiptNumber: transaction.receiptNumber,
            saleDateTime: transaction.saleDateTime,
            paymentMethod: transaction.paymentMethod,
            totalAmount: transaction.totalAmount,
            pointsEarned: transaction.pointsEarned,
            customerPhone: transaction.customerPhone,
            customer: transaction.customer,
            items: transaction.items,
          }}
          onRefundCreated={fetchTransaction}
        />
      )}
    </div>
  );
}