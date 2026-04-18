"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Menu, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  expenses: "Expenses",
  analytics: "Analytics",
  settings: "Settings",
  categories: "Categories",
  logs: "Logs",
  migrate: "Migrate",
};

interface AppTopbarProps {
  showAdmin?: boolean;
}

export function AppTopbar({ showAdmin = false }: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const segments = pathname.split("/").filter(Boolean);
  const currentLabel = segments.length
    ? (routeLabels[segments[0]] ?? segments[0].charAt(0).toUpperCase() + segments[0].slice(1))
    : "Dashboard";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
        "bg-background/80 border-border sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md lg:px-6",
      )}
    >
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <AppSidebar
            className="border-0"
            showAdmin={showAdmin}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold tracking-tight">{currentLabel}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <form onSubmit={onSubmitSearch} className="relative hidden md:block">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search expenses…"
            className="h-8 w-56 pl-8 text-sm"
          />
        </form>

        <Button asChild size="sm" className="hidden sm:flex">
          <Link href="/expenses?add=true">
            <Plus className="h-4 w-4" />
            Add expense
          </Link>
        </Button>

        <Button asChild size="icon" variant="ghost" className="sm:hidden">
          <Link href="/expenses?add=true" aria-label="Add expense">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>

        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
