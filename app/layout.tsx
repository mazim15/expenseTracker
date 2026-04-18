import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track and manage your expenses",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background min-h-screen overflow-x-hidden font-sans antialiased transition-colors duration-300">
        <Providers>
          <ErrorBoundary>
            <div className="relative flex min-h-screen flex-col">
              <div className="gradient-mesh pointer-events-none fixed inset-0 opacity-30" />
              <Header />
              <main className="relative z-10 flex-1">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
              <Footer />
            </div>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
