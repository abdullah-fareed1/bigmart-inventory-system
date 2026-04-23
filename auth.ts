
export const runtime = "nodejs";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const admin = await prisma.admin.findUnique({
          where: { email },
        });

        if (!admin) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role, // Explicitly return role from database
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // When user logs in, add user data to token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
      }
      // On subsequent requests, token.role should already be set
      // but ensure it's always present
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        // CRITICAL: Always ensure role is set from token
        (session.user as any).role = token.role || "ADMIN";
      }
      return session;
    },
  },
});