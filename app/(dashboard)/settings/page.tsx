// src/app/(dashboard)/settings/page.tsx

import { Metadata } from "next";
import { getShopSettings, getAdminInfo } from "@/actions/settings";
import { getCategories } from "@/actions/categories";
import { ShopInfoSection } from "@/components/settings/shop-info-section";
import { AccountSection } from "@/components/settings/account-section";
import { CategoriesSection } from "@/components/settings/categories-section";

export const metadata: Metadata = {
  title: "Settings | Textile POS",
  description: "Manage your shop settings",
};

export default async function SettingsPage() {
  // Fetch all required data
  const [shopSettingsResult, adminResult, categoriesResult] = await Promise.all([
    getShopSettings(),
    getAdminInfo(),
    getCategories(),
  ]);

  // Handle errors
  if (!shopSettingsResult.success || !shopSettingsResult.data) {
    return <div>Error loading shop settings</div>;
  }

  if (!adminResult.success || !adminResult.data) {
    return <div>Error loading admin info</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your shop configuration and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="grid gap-6">
        {/* Shop Information */}
        <ShopInfoSection settings={shopSettingsResult.data} />

        {/* Account */}
        <AccountSection admin={adminResult.data} />

        {/* Categories */}
        <CategoriesSection 
          initialCategories={categoriesResult.success ? (categoriesResult.data ?? []) : []}
        />
      </div>
    </div>
  );
}