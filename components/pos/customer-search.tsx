// src/components/pos/customer-search.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Search, UserPlus, User, Crown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { searchCustomers, createCustomer } from "@/actions/customers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CustomerResult {
  phoneNumber: string;
  name: string;
  totalPoints: number;
  membershipTier: string;
}

interface CustomerSearchProps {
  selectedCustomer: CustomerResult | null;
  onSelect: (customer: CustomerResult | null) => void;
}

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

export function CustomerSearch({
  selectedCustomer,
  onSelect,
}: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    const result = await searchCustomers(q);
    if (result.success && result.data) {
      setResults(result.data);
      setIsOpen(true);
    }
    setIsLoading(false);
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (customer: CustomerResult) => {
    onSelect(customer);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // If customer is already selected, show the selected state
  if (selectedCustomer) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/50">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{selectedCustomer.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{selectedCustomer.phoneNumber}</span>
            <Badge className={cn("text-xs px-1.5 py-0", tierColor(selectedCustomer.membershipTier))}>
              {selectedCustomer.membershipTier}
            </Badge>
            <span className="flex items-center gap-0.5">
              <Crown className="h-3 w-3" /> {selectedCustomer.totalPoints} pts
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => onSelect(null)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search customer by phone or name..."
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowCreateDialog(true)}
            title="New Customer"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-lg">
            <ScrollArea className="max-h-[200px]">
              {results.length === 0 && !isLoading ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No customers found
                </div>
              ) : (
                <div className="p-1">
                  {results.map((c) => (
                    <button
                      key={c.phoneNumber}
                      onClick={() => handleSelect(c)}
                      className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.phoneNumber}
                        </p>
                      </div>
                      <Badge className={cn("text-xs", tierColor(c.membershipTier))}>
                        {c.membershipTier}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {c.totalPoints} pts
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Walk-in customer note */}
      <p className="text-xs text-muted-foreground mt-1">
        Leave empty for walk-in customer (no points earned/redeemed)
      </p>

      <CreateCustomerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={(customer) => {
          onSelect(customer);
          setShowCreateDialog(false);
        }}
      />
    </>
  );
}

// ─── QUICK CREATE CUSTOMER DIALOG ────────────────────────────────

function CreateCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: CustomerResult) => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!phone || !name) {
      toast.error("Phone and name are required");
      return;
    }

    setIsLoading(true);
    const result = await createCustomer({
      phoneNumber: phone,
      name,
      email: email || null,
    });

    if (result.success && result.data) {
      toast.success("Customer created successfully");
      onCreated({
        phoneNumber: result.data.phoneNumber,
        name: result.data.name,
        totalPoints: result.data.totalPoints,
        membershipTier: result.data.membershipTier,
      });
      setPhone("");
      setName("");
      setEmail("");
    } else {
      toast.error(result.error || "Failed to create customer");
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-phone">Phone Number</Label>
            <Input
              id="new-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0771234567"
              maxLength={10}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-name">Customer Name</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">Email (Optional)</Label>
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}