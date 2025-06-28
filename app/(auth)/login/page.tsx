"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Login attempt:", { email, passwordLength: password.length });
    
    try {
      setError("");
      setLoading(true);
      
      console.log("Calling signIn...");
      await signIn(email, password);
      
      console.log("Sign in successful, redirecting to dashboard...");
      
      // Small delay to ensure auth state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get redirect URL from query params or default to dashboard
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      console.log("Redirecting to:", redirectTo);
      
      router.push(redirectTo);
      
      // Force a page refresh to ensure auth state is properly loaded
      window.location.href = redirectTo;
    } catch (err: unknown) {
      console.error("Login error:", err);
      
      let errorMessage = "Failed to sign in";
      
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseErr = err as { code: string; message?: string };
        switch (firebaseErr.code) {
          case 'auth/user-not-found':
            errorMessage = "No account found with this email address";
            break;
          case 'auth/wrong-password':
            errorMessage = "Incorrect password";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email address";
            break;
          case 'auth/user-disabled':
            errorMessage = "This account has been disabled";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed attempts. Please try again later";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Network error. Please check your connection";
            break;
          default:
            errorMessage = firebaseErr.message || "An unknown error occurred";
        }
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = (err as { message: string }).message || "Failed to sign in";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to sign in to your account
          </p>
        </div>
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
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
                  className="transition-all duration-200"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/reset-password"
                    className="text-xs text-primary hover:underline"
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
                  className="transition-all duration-200"
                />
              </div>
              
              <Button
                type="submit"
                className="w-full shadow-md hover:shadow-lg transition-all"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col">
            <div className="mt-2 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 