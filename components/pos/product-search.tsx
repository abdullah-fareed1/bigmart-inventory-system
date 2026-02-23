// src/components/pos/product-search.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Package, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { searchProductsForPOS } from "@/actions/transactions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SearchResult {
  stockId: string;
  productId: string;
  productName: string;
  supplierName: string;
  sellingPrice: number;
  quantityRemaining: number;
  measuringUnit: string;
  imageUrl: string | null;
  isActive: boolean;
  isOutOfStock: boolean;
}

interface ProductSearchProps {
  onSelect: (item: SearchResult) => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

export function ProductSearch({ onSelect, searchRef }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const internalRef = useRef<HTMLInputElement | null>(null);
  const inputRef = searchRef || internalRef;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const result = await searchProductsForPOS(searchQuery);
    if (result.success && result.data) {
      setResults(result.data);
      setIsOpen(true);
    }
    setIsLoading(false);
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      setSelectedIndex(-1);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(value), 300);
    },
    [search]
  );

  const handleSelect = useCallback(
    (item: SearchResult) => {
      if (item.isOutOfStock) return;
      onSelect(item);
      setQuery("");
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      // Filter available items for navigation
      const availableIndices = results
        .map((r, i) => (!r.isOutOfStock ? i : -1))
        .filter((i) => i !== -1);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const currentPos = availableIndices.indexOf(selectedIndex);
        const nextPos =
          currentPos < availableIndices.length - 1 ? currentPos + 1 : 0;
        setSelectedIndex(availableIndices[nextPos]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const currentPos = availableIndices.indexOf(selectedIndex);
        const prevPos =
          currentPos > 0 ? currentPos - 1 : availableIndices.length - 1;
        setSelectedIndex(availableIndices[prevPos]);
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    },
    [isOpen, results, selectedIndex, handleSelect]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search products... (press / to focus)"
          className="pl-10 h-12 text-base"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-lg">
          <ScrollArea className="max-h-[400px]">
            {results.length === 0 && !isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                No products found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className="p-1">
                {results.map((item, index) => (
                  <button
                    key={item.stockId}
                    onClick={() => handleSelect(item)}
                    disabled={item.isOutOfStock}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition-colors",
                      selectedIndex === index && !item.isOutOfStock
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                      item.isOutOfStock &&
                        "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-medium truncate",
                            item.isOutOfStock && "line-through"
                          )}
                        >
                          {item.productName}
                        </span>
                        <span className="text-muted-foreground text-xs truncate">
                          ({item.supplierName})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>
                          {formatCurrency(item.sellingPrice)}/{item.measuringUnit}
                        </span>
                        <span>•</span>
                        <span>
                          Stock: {item.quantityRemaining} {item.measuringUnit}
                        </span>
                      </div>
                    </div>

                    {item.isOutOfStock ? (
                      <Badge variant="destructive" className="shrink-0 text-xs">
                        OUT OF STOCK
                      </Badge>
                    ) : (
                      <span className="shrink-0 font-semibold text-sm">
                        {formatCurrency(item.sellingPrice)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="p-2 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-sm" />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}