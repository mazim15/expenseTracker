"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { useState, useEffect } from "react";
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    // Mark Firebase as ready
    setIsFirebaseReady(true);
  }, []);

  if (!isFirebaseReady) {
    return null; // Or a loading spinner
  }

  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <Toaster richColors />
      </ThemeProvider>
    </AuthProvider>
  );
} 