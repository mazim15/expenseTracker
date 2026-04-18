"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Wallet, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export function MarketingHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-colors",
        scrolled
          ? "bg-background/80 border-border border-b backdrop-blur-md"
          : "bg-background/60 border-b border-transparent backdrop-blur-sm",
      )}
    >
      <div className="container mx-auto flex h-14 items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-md">
            <Wallet className="text-primary h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">ExpenseTracker</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Open app</Link>
            </Button>
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get started</Link>
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="bg-background border-border border-t md:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:bg-accent rounded-md px-3 py-2 text-sm"
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <div className="mt-2 flex gap-2 border-t pt-3">
                <Button asChild variant="outline" className="flex-1" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild className="flex-1" size="sm">
                  <Link href="/register">Get started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
