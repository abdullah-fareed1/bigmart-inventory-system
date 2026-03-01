// src/components/settings/shop-info-section.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Building2, MapPin, Phone, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateShopSettings } from "@/actions/settings";
import { ImageUpload } from "@/components/shared/image-upload";

interface ShopSettings {
  id: string;
  shopName: string;
  address: string;
  phone: string;
  email: string | null;
  logoUrl: string | null;
}

interface ShopInfoSectionProps {
  settings: ShopSettings;
}

export function ShopInfoSection({ settings }: ShopInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    shopName: settings.shopName,
    address: settings.address,
    phone: settings.phone,
    email: settings.email || "",
    logoUrl: settings.logoUrl || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateShopSettings(formData);

      if (result.success) {
        toast.success("Shop information updated successfully");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Failed to update");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Shop Information
            </CardTitle>
            <CardDescription>
              Your shop details displayed on receipts
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              {settings.logoUrl ? (
                <Image
                  src={settings.logoUrl}
                  alt="Shop Logo"
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div>
                <p className="text-lg font-semibold">{settings.shopName}</p>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="whitespace-pre-line">{settings.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{settings.phone}</span>
              </div>
              {settings.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{settings.email}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Shop Information</DialogTitle>
            <DialogDescription>
              Update your shop details. These will appear on receipts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <ImageUpload
                  value={formData.logoUrl}
                  onChange={(url) =>
                    setFormData((prev) => ({ ...prev, logoUrl: url }))
                  }
                  onRemove={() =>
                    setFormData((prev) => ({ ...prev, logoUrl: "" }))
                  }
                />
              </div>

              {/* Shop Name */}
              <div className="space-y-2">
                <Label htmlFor="shopName">Shop Name *</Label>
                <Input
                  id="shopName"
                  value={formData.shopName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, shopName: e.target.value }))
                  }
                  placeholder="Enter shop name"
                  required
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Enter full address"
                  rows={3}
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="0112345678"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="shop@example.com"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}