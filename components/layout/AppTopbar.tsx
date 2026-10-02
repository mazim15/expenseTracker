"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/AuthContext";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Menu, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  expenses: "Expenses",
  analytics: "Analytics",
  "ai-usage": "AI usage",
  settings: "Settings",
  categories: "Categories",
  logs: "Logs",
  migrate: "Migrate",
};

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

interface AppTopbarProps {
  showAdmin?: boolean;
}

export function AppTopbar({ showAdmin = false }: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const segments = pathname.split("/").filter(Boolean);
  const currentLabel = segments.length
    ? (routeLabels[segments[0]] ?? segments[0].charAt(0).toUpperCase() + segments[0].slice(1))
    : "Dashboard";
  const isDashboard = segments[0] === "dashboard";
  const firstName = user?.email?.split("@")[0] || "there";
  const now = new Date();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ⌘K / Ctrl+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (!q) return;
    const params = new URLSearchParams();
    params.set("search", q);
    router.push(`/expenses?${params.toString()}`);
    setSearchValue("");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-3 px-4 transition-[background-color,box-shadow] duration-300 lg:h-20 lg:px-8",
        scrolled && "bg-background/75 shadow-[0_1px_0_var(--border)] backdrop-blur-xl",
      )}
    >
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 overflow-hidden p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar
            className="w-full"
            showAdmin={showAdmin}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        {isDashboard ? (
          <>
            <p className="text-muted-foreground hidden text-xs font-medium sm:block">
              {format(now, "EEEE, d MMMM")}
            </p>
            <h1 className="truncate text-lg font-extrabold tracking-tight lg:text-xl">
              {greeting(now)}, <span className="capitalize">{firstName}</span> 👋
            </h1>
          </>
        ) : (
          <h1 className="truncate text-lg font-extrabold tracking-tight lg:text-xl">
            {currentLabel}
          </h1>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <form onSubmit={onSubmitSearch} className="relative hidden md:block">
          <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <Input
            ref={searchRef}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search expenses…"
            className="bg-card shadow-soft h-10 w-64 rounded-full pr-12 pl-10 focus-visible:w-80"
          />
          <kbd className="text-muted-foreground bg-muted pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium">
            ⌘K
          </kbd>
        </form>

        <Button asChild className="hidden lg:flex">
          <Link href="/expenses?add=true">
            <Plus className="h-4 w-4" />
            Add expense
          </Link>
        </Button>

        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
