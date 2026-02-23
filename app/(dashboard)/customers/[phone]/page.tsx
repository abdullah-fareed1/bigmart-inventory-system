// src/app/(dashboard)/customers/[phone]/page.tsx
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
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  Crown,
  Calendar,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getCustomerByPhone, updateCustomer } from "@/actions/customers";
import { CustomerForm, type CustomerFormData } from "@/components/forms/customer-form";
import { formatCurrency, formatDateTime, formatDate, formatPhone } from "@/lib/format";
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

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const phone = params.phone as string;

  const [customer, setCustomer] = useState<{
    phoneNumber: string;
    name: string;
    email: string | null;
    totalPoints: number;
    membershipTier: string;
    isActive: boolean;
    joinedDate: string | Date;
    transactions: {
      id: string;
      receiptNumber: string;
      totalAmount: number;
      pointsEarned: number;
      pointsRedeemed: number;
      saleDateTime: string | Date;
      paymentMethod: string;
    }[];
    pointHistory: {
      id: string;
      pointsChange: number;
      reason: string;
      balanceAfter: number;
      createdAt: string | Date;
      transaction: { receiptNumber: string } | null;
    }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setIsLoading(true);
    const result = await getCustomerByPhone(decodeURIComponent(phone));
    if (result.success && result.data) {
      setCustomer(result.data as typeof customer);
    } else {
      toast.error("Customer not found");
      router.push("/customers");
    }
    setIsLoading(false);
  }, [phone, router]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleUpdate = async (data: CustomerFormData) => {
    setIsUpdating(true);
    const result = await updateCustomer(phone, {
      name: data.name,
      email: data.email,
    });
    if (result.success) {
      toast.success("Customer updated");
      setShowEditDialog(false);
      fetchCustomer();
    } else {
      toast.error(result.error || "Failed to update");
    }
    setIsUpdating(false);
  };

  if (isLoading || !customer) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const totalSpent = customer.transactions.reduce(
    (sum, t) => sum + t.totalAmount,
    0
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/customers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <Badge className={cn("text-xs", tierColor(customer.membershipTier))}>
              {customer.membershipTier}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {formatPhone(customer.phoneNumber)}
            </span>
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {customer.email}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined {formatDate(customer.joinedDate)}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowEditDialog(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{customer.totalPoints}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {formatCurrency(totalSpent)}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {customer.transactions.length}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">
            Transactions ({customer.transactions.length})
          </TabsTrigger>
          <TabsTrigger value="points">
            Point History ({customer.pointHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No transactions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  customer.transactions.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/transactions/${t.id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        {t.receiptNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(t.saleDateTime)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(t.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {t.pointsEarned > 0 && (
                          <span className="text-green-600 dark:text-green-400">
                            +{t.pointsEarned}
                          </span>
                        )}
                        {t.pointsRedeemed > 0 && (
                          <span className="text-red-600 dark:text-red-400 ml-2">
                            -{t.pointsRedeemed}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="points" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.pointHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No point history
                    </TableCell>
                  </TableRow>
                ) : (
                  customer.pointHistory.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(p.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.reason === "PURCHASE"
                              ? "default"
                              : p.reason === "REDEMPTION"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {p.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {p.transaction?.receiptNumber || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "flex items-center justify-end gap-1 font-medium",
                            p.pointsChange > 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {p.pointsChange > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {p.pointsChange > 0 ? "+" : ""}
                          {p.pointsChange}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {p.balanceAfter}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            initialData={customer}
            onSubmit={handleUpdate}
            onCancel={() => setShowEditDialog(false)}
            isLoading={isUpdating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}