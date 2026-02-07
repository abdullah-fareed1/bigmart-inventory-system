"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onRemove: () => void;
}

export function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (JPG, PNG, WebP)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        toast.error("Cloudinary is not configured. Check environment variables.");
        return;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: formData }
        );

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        onChange(data.secure_url);
        toast.success("Image uploaded");
      } catch {
        toast.error("Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  return (
    <div>
      {value ? (
        <div className="relative aspect-square w-full max-w-[250px] rounded-lg overflow-hidden border">
          <Image
            src={value}
            alt="Product image"
            fill
            className="object-cover"
            sizes="250px"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center aspect-square w-full max-w-[250px] rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                Click to upload
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP (max 5MB)
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
}