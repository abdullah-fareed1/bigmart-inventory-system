import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "ADMIN" | "CASHIER";
    };
  }

  interface User {
    role: "ADMIN" | "CASHIER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "CASHIER";
  }
}
