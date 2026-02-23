// src/components/forms/customer-form.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export interface CustomerFormData {
  phoneNumber: string;
  name: string;
  email?: string | null;
}

interface CustomerFormProps {
  initialData?: {
    phoneNumber: string;
    name: string;
    email?: string | null;
  };
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CustomerForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: CustomerFormProps) {
  const [phone, setPhone] = useState(initialData?.phoneNumber || "");
  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!initialData;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!phone.match(/^0[0-9]{9}$/)) {
      newErrors.phone = "Phone must be 10 digits starting with 0";
    }
    if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (email && email.trim() && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Invalid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      phoneNumber: phone,
      name: name.trim(),
      email: email.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0771234567"
          maxLength={10}
          disabled={isEditing} // Cannot change PK
        />
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Customer Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter customer name"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email (Optional)</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Customer" : "Create Customer"}
        </Button>
      </div>
    </form>
  );
}