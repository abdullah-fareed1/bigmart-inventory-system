"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SupplierBillForm, type SupplierBillFormData } from "@/components/forms/supplier-bill-form";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { getProducts } from "@/actions/products";
import { getSuppliers } from "@/actions/suppliers";
import { createSupplierBill } from "@/actions/supplier-bills";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  primaryUnit: string;
}

interface Supplier {
  id: string;
  name: string;
  phoneNumber: string;
}

export default function AddSupplierBillPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [productsResult, suppliersResult] = await Promise.all([
          getProducts({ isActive: true }),
          getSuppliers({ isActive: true }),
        ]);

        if (productsResult.success && productsResult.data) {
          setProducts(
            productsResult.data.products.map(
              (p: { id: string; name: string; primaryUnit: string }) => ({
                id: p.id,
                name: p.name,
                primaryUnit: p.primaryUnit,
              })
            )
          );
        }

        if (suppliersResult.suppliers) {
          setSuppliers(
            suppliersResult.suppliers.map(
              (s: { id: string; name: string; phoneNumber: string }) => ({
                id: s.id,
                name: s.name,
                phoneNumber: s.phoneNumber,
              })
            )
          );
        }
      } catch (error) {
        toast.error("Failed to load form data");
        router.push("/supplier-bills");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleSubmit = async (data: SupplierBillFormData) => {
    try {
      const result = await createSupplierBill(data);
      if (result.success) {
        toast.success(`Supplier bill ${result.data?.billNumber} created`);
        router.push("/supplier-bills");
      } else {
        toast.error(result.error || "Failed to create bill");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleCancel = () => {
    router.push("/supplier-bills");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Supplier Bill</h1>
          <p className="text-muted-foreground">
            Add multiple products from a supplier in one bill
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card border rounded-lg p-6">
        <SupplierBillForm
          products={products}
          suppliers={suppliers}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
