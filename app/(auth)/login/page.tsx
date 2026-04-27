// Location: app/(auth)/login/page.tsx

"use client";

import { useState } from "react";
import { signInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Scissors } from "lucide-react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await signInAction(formData);

      if (result?.success === false) {
        setError(result.error ?? "Invalid email or password");
        setIsLoading(false);
      }
      // If successful, NextAuth handles the redirect to /dashboard
    } catch {
      // NextAuth redirect throws an error — this is expected behavior
      // The redirect will happen automatically
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-lg bg-zinc-950 dark:bg-zinc-50 flex items-center justify-center mb-4">
            <Scissors className="h-6 w-6 text-zinc-50 dark:text-zinc-950" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">
            Big Mart Textiles
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Inventory Management & Point of Sale System
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold">Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="cashier@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-10"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-600 mt-6">
          Smart Inventory & POS system v2.1 &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}