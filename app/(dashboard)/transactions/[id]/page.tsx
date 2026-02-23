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
} from "lucide-react";
import { getTransactionById } from "@/actions/transactions";
import { printSaleReceipt } from "@/components/receipts/sale-receipt";
import { formatCurrency, formatDateTime, formatPhone } from "@/lib/format";
import { toast } from "sonner";

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [transaction, setTransaction] = useState<any>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const [isLoading, setIsLoading] = useState(true);

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

  const handlePrint = () => {
    if (!transaction) return;

    printSaleReceipt({
      receiptNumber: transaction.receiptNumber,
      saleDateTime: transaction.saleDateTime,
      customerName: transaction.customer?.name,
      customerPhone: transaction.customer?.phoneNumber,
      paymentMethod: transaction.paymentMethod,
      items: transaction.items.map(
        (item: {
          productName: string;
          quantity: number;
          measuringUnit: string;
          pricePerUnit: number;
          itemDiscount: number;
          lineTotal: number;
        }) => ({
          productName: item.productName,
          quantity: item.quantity,
          measuringUnit: item.measuringUnit,
          pricePerUnit: item.pricePerUnit,
          itemDiscount: item.itemDiscount,
          lineTotal: item.lineTotal,
        })
      ),
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
      {/* Header */}
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
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDateTime(transaction.saleDateTime)}
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transaction Details */}
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
                    router.push(
                      `/customers/${transaction.customer.phoneNumber}`
                    )
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

            {/* Points */}
            {transaction.pointsEarned > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Points Earned
                </span>
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <Crown className="h-3.5 w-3.5" />+{transaction.pointsEarned}
                </span>
              </div>
            )}

            {transaction.pointsRedeemed > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Points Redeemed
                </span>
                <span className="text-sm text-red-600 dark:text-red-400">
                  -{transaction.pointsRedeemed}
                </span>
              </div>
            )}

            {transaction.refunds?.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Refunds</span>
                <Badge variant="destructive">
                  {transaction.refunds.length} refund(s)
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            {transaction.totalItemDiscount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Item Discounts</span>
                <span>
                  -{formatCurrency(transaction.totalItemDiscount)}
                </span>
              </div>
            )}
            {transaction.cartDiscount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Cart Discount</span>
                <span>-{formatCurrency(transaction.cartDiscount)}</span>
              </div>
            )}
            {transaction.pointsRedeemedValue > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>
                  Points ({transaction.pointsRedeemed} pts)
                </span>
                <span>
                  -{formatCurrency(transaction.pointsRedeemedValue)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>{formatCurrency(transaction.totalAmount)}</span>
            </div>
            {transaction.paymentMethod === "CASH" && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span>
                    {formatCurrency(transaction.amountPaid ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Change Given</span>
                  <span>
                    {formatCurrency(transaction.changeGiven ?? 0)}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
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
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transaction.items.map(
                (item: {
                  id: string;
                  productName: string;
                  supplierName: string;
                  quantity: number;
                  measuringUnit: string;
                  pricePerUnit: number;
                  itemDiscount: number;
                  lineTotal: number;
                }) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.productName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.supplierName}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.measuringUnit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.pricePerUnit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.itemDiscount > 0
                        ? `-${formatCurrency(item.itemDiscount)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.lineTotal)}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Refunds */}
      {transaction.refunds?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              Refunds ({transaction.refunds.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transaction.refunds.map(
              (refund: {
                id: string;
                refundReceiptNumber: string;
                refundDate: string | Date;
                refundMethod: string;
                totalRefundAmount: number;
                pointsDeducted: number;
                items: {
                  id: string;
                  productName: string;
                  quantityReturned: number;
                  pricePerUnit: number;
                  refundAmount: number;
                  reason: string;
                  isRestocked: boolean;
                }[];
              }) => (
                <div key={refund.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-mono font-medium text-sm">
                        {refund.refundReceiptNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(refund.refundDate)} •{" "}
                        {refund.refundMethod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">
                        -{formatCurrency(refund.totalRefundAmount)}
                      </p>
                      {refund.pointsDeducted > 0 && (
                        <p className="text-xs text-muted-foreground">
                          -{refund.pointsDeducted} points
                        </p>
                      )}
                    </div>
                  </div>
                  <Table>
                    <TableBody>
                      {refund.items.map((ri) => (
                        <TableRow key={ri.id}>
                          <TableCell className="text-sm">
                            {ri.productName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {ri.quantityReturned} returned
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline" className="text-xs">
                              {ri.reason}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {ri.isRestocked ? "Restocked" : "Not restocked"}
                          </TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            -{formatCurrency(ri.refundAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}