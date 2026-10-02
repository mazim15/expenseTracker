"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Receipt, BarChart3, CalendarDays, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

const tabs = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  null, // FAB slot
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-3 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="glassmorphism shadow-lift relative grid grid-cols-5 items-center rounded-3xl px-2 py-1.5">
        {tabs.map((tab) => {
          if (!tab) {
            return (
              <div key="fab" className="flex justify-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring, delay: 0.15 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Link
                    href="/expenses?add=true"
                    aria-label="Add expense"
                    className="bg-hero ring-background shadow-lift -mt-7 flex h-14 w-14 items-center justify-center rounded-2xl ring-4"
                  >
                    <Plus className="h-6 w-6" strokeWidth={2.5} />
                  </Link>
                </motion.div>
              </div>
            );
          }
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="tabbar-active"
                  transition={spring}
                  className="bg-primary/10 absolute inset-0 rounded-2xl"
                />
              )}
              <tab.icon className="relative h-5 w-5" />
              <span className="relative">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
