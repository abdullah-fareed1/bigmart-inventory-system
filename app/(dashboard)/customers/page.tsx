// src/app/(dashboard)/customers/page.tsx
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Crown, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getCustomers, createCustomer } from "@/actions/customers";
import { CustomerForm, type CustomerFormData } from "@/components/forms/customer-form";
import { formatPhone, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function tierColor(tier: string) {
  switch (tier) {
    case "PLATINUM":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "GOLD":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<
    {
      phoneNumber: string;
      name: string;
      email: string | null;
      totalPoints: number;
      membershipTier: string;
      isActive: boolean;
      joinedDate: string | Date;
      _count: { transactions: number };
    }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    const result = await getCustomers({
      search: search || undefined,
      membershipTier: tierFilter !== "ALL" ? tierFilter : undefined,
      page,
      pageSize: 10,
    });

    if (result.success && result.data) {
      setCustomers(result.data.customers as typeof customers);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
    }
    setIsLoading(false);
  }, [search, tierFilter, page]);

  useEffect(() => {
    const timeout = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timeout);
  }, [fetchCustomers]);

  const handleCreate = async (data: CustomerFormData) => {
    setIsCreating(true);
    const result = await createCustomer(data);
    if (result.success) {
      toast.success("Customer created successfully");
      setShowCreateDialog(false);
      fetchCustomers();
    } else {
      toast.error(result.error || "Failed to create customer");
    }
    setIsCreating(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <PageHeader
        title="Customers"
        description={`${total} customer${total !== 1 ? "s" : ""} registered`}
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        }
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
            placeholder="Search by name or phone..."
            className="pl-10"
          />
        </div>
        <Select
          value={tierFilter}
          onValueChange={(v) => {
            setTierFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Tiers</SelectItem>
            <SelectItem value="SILVER">Silver</SelectItem>
            <SelectItem value="GOLD">Gold</SelectItem>
            <SelectItem value="PLATINUM">Platinum</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow
                  key={c.phoneNumber}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/customers/${c.phoneNumber}`)}
                >
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatPhone(c.phoneNumber)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn("text-xs", tierColor(c.membershipTier))}
                    >
                      {c.membershipTier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <Crown className="h-3 w-3 text-amber-500" />
                      {c.totalPoints}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {c._count.transactions}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(c.joinedDate)}
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateDialog(false)}
            isLoading={isCreating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}