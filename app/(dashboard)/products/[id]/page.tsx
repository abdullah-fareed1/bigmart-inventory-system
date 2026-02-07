"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getProductById } from "@/actions/products";
import { getCategories } from "@/actions/categories";
import { ProductForm } from "@/components/forms/product-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Pencil, ArrowLeft, Package } from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";

interface Category {
  id: string;
  name: string;
}

interface Stock {
  id: string;
  grnNumber: string;
  quantityRemaining: number;
  measuringUnit: string;
  sellingPricePerUnit: number;
  suppliedDate: string;
  supplier: { name: string };
}

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string;
  primaryUnit: string;
  isActive: boolean;
  createdAt: string;
  category: Category;
  stocks: Stock[];
  unitConversions: {
    id: string;
    unitName: string;
    conversionFactor: number;
  }[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params.id as string;
  const isNew = id === "new";
  const isEditMode = isNew || searchParams.get("edit") === "true";

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);

      // Always load categories (needed for form)
      const catResult = await getCategories();
      if (catResult.success && catResult.data) {
        setCategories(
          catResult.data.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
      }

      // Load product if not new
      if (!isNew) {
        const result = await getProductById(id);
        if (result.success && result.data) {
          setProduct(result.data as unknown as ProductDetail);
        } else {
          router.push("/products");
        }
      }

      setIsLoading(false);
    }
    load();
  }, [id, isNew, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ─── CREATE / EDIT MODE ────────────────────────────
  if (isEditMode) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={isNew ? "New Product" : `Edit: ${product?.name}`}
          description={
            isNew
              ? "Add a new product to your catalog"
              : "Update product details"
          }
          actions={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
        />

        <ProductForm
          categories={categories}
          initialData={
            product
              ? {
                  id: product.id,
                  name: product.name,
                  description: product.description,
                  categoryId: product.categoryId,
                  primaryUnit: product.primaryUnit,
                  imageUrl: product.imageUrl,
                }
              : undefined
          }
        />
      </div>
    );
  }

  // ─── VIEW MODE ─────────────────────────────────────
  if (!product) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={product.category.name}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/products")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => router.push(`/products/${product.id}?edit=true`)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Product Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge variant="secondary">{product.category.name}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Primary Unit</p>
                  <p className="font-medium">{product.primaryUnit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={product.isActive ? "default" : "secondary"}
                  >
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {format(
                      new Date(product.createdAt),
                      "MMM d, yyyy h:mm a"
                    )}
                  </p>
                </div>
              </div>
              {product.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{product.description}</p>
                </div>
              )}
              {product.unitConversions.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Unit Conversions
                  </p>
                  {product.unitConversions.map((uc) => (
                    <Badge key={uc.id} variant="outline" className="mr-2">
                      1 {product.primaryUnit} = {uc.conversionFactor}{" "}
                      {uc.unitName}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Stocks */}
          <Card>
            <CardHeader>
              <CardTitle>
                Active Stocks ({product.stocks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.stocks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No active stock entries for this product.
                </p>
              ) : (
                <div className="space-y-3">
                  {product.stocks.map((stock) => (
                    <div
                      key={stock.id}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {stock.grnNumber} — {stock.supplier.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Supplied:{" "}
                          {format(
                            new Date(stock.suppliedDate),
                            "MMM d, yyyy"
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {stock.quantityRemaining} {stock.measuringUnit}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Rs.{" "}
                          {stock.sellingPricePerUnit.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          / {stock.measuringUnit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Image */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Image</CardTitle>
            </CardHeader>
            <CardContent>
              {product.imageUrl ? (
                <div className="relative aspect-square w-full rounded-lg overflow-hidden border">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="300px"
                  />
                </div>
              ) : (
                <div className="aspect-square w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground">
                  <Package className="h-12 w-12 mb-2" />
                  <p className="text-sm">No image uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}