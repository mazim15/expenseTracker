"use client";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { SettingsProvider } from "@/lib/contexts/SettingsContext";
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
      <SettingsProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors />
        </ThemeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
} 