"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Wallet,
  Home,
  CreditCard,
  Settings,
  Menu,
  LogOut,
  HelpCircle,
  Star,
  Search,
  Plus,
  Activity,
  TrendingUp,
  DollarSign,
  Shield,
  Tags,
  X,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

// Extend the Firebase User type to include the properties we need
interface ExtendedUser extends FirebaseUser {
  displayName: string | null;
  photoURL: string | null;
}

export function Header() {
  const { user, signOut } = useAuth() as {
    user: ExtendedUser | null;
    signOut: () => Promise<void>;
  };
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/");
  };

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      description: "Overview & insights",
      badge: null,
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: CreditCard,
      description: "Track spending",
      badge: "Hot",
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: TrendingUp,
      description: "Financial insights",
      badge: null,
    },
    {
      name: "Activity",
      href: "/activity",
      icon: Activity,
      description: "System logs",
      badge: null,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      description: "Preferences",
      badge: null,
    },
  ];

  const userInitials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0].toUpperCase() || "U";

  const getUserDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  };

  // Handle search functionality
  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    // Navigate to expenses page with search query
    const searchParams = new URLSearchParams();
    searchParams.set("search", query.trim());
    router.push(`/expenses?${searchParams.toString()}`);

    // Close search
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(searchQuery);
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  // Quick navigation shortcuts
  const quickNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home, shortcut: "⌘D" },
    { name: "Expenses", href: "/expenses", icon: CreditCard, shortcut: "⌘E" },
    { name: "Analytics", href: "/analytics", icon: TrendingUp, shortcut: "⌘A" },
    { name: "Settings", href: "/settings", icon: Settings, shortcut: "⌘S" },
  ];

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled
          ? "bg-background/80 supports-[backdrop-filter]:bg-background/60 border-b shadow-lg backdrop-blur-xl"
          : "bg-background/95 supports-[backdrop-filter]:bg-background/80 border-b backdrop-blur",
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
    >
      <div className="container flex h-16 items-center">
        {/* Logo Section */}
        <motion.div
          className="mr-6 flex items-center"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-3">
            <motion.div
              className="relative"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
            >
              <div className="bg-primary/20 absolute inset-0 rounded-full blur-md" />
              <Wallet className="text-primary relative h-8 w-8" />
            </motion.div>
            <div className="flex flex-col">
              <span className="from-primary bg-gradient-to-r via-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent">
                ExpenseTracker
              </span>
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Pro
              </span>
            </div>
          </Link>
        </motion.div>

        {/* Desktop Navigation */}
        {user && (
          <nav className="hidden items-center space-x-1 lg:flex">
            {navItems.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                    isActive(item.href)
                      ? "text-primary bg-primary/10 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isActive(item.href) ? "text-primary" : "group-hover:scale-110",
                    )}
                  />
                  <span>{item.name}</span>
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className="h-4 bg-gradient-to-r from-orange-500 to-red-500 px-1.5 text-[10px] text-white"
                    >
                      {item.badge}
                    </Badge>
                  )}
                  {isActive(item.href) && (
                    <motion.div
                      className="bg-primary absolute bottom-0 left-1/2 h-1 w-1 rounded-full"
                      layoutId="activeIndicator"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </nav>
        )}

        <div className="flex-1" />

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2">
          {user && (
            <>
              {/* Enhanced Quick Search */}
              <motion.div
                className="relative hidden items-center md:flex"
                initial={{ width: 40, opacity: 0 }}
                animate={{
                  width: searchOpen ? 280 : 40,
                  opacity: 1,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {!searchOpen ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchOpen(true)}
                    className="hover:bg-muted/80 h-9 w-9 p-0"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                ) : (
                  <motion.div
                    className="relative w-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="relative">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search expenses, categories, amounts..."
                        className="bg-muted/50 focus:bg-background/80 h-9 border-0 pr-20 pl-9 transition-colors"
                        autoFocus
                        onBlur={(e) => {
                          // Don't close if clicking on search button or suggestions
                          if (!e.relatedTarget?.closest(".search-container")) {
                            setTimeout(() => {
                              setSearchOpen(false);
                              setSearchQuery("");
                            }, 150);
                          }
                        }}
                      />
                      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
                        <kbd className="bg-muted text-muted-foreground hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:inline-flex">
                          ↵
                        </kbd>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="hover:bg-muted-foreground/20 h-5 w-5 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Search Suggestions Dropdown */}
                    {searchQuery.trim() && (
                      <motion.div
                        className="search-container bg-background/95 absolute top-full right-0 left-0 z-50 mt-2 rounded-lg border shadow-lg backdrop-blur-lg"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="space-y-1 p-2">
                          <div className="text-muted-foreground px-2 py-1 text-xs font-medium">
                            Search in expenses
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSearch(searchQuery)}
                            className="h-8 w-full justify-start px-2 text-left"
                          >
                            <Search className="text-muted-foreground mr-2 h-3 w-3" />
                            <span className="truncate">
                              &quot;{searchQuery}&quot; in descriptions
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSearch(`amount:${searchQuery}`)}
                            className="h-8 w-full justify-start px-2 text-left"
                          >
                            <DollarSign className="text-muted-foreground mr-2 h-3 w-3" />
                            <span className="truncate">Amount: {searchQuery}</span>
                          </Button>
                          {searchQuery
                            .toLowerCase()
                            .match(
                              /^(food|transport|shopping|entertainment|utilities|healthcare|education|personal|other)/,
                            ) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSearch(`category:${searchQuery}`)}
                              className="h-8 w-full justify-start px-2 text-left"
                            >
                              <Tags className="text-muted-foreground mr-2 h-3 w-3" />
                              <span className="truncate">Category: {searchQuery}</span>
                            </Button>
                          )}
                        </div>
                        <div className="border-t p-2">
                          <div className="text-muted-foreground px-2 py-1 text-xs font-medium">
                            Quick navigation
                          </div>
                          <div className="space-y-1">
                            {quickNavItems.map((item) => (
                              <Button
                                key={item.href}
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  router.push(item.href);
                                  setSearchOpen(false);
                                  setSearchQuery("");
                                }}
                                className="h-8 w-full justify-between px-2"
                              >
                                <div className="flex items-center">
                                  <item.icon className="text-muted-foreground mr-2 h-3 w-3" />
                                  <span>{item.name}</span>
                                </div>
                                <kbd className="bg-muted text-muted-foreground h-4 items-center gap-1 rounded border px-1 font-mono text-[10px] font-medium opacity-100 select-none">
                                  {item.shortcut}
                                </kbd>
                              </Button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </motion.div>

              {/* Quick Add Button */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  asChild
                  className="from-primary hover:from-primary/90 hidden h-9 gap-2 bg-gradient-to-r to-blue-600 hover:to-blue-600/90 md:flex"
                >
                  <Link href="/expenses?add=true">
                    <Plus className="h-4 w-4" />
                    Add
                  </Link>
                </Button>
              </motion.div>

              {/* Notifications */}
              <NotificationBell />
            </>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {user ? (
            <>
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback className="from-primary/20 text-primary bg-gradient-to-br to-blue-600/20 text-sm font-semibold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="border-background absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 bg-green-500" />
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback className="from-primary/20 text-primary bg-gradient-to-br to-blue-600/20 font-semibold">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm leading-none font-medium">{getUserDisplayName()}</p>
                          <p className="text-muted-foreground mt-1 text-xs leading-none">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge
                          variant="secondary"
                          className="bg-gradient-to-r from-green-100 to-emerald-100 text-xs text-green-700 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-400"
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          Pro User
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                          Premium
                        </Badge>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/expenses" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        My Expenses
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/analytics" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Analytics
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/activity" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Activity Logs
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      Help & Support
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="flex items-center gap-2 text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu for authenticated users */}
              <div className="lg:hidden">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <div className="flex h-full flex-col">
                      <div className="mb-6 flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback className="from-primary/20 text-primary bg-gradient-to-br to-blue-600/20 text-lg font-semibold">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{getUserDisplayName()}</p>
                          <p className="text-muted-foreground text-sm">{user.email}</p>
                        </div>
                      </div>

                      <nav className="flex flex-col space-y-2">
                        {navItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg p-3 text-sm font-medium transition-colors",
                              isActive(item.href)
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted",
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            <div className="flex flex-col">
                              <span>{item.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {item.description}
                              </span>
                            </div>
                            {item.badge && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        ))}
                      </nav>

                      <div className="mt-auto space-y-2 border-t pt-6">
                        <Button asChild className="w-full">
                          <Link href="/expenses?add=true" onClick={() => setMobileMenuOpen(false)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Expense
                          </Link>
                        </Button>
                        <Button variant="outline" onClick={() => signOut()} className="w-full">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild className="hidden sm:flex">
                <Link href="/login">Login</Link>
              </Button>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  asChild
                  className="from-primary hover:from-primary/90 bg-gradient-to-r to-blue-600 hover:to-blue-600/90"
                >
                  <Link href="/register">Get Started</Link>
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
