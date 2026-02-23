// src/app/(dashboard)/transactions/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Receipt,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getTransactions } from "@/actions/transactions";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<
    {
      id: string;
      receiptNumber: string;
      customerPhone: string | null;
      customer: { phoneNumber: string; name: string } | null;
      paymentMethod: string;
      subtotal: number;
      totalItemDiscount: number;
      cartDiscount: number;
      pointsRedeemed: number;
      pointsRedeemedValue: number;
      totalAmount: number;
      pointsEarned: number;
      saleDateTime: string | Date;
      _count: { items: number; refunds: number };
    }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    const result = await getTransactions({
      search: search || undefined,
      paymentMethod: paymentFilter !== "ALL" ? paymentFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize: 10,
    });

    if (result.success && result.data) {
      setTransactions(result.data.transactions as typeof transactions);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
    }
    setIsLoading(false);
  }, [search, paymentFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    const timeout = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(timeout);
  }, [fetchTransactions]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <PageHeader
        title="Transactions"
        description={`${total} transaction${total !== 1 ? "s" : ""} total`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by receipt number..."
            className="pl-10"
          />
        </div>
        <Select
          value={paymentFilter}
          onValueChange={(v) => {
            setPaymentFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Methods</SelectItem>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="CARD">Card</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="w-[160px]"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="w-[160px]"
          placeholder="To"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Refunds</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/transactions/${t.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    {t.receiptNumber}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(t.saleDateTime)}
                  </TableCell>
                  <TableCell>
                    {t.customer ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {t.customer.name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Walk-in
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.paymentMethod}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{t._count.items}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(t.totalAmount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {t._count.refunds > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        {t._count.refunds}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}