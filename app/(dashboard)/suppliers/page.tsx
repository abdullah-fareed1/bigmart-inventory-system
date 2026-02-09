// src/app/(dashboard)/suppliers/page.tsx
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Truck, MoreHorizontal, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";

import {
  getSuppliers,
  createSupplier,
  updateSupplier,
} from "@/actions/suppliers";
import {
  SupplierForm,
  type SupplierFormData,
} from "@/components/forms/supplier-form";
import { formatDate } from "@/lib/format";

// ─── Types ───────────────────────────────────────────────────────

interface SupplierRow {
  id: string;
  name: string;
  phoneNumber: string;
  isActive: boolean;
  notes: string | null;
  joinedDate: Date | string;
  _count: { stocks: number };
}

// ─── Page ────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(
    null
  );

  // Fetch
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSuppliers({
        search: search || undefined,
      });
      setSuppliers((result.suppliers || []) as unknown as SupplierRow[]);
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Create
  const handleCreate = async (data: SupplierFormData) => {
    const result = await createSupplier(data);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Supplier created successfully");
    setShowAddDialog(false);
    fetchSuppliers();
  };

  // Edit
  const handleEdit = async (data: SupplierFormData) => {
    if (!editingSupplier) return;
    const result = await updateSupplier(editingSupplier.id, data);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Supplier updated successfully");
    setEditingSupplier(null);
    fetchSuppliers();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage suppliers, payments, and credit notes
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Stock Entries</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Truck className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No suppliers found</p>
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/suppliers/${supplier.id}`)}
                >
                  <TableCell className="font-medium">
                    {supplier.name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {supplier.phoneNumber}
                  </TableCell>
                  <TableCell className="text-right">
                    {supplier._count.stocks}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={supplier.isActive ? "default" : "secondary"}
                    >
                      {supplier.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(supplier.joinedDate)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/suppliers/${supplier.id}`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSupplier(supplier);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
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

      {/* Edit Dialog */}
      <Dialog
        open={!!editingSupplier}
        onOpenChange={(open) => !open && setEditingSupplier(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          {editingSupplier && (
            <SupplierForm
              initialData={{
                id: editingSupplier.id,
                name: editingSupplier.name,
                phoneNumber: editingSupplier.phoneNumber,
                notes: editingSupplier.notes,
              }}
              onSubmit={handleEdit}
              onCancel={() => setEditingSupplier(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}