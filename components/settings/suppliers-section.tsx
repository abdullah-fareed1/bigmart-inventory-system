// src/components/settings/suppliers-section.tsx
//
// Add this component to your existing Settings page.
// Usage: <SuppliersSection />
//
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

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Detail sheet state
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

  // Handle create
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

  // Handle edit
  const handleEdit = async (data: SupplierFormData) => {
    if (!editingSupplier) return;
    const result = await updateSupplier({
      id: editingSupplier.id,
      name: data.name,
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

  // Handle view detail
  const handleViewDetail = async (supplier: SupplierItem) => {
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
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Suppliers
            </CardTitle>
            <CardDescription>Manage your fabric suppliers</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : suppliers.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No suppliers added yet
            </p>
          ) : (
            <div className="space-y-2">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {supplier.name}
                        {!supplier.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {supplier.phoneNumber}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {supplier._count.stocks} stocks
                    </Badge>
                    <Button
                      variant="ghost"
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
                      onClick={() => handleViewDetail(supplier)}
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
                    <div className="text-sm">
                      <span className="text-muted-foreground">Notes: </span>
                      <span>{viewingSupplier.supplier.notes}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">Stock Summary</h4>
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
                      <span className={`font-medium ${viewingSupplier.stats.unpaidBalance > 0 ? "text-destructive" : ""}`}>
                        {formatCurrency(viewingSupplier.stats.unpaidBalance)}
                      </span>
                    </div>
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