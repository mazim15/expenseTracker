"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import { useAuth } from "@/lib/auth/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Receipt,
  CalendarDays,
  BarChart3,
  Bot,
  Activity,
  Settings,
  LogOut,
  Shield,
  Tag,
  DatabaseZap,
  HelpCircle,
  Lightbulb,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";
import { BrandLogo } from "./Brand";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mainNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Calendar", href: "/calendar", icon: CalendarDays },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "AI usage", href: "/ai-usage", icon: Bot },
];

const adminNav: NavItem[] = [
  { name: "Categories", href: "/categories", icon: Tag },
  { name: "Logs", href: "/logs", icon: Activity },
  { name: "Migrate", href: "/migrate", icon: DatabaseZap },
];

const footerNav: NavItem[] = [{ name: "Settings", href: "/settings", icon: Settings }];

interface AppSidebarProps {
  className?: string;
  onNavigate?: () => void;
  showAdmin?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({
  className,
  onNavigate,
  showAdmin = false,
  collapsed = false,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  // Separate layout group per instance so the desktop and sheet sidebars don't share the active pill.
  const groupId = useId();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const userInitials = user?.email?.[0]?.toUpperCase() || "U";
  const displayName = user?.email?.split("@")[0] || "User";

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex h-full flex-col transition-[width] duration-300 ease-out",
        collapsed ? "w-[76px]" : "w-64",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-2 px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Link href="/dashboard" onClick={onNavigate}>
          <BrandLogo collapsed={collapsed} />
        </Link>
        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground rounded-lg p-1.5 transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <LayoutGroup id={groupId}>
        <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-3">
          <NavSection
            label={collapsed ? undefined : "Menu"}
            items={mainNav}
            isActive={isActive}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />

          {showAdmin && (
            <NavSection
              label={collapsed ? undefined : "Admin"}
              items={adminNav}
              isActive={isActive}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          )}
        </nav>

        <div className="space-y-2 p-3">
          {!collapsed && <TipCard />}

          {footerNav.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}

          {onToggleCollapse && collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground flex w-full justify-center rounded-xl py-2.5 transition-colors"
            >
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "bg-muted/60 hover:bg-sidebar-accent flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors",
                  collapsed && "justify-center bg-transparent",
                )}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-hero text-sm font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm leading-tight font-semibold">{displayName}</p>
                    <p className="text-muted-foreground truncate text-xs leading-tight">
                      {user?.email}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-muted-foreground text-xs">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" onClick={onNavigate}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              {showAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/categories" onClick={onNavigate}>
                    <Shield className="mr-2 h-4 w-4" /> Admin
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" /> Help
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </LayoutGroup>
    </aside>
  );
}

function NavSection({
  label,
  items,
  isActive,
  onNavigate,
  collapsed,
}: {
  label?: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
  collapsed: boolean;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-muted-foreground px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </p>
      )}
      {items.map((item) => (
        <SidebarLink
          key={item.href}
          item={item}
          active={isActive(item.href)}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}

function SidebarLink({
  item,
  active,
  onNavigate,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.name : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        collapsed && "justify-center px-0",
        active ? "text-sidebar-accent-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          transition={spring}
          className="bg-sidebar-accent absolute inset-0 rounded-xl"
        />
      )}
      {active && !collapsed && (
        <motion.span
          layoutId="sidebar-active-dot"
          transition={spring}
          className="bg-primary absolute top-1/2 -left-3 h-5 w-1 -translate-y-1/2 rounded-r-full"
        />
      )}
      <item.icon className="relative h-[18px] w-[18px]" />
      {!collapsed && <span className="relative">{item.name}</span>}
    </Link>
  );
}

function TipCard() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="bg-hero relative overflow-hidden rounded-2xl p-4">
      <div className="relative z-10 max-w-[70%]">
        <p className="text-sm font-bold">Snap receipts</p>
        <p className="mt-1 text-xs leading-snug opacity-85">
          Scan a receipt and let AI fill in the details.
        </p>
        <Link
          href="/expenses?add=true"
          className="text-foreground mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold transition-transform hover:scale-105 dark:bg-white dark:text-[oklch(0.2_0.02_165)]"
        >
          Try it
        </Link>
      </div>
      {imageFailed ? (
        <Lightbulb className="text-highlight absolute -right-1 -bottom-1 h-16 w-16 rotate-12 opacity-80" />
      ) : (
        <Image
          src="/illustrations/sidebar-tip.png"
          alt=""
          width={88}
          height={88}
          className="animate-float absolute -right-3 -bottom-2"
          onError={() => setImageFailed(true)}
        />
      )}
    </div>
  );
}
