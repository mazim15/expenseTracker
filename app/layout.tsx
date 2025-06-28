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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased transition-colors duration-300 overflow-x-hidden">
        <Providers>
          <ErrorBoundary>
            <div className="flex min-h-screen flex-col relative">
              <div className="gradient-mesh fixed inset-0 opacity-30 pointer-events-none" />
              <Header />
              <main className="flex-1 relative z-10">
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
