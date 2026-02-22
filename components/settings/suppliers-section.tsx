// src/components/settings/suppliers-section.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Phone, Truck } from "lucide-react";
import { toast } from "sonner";

import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
} from "@/actions/suppliers";
import {
  SupplierForm,
  type SupplierFormData,
} from "@/components/forms/supplier-form";
import { formatCurrency, formatDate } from "@/lib/format";

// ─── Types ───────────────────────────────────────────────────────

interface SupplierItem {
  id: string;
  name: string;
  phoneNumber: string;
  isActive: boolean;
  notes: string | null;
  joinedDate: Date;
  _count: { stocks: number };
}

// ─── Component ───────────────────────────────────────────────────

export function SuppliersSection() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [viewingSupplier, setViewingSupplier] = useState<{
    supplier: SupplierItem;
    stats: { totalStocks: number; activeStocks: number; totalValue: number; unpaidBalance: number };
  } | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSuppliers();
      setSuppliers(result.suppliers as unknown as SupplierItem[]);
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleCreate = async (data: SupplierFormData) => {
    const result = await createSupplier(data);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Supplier added successfully");
    setShowAddDialog(false);
    fetchSuppliers();
  };

  // FIX: Use two-arg signature (id, data) instead of single object
  const handleEdit = async (data: SupplierFormData) => {
    if (!editingSupplier) return;
    const result = await updateSupplier(editingSupplier.id, {
      name: data.name,
      phoneNumber: data.phoneNumber,
      notes: data.notes || null,
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Supplier updated successfully");
    setShowEditDialog(false);
    setEditingSupplier(null);
    fetchSuppliers();
  };

  const handleViewDetails = async (supplier: SupplierItem) => {
    try {
      const result = await getSupplierById(supplier.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setViewingSupplier({
        supplier: result.supplier as unknown as SupplierItem,
        stats: result.stats!,
      });
      setShowDetailSheet(true);
    } catch {
      toast.error("Failed to load supplier details");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suppliers</CardTitle>
              <CardDescription>
                Manage your fabric and material suppliers
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No suppliers added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{supplier.name}</span>
                      <Badge
                        variant={supplier.isActive ? "default" : "secondary"}
                      >
                        {supplier.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{supplier.phoneNumber}</span>
                      <span className="mx-1">·</span>
                      <span>{supplier._count.stocks} stocks</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setShowEditDialog(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(supplier)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
          </DialogHeader>
          <SupplierForm
            onSubmit={handleCreate}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          {editingSupplier && (
            <SupplierForm
              initialData={editingSupplier}
              onSubmit={handleEdit}
              onCancel={() => {
                setShowEditDialog(false);
                setEditingSupplier(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent>
          {viewingSupplier && (
            <>
              <SheetHeader>
                <SheetTitle>{viewingSupplier.supplier.name}</SheetTitle>
                <SheetDescription>Supplier Details</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{viewingSupplier.supplier.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Joined</span>
                    <span>{formatDate(viewingSupplier.supplier.joinedDate)}</span>
                  </div>
                  {viewingSupplier.supplier.notes && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Notes</span>
                      <span className="text-right max-w-[60%]">
                        {viewingSupplier.supplier.notes}
                      </span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Stocks</span>
                    <span>{viewingSupplier.stats.totalStocks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Stocks</span>
                    <span>{viewingSupplier.stats.activeStocks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Value</span>
                    <span className="font-medium">
                      {formatCurrency(viewingSupplier.stats.totalValue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unpaid Balance</span>
                    <span
                      className={
                        viewingSupplier.stats.unpaidBalance > 0
                          ? "text-destructive font-medium"
                          : ""
                      }
                    >
                      {formatCurrency(viewingSupplier.stats.unpaidBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}