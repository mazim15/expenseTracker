"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { MobileTabBar } from "./MobileTabBar";
import { useBackgroundJobs } from "@/lib/hooks/useBackgroundJobs";

const COLLAPSE_KEY = "sidebarCollapsed";

interface AppShellProps {
  children: React.ReactNode;
  showAdmin?: boolean;
}

export function AppShell({ children, showAdmin = false }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  useBackgroundJobs();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  return (
    <div className="bg-background gradient-mesh flex min-h-screen bg-fixed">
      <div className="sticky top-0 hidden h-screen shrink-0 p-3 pr-0 lg:block">
        <AppSidebar
          className="border-sidebar-border shadow-soft rounded-3xl border"
          showAdmin={showAdmin}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar showAdmin={showAdmin} />
        <main className="flex-1 pb-28 lg:pb-6">{children}</main>
      </div>
      <MobileTabBar />
    </div>
  );
}
