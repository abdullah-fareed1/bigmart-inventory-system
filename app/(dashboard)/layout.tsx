import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarWrapper } from "@/components/layout/sidebar-wrapper";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const userRole = (session.user as any).role || "ADMIN";
  const userName = session.user.name || "";

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarWrapper initialRole={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header initialName={userName} initialRole={userRole} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}