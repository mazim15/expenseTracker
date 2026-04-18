import Link from "next/link";
import { Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background relative flex min-h-screen flex-col">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-md">
            <Wallet className="text-primary h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">ExpenseTracker</span>
        </Link>
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
