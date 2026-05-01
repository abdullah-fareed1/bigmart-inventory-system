"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { getSupplierBills } from "@/actions/supplier-bills";
import { getSuppliers } from "@/actions/suppliers";

export default function SupplierBillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const pageCount = Math.ceil(total / pageSize);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSupplierBills({
        search: search || undefined,
        supplierId: filterSupplier !== "all" ? filterSupplier : undefined,
        paymentStatus: filterStatus !== "all" ? filterStatus : undefined,
        page,
        pageSize,
      });

      if (result.success) {
        setBills(result.data?.bills || []);
        setTotal(result.data?.total || 0);
      } else {
        toast.error(result.error || "Failed to fetch bills");
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterSupplier, filterStatus, page, pageSize]);

  // Initial load and refetch on dependency change
  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Bills</h1>
          <p className="text-muted-foreground mt-1">Manage supplier deliveries and invoices</p>
        </div>
        <Button onClick={() => router.push("/supplier-bills/add")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Supplier Bill
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by bill # or invoice ref..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />

            <Select value={filterSupplier} onValueChange={(value) => {
              setFilterSupplier(value);
              setPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by supplier..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(value) => {
              setFilterStatus(value);
              setPage(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setFilterSupplier("all");
                setFilterStatus("all");
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bills ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No supplier bills found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right"># Products</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => {
                      const balance = bill.totalCost - bill.amountPaid;
                      return (
                        <TableRow
                          key={bill.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/supplier-bills/${bill.id}`)}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            {bill.billNumber}
                          </TableCell>
                          <TableCell>{bill.supplier.name}</TableCell>
                          <TableCell className="text-sm">{formatDate(bill.createdAt)}</TableCell>
                          <TableCell className="text-right">{bill._count.stocks}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(bill.totalCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(bill.amountPaid)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${balance > 0 ? "text-destructive" : ""}`}>
                            {balance > 0 ? formatCurrency(balance) : "—"}
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
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {bills.length} of {total} bills
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Page {page} of {pageCount || 1}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
