// src/components/layout/sidebar-wrapper.tsx
"use client";

import { useSession } from "next-auth/react";
import { AdminSidebar } from "./admin-sidebar";
import { CashierSidebar } from "./cashier-sidebar";

interface SidebarWrapperProps {
  initialRole: "ADMIN" | "CASHIER";
}

export function SidebarWrapper({ initialRole }: SidebarWrapperProps) {
  const { data: session, status } = useSession();

  // Use the role passed from server component for immediate correct render
  // This prevents hydration mismatch and the flash of wrong sidebar
  let userRole = initialRole;

  // If session has loaded on client, use that (though it should match initialRole)
  if (status === "authenticated" && session?.user) {
    userRole = (session.user as any)?.role || initialRole;
  }

  // Explicitly check for CASHIER role
  if (userRole === "CASHIER") {
    return <CashierSidebar />;
  }

  // For ADMIN role, show admin sidebar
  return <AdminSidebar />;
}
