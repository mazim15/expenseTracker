"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      await signIn(email, password);

      await new Promise((resolve) => setTimeout(resolve, 100));
      const redirectTo =
        new URLSearchParams(window.location.search).get("redirect") || "/dashboard";
      router.push(redirectTo);
      window.location.href = redirectTo;
    } catch (err: unknown) {
      let errorMessage = "Failed to sign in";
      if (err && typeof err === "object" && "code" in err) {
        const firebaseErr = err as { code: string; message?: string };
        switch (firebaseErr.code) {
          case "auth/user-not-found":
            errorMessage = "No account found with this email address";
            break;
          case "auth/wrong-password":
            errorMessage = "Incorrect password";
            break;
          case "auth/invalid-email":
            errorMessage = "Invalid email address";
            break;
          case "auth/user-disabled":
            errorMessage = "This account has been disabled";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many failed attempts. Please try again later";
            break;
          case "auth/network-request-failed":
            errorMessage = "Network error. Please check your connection";
            break;
          default:
            errorMessage = firebaseErr.message || "An unknown error occurred";
        }
      } else if (err && typeof err === "object" && "message" in err) {
        errorMessage = (err as { message: string }).message || "Failed to sign in";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/reset-password"
                className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-foreground font-medium hover:underline">
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
