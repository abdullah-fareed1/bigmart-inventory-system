"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getProducts, deleteProduct } from "@/actions/products";
import {
  getCategories,
  deleteCategory,
} from "@/actions/categories";
import { DataTable } from "@/components/shared/data-table";
import { SearchBar } from "@/components/shared/search-bar";
import { CategoryForm } from "@/components/forms/category-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  FolderPlus,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string;
  primaryUnit: string;
  isActive: boolean;
  createdAt: string;
  category: { id: string; name: string };
  _count: { stocks: number };
}

interface Category {
  id: string;
  name: string;
  _count: { products: number };
}

export default function ProductsPage() {
  const router = useRouter();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialogs
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "product" | "category";
    id: string;
    name: string;
  } | null>(null);

  // Fetch data
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const result = await getProducts({
      search: search || undefined,
      categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
      page,
      pageSize,
    });
    if (result.success && result.data) {
      setProducts(result.data.products as unknown as Product[]);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
    }
    setIsLoading(false);
  }, [search, categoryFilter, page, pageSize]);

  const fetchCategories = useCallback(async () => {
    const result = await getCategories();
    if (result.success && result.data) {
      setCategories(result.data as unknown as Category[]);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  // Handlers
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    const result =
      deleteTarget.type === "product"
        ? await deleteProduct(deleteTarget.id)
        : await deleteCategory(deleteTarget.id);

    if (result.success) {
      toast.success(
        `${deleteTarget.type === "product" ? "Product" : "Category"} deleted`
      );
      fetchProducts();
      fetchCategories();
    } else {
      toast.error(result.error);
    }
    setDeleteTarget(null);
  };

  // Table columns
  const columns = [
    {
      key: "imageUrl",
      label: "",
      className: "w-[50px]",
      render: (product: Product) =>
        product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={40}
            height={40}
            className="rounded object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
        ),
    },
    {
      key: "name",
      label: "Product Name",
      render: (product: Product) => (
        <div>
          <p className="font-medium">{product.name}</p>
          {product.description && (
            <p className="text-sm text-muted-foreground truncate max-w-[300px]">
              {product.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (product: Product) => (
        <Badge variant="secondary">{product.category.name}</Badge>
      ),
    },
    {
      key: "primaryUnit",
      label: "Unit",
      render: (product: Product) => product.primaryUnit,
    },
    {
      key: "stocks",
      label: "Active Stocks",
      render: (product: Product) => (
        <span>{product._count.stocks}</span>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (product: Product) => (
        <Badge variant={product.isActive ? "default" : "secondary"}>
          {product.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (product: Product) =>
        format(new Date(product.createdAt), "MMM d, yyyy"),
    },
    {
      key: "actions",
      label: "",
      className: "w-[50px]",
      render: (product: Product) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/products/${product.id}`);
              }}
            >
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/products/${product.id}?edit=true`);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget({
                  type: "product",
                  id: product.id,
                  name: product.name,
                });
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product catalog and categories"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingCategory(null);
                setCategoryFormOpen(true);
              }}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
            <Button onClick={() => router.push("/products/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        }
      />

      {/* Category Quick List */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Badge
              key={cat.id}
              variant={categoryFilter === cat.id ? "default" : "outline"}
              className="cursor-pointer text-sm py-1 px-3"
              onClick={() =>
                setCategoryFilter(
                  categoryFilter === cat.id ? "all" : cat.id
                )
              }
            >
              {cat.name} ({cat._count.products})
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="ml-1.5 hover:text-primary">
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCategory(cat);
                      setCategoryFormOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({
                        type: "category",
                        id: cat.id,
                        name: cat.name,
                      });
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Badge>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 max-w-sm">
          <SearchBar
            placeholder="Search products..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <DataTable<Product>
        columns={columns}
        data={products}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={(item) => router.push(`/products/${item.id}`)}
        emptyMessage="No products found. Create your first product!"
        isLoading={isLoading}
      />

      {/* Category Form Dialog */}
      <CategoryForm
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        category={editingCategory}
        onSuccess={() => {
          fetchCategories();
          fetchProducts();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
              {deleteTarget?.type === "product"
                ? " The product will be soft-deleted and can be recovered."
                : " This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}