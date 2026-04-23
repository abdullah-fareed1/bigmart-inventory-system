import { Session } from "next-auth";

export type UserRole = "ADMIN" | "CASHIER";

// Define allowed modules for each role
const ROLE_MODULES: Record<UserRole, string[]> = {
  ADMIN: [
    "dashboard",
    "pos",
    "transactions",
    "products",
    "stocks",
    "suppliers",
    "supplier-bills",
    "customers",
    "settings",
  ],
  CASHIER: ["dashboard", "pos", "transactions"],
};

// Route to module mapping for middleware
const ROUTE_TO_MODULE: Record<string, string> = {
  "/dashboard": "dashboard",
  "/pos": "pos",
  "/transactions": "transactions",
  "/products": "products",
  "/stocks": "stocks",
  "/suppliers": "suppliers",
  "/supplier-bills": "supplier-bills",
  "/customers": "customers",
  "/settings": "settings",
};

/**
 * Check if user is an admin
 */
export function isAdmin(session: Session | null): boolean {
  if (!session?.user) return false;
  return (session.user as any).role === "ADMIN";
}

/**
 * Check if user is a cashier
 */
export function isCashier(session: Session | null): boolean {
  if (!session?.user) return false;
  return (session.user as any).role === "CASHIER";
}

/**
 * Get user role from session
 */
export function getUserRole(session: Session | null): UserRole | null {
  if (!session?.user) return null;
  return (session.user as any).role || null;
}

/**
 * Check if user can access a specific module
 * @param session - User session
 * @param moduleName - Module name (dashboard, pos, transactions, products, stocks, etc.)
 */
export function canAccessModule(
  session: Session | null,
  moduleName: string
): boolean {
  if (!session?.user) return false;

  const role = (session.user as any).role as UserRole;
  const allowedModules = ROLE_MODULES[role] || [];

  return allowedModules.includes(moduleName);
}

/**
 * Check if user can access a specific route path
 * @param session - User session
 * @param pathname - The pathname to check (e.g., /products, /dashboard/stocks)
 */
export function canAccessRoute(
  session: Session | null,
  pathname: string
): boolean {
  if (!session?.user) return false;

  const role = (session.user as any).role as UserRole;

  // Extract the first route segment
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return true; // Allow root

  // For nested routes like /dashboard/stocks, check /stocks or /dashboard
  // For root routes like /products, check /products
  let moduleToCheck = "";
  
  if (segments[0] === "dashboard" && segments[1]) {
    // Route like /dashboard/stocks - check the module
    moduleToCheck = segments[1];
  } else if (segments[0] !== "dashboard") {
    // Route like /pos, /products, /stocks - check the module directly
    moduleToCheck = segments[0];
  } else if (segments[0] === "dashboard") {
    // Just /dashboard - check dashboard module
    moduleToCheck = "dashboard";
  }

  if (!moduleToCheck) return true;

  return canAccessModule(session, moduleToCheck);
}

/**
 * Get module name from a pathname
 */
export function getModuleFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  
  if (segments.length === 0) return null;
  
  // For /dashboard/xxx routes, extract xxx
  if (segments[0] === "dashboard" && segments[1]) {
    return segments[1];
  }
  
  // For /xxx routes, extract xxx
  if (segments[0] !== "dashboard") {
    return segments[0];
  }
  
  // For /dashboard route
  if (segments[0] === "dashboard") {
    return "dashboard";
  }
  
  return null;
}

/**
 * Get allowed modules for a user role
 */
export function getAllowedModules(role: UserRole): string[] {
  return ROLE_MODULES[role] || [];
}
