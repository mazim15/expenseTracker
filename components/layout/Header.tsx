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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  X
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
    signOut: () => Promise<void> 
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
      badge: null
    },
    { 
      name: "Expenses", 
      href: "/expenses", 
      icon: CreditCard, 
      description: "Track spending",
      badge: "Hot"
    },
    { 
      name: "Analytics", 
      href: "/analytics", 
      icon: TrendingUp, 
      description: "Financial insights",
      badge: null
    },
    { 
      name: "Activity", 
      href: "/activity", 
      icon: Activity, 
      description: "System logs",
      badge: null
    },
    { 
      name: "Settings", 
      href: "/settings", 
      icon: Settings, 
      description: "Preferences",
      badge: null
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
    if (user?.email) return user.email.split('@')[0];
    return "User";
  };

  // Handle search functionality
  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    
    // Navigate to expenses page with search query
    const searchParams = new URLSearchParams();
    searchParams.set('search', query.trim());
    router.push(`/expenses?${searchParams.toString()}`);
    
    // Close search
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
    if (e.key === 'Escape') {
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
          ? "border-b bg-background/80 backdrop-blur-xl shadow-lg supports-[backdrop-filter]:bg-background/60" 
          : "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
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
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md" />
              <Wallet className="relative h-8 w-8 text-primary" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
                ExpenseTracker
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Pro
              </span>
            </div>
          </Link>
        </motion.div>

        {/* Desktop Navigation */}
        {user && (
          <nav className="hidden lg:flex items-center space-x-1">
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
                    "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive(item.href)
                      ? "text-primary bg-primary/10 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isActive(item.href) 
                      ? "text-primary" 
                      : "group-hover:scale-110"
                  )} />
                  <span>{item.name}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-gradient-to-r from-orange-500 to-red-500 text-white">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive(item.href) && (
                    <motion.div
                      className="absolute bottom-0 left-1/2 w-1 h-1 bg-primary rounded-full"
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
                className="hidden md:flex items-center relative"
                initial={{ width: 40, opacity: 0 }}
                animate={{ 
                  width: searchOpen ? 280 : 40, 
                  opacity: 1 
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {!searchOpen ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchOpen(true)}
                    className="h-9 w-9 p-0 hover:bg-muted/80"
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
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search expenses, categories, amounts..."
                        className="h-9 pl-9 pr-20 bg-muted/50 border-0 focus:bg-background/80 transition-colors"
                        autoFocus
                        onBlur={(e) => {
                          // Don't close if clicking on search button or suggestions
                          if (!e.relatedTarget?.closest('.search-container')) {
                            setTimeout(() => {
                              setSearchOpen(false);
                              setSearchQuery("");
                            }, 150);
                          }
                        }}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                          ↵
                        </kbd>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="h-5 w-5 p-0 hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Search Suggestions Dropdown */}
                    {searchQuery.trim() && (
                      <motion.div
                        className="search-container absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-lg rounded-lg border shadow-lg z-50"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="p-2 space-y-1">
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                            Search in expenses
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSearch(searchQuery)}
                            className="w-full justify-start h-8 px-2 text-left"
                          >
                            <Search className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span className="truncate">&quot;{searchQuery}&quot; in descriptions</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSearch(`amount:${searchQuery}`)}
                            className="w-full justify-start h-8 px-2 text-left"
                          >
                            <DollarSign className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span className="truncate">Amount: {searchQuery}</span>
                          </Button>
                          {searchQuery.toLowerCase().match(/^(food|transport|shopping|entertainment|utilities|healthcare|education|personal|other)/) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSearch(`category:${searchQuery}`)}
                              className="w-full justify-start h-8 px-2 text-left"
                            >
                              <Tags className="h-3 w-3 mr-2 text-muted-foreground" />
                              <span className="truncate">Category: {searchQuery}</span>
                            </Button>
                          )}
                        </div>
                        <div className="border-t p-2">
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
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
                                className="w-full justify-between h-8 px-2"
                              >
                                <div className="flex items-center">
                                  <item.icon className="h-3 w-3 mr-2 text-muted-foreground" />
                                  <span>{item.name}</span>
                                </div>
                                <kbd className="h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
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
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="sm" asChild className="hidden md:flex h-9 gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90">
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
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-blue-600/20 text-primary font-semibold text-sm">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-blue-600/20 text-primary font-semibold">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                          <p className="text-xs leading-none text-muted-foreground mt-1">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant="secondary" className="text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-400">
                          <Shield className="h-3 w-3 mr-1" />
                          Pro User
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
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
                  <DropdownMenuItem onClick={() => signOut()} className="text-red-600 focus:text-red-600 flex items-center gap-2">
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
                    <div className="flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-6">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-blue-600/20 text-primary font-semibold text-lg">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{getUserDisplayName()}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      
                      <nav className="flex flex-col space-y-2">
                        {navItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors",
                              isActive(item.href)
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            <div className="flex flex-col">
                              <span>{item.name}</span>
                              <span className="text-xs text-muted-foreground">{item.description}</span>
                            </div>
                            {item.badge && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        ))}
                      </nav>

                      <div className="mt-auto pt-6 border-t space-y-2">
                        <Button asChild className="w-full">
                          <Link href="/expenses?add=true" onClick={() => setMobileMenuOpen(false)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Expense
                          </Link>
                        </Button>
                        <Button variant="outline" onClick={() => signOut()} className="w-full">
                          <LogOut className="h-4 w-4 mr-2" />
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
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button asChild className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90">
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