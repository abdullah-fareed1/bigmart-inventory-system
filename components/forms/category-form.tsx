"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/actions/categories";
import { Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null; // null = create mode
  onSuccess?: () => void;
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) {
      toast.error("Category name must be at least 2 characters");
      return;
    }

    setIsLoading(true);
    try {
      const result = isEdit
        ? await updateCategory(category.id, { name: name.trim() })
        : await createCategory({ name: name.trim() });

      if (result.success) {
        toast.success(isEdit ? "Category updated" : "Category created");
        onOpenChange(false);
        setName("");
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!isLoading) {
          onOpenChange(val);
          if (!val) setName("");
        }
      }}
    >
      <DialogContent className="sm:max-w-100">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the category name."
                : "Create a new product category."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              placeholder="e.g. Fabric, Lining, Accessories"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              autoFocus
              disabled={isLoading}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}