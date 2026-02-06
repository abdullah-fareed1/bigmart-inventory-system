"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const { data: session } = useSession();

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "AD";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium">
            {session?.user?.name ?? "Admin"}
          </p>
          <p className="text-xs text-muted-foreground">
            {session?.user?.email ?? ""}
          </p>
        </div>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}