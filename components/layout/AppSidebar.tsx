"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Wallet,
  LayoutDashboard,
  Receipt,
  BarChart3,
  Activity,
  Settings,
  LogOut,
  Shield,
  Tag,
  DatabaseZap,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mainNav: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
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
}

export function AppSidebar({ className, onNavigate, showAdmin = false }: AppSidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const userInitials = user?.email?.[0]?.toUpperCase() || "U";
  const displayName = user?.email?.split("@")[0] || "User";

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full w-64 flex-col border-r",
        className,
      )}
    >
      <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-4">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-md">
            <Wallet className="text-primary h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">ExpenseTracker</span>
        </Link>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <NavSection items={mainNav} isActive={isActive} onNavigate={onNavigate} />

        {showAdmin && (
          <NavSection label="Admin" items={adminNav} isActive={isActive} onNavigate={onNavigate} />
        )}
      </nav>

      <div className="border-sidebar-border space-y-1 border-t p-3">
        {footerNav.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            onNavigate={onNavigate}
          />
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mt-2 flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm leading-tight font-medium">{displayName}</p>
                <p className="text-muted-foreground truncate text-xs leading-tight">
                  {user?.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{displayName}</p>
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
    </aside>
  );
}

function NavSection({
  label,
  items,
  isActive,
  onNavigate,
}: {
  label?: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <p className="text-muted-foreground px-2 pb-1 text-xs font-medium tracking-wider uppercase">
          {label}
        </p>
      )}
      {items.map((item) => (
        <SidebarLink
          key={item.href}
          item={item}
          active={isActive(item.href)}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function SidebarLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.name}</span>
    </Link>
  );
}
