"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  initialName: string;
  initialRole: "ADMIN" | "CASHIER";
}

export function Header({ initialName, initialRole }: HeaderProps) {
  const { data: session } = useSession();

  // Use initial values from server for immediate render, fallback to session if available
  const userName = session?.user?.name || initialName;
  const userRole = ((session?.user as any)?.role || initialRole) as "ADMIN" | "CASHIER";

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">
            {userName}
          </p>
          <p className="text-xs text-muted-foreground">
            {userRole === "ADMIN" ? "Admin" : "Cashier"}
          </p>
        </div>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}