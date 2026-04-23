// src/components/layout/admin-sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  FileText,
  Truck,
  Users,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "./theme-toggle";

// Admin full navigation items
const adminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingCart, label: "Point of Sale", href: "/pos" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: Warehouse, label: "Stocks", href: "/stocks" },
  { icon: FileText, label: "Supplier Bills", href: "/supplier-bills" },
  { icon: Truck, label: "Suppliers", href: "/suppliers" },
  { icon: Users, label: "Customers", href: "/customers" },
  { icon: Receipt, label: "Transactions", href: "/transactions" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex h-screen flex-col border-r bg-background transition-all duration-300",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!isCollapsed && (
            <span className="text-lg font-semibold tracking-tight">
              Bigmart Textiles
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", isCollapsed && "mx-auto")}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-2">
            {adminNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(item.href));

              return isCollapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-md mx-auto transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-bold"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-bold"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-2 space-y-1">
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between px-2")}>
            <ThemeToggle />
          </div>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 mx-auto text-muted-foreground hover:text-destructive"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
