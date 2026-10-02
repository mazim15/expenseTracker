import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { BrandLogo } from "@/components/layout/Brand";
import { AuthPanel } from "@/components/layout/AuthPanel";
import { ScaleIn } from "@/components/ui/page-transition";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background grid min-h-screen gap-3 p-3 lg:grid-cols-2">
      <AuthPanel />

      <div className="gradient-mesh relative flex flex-col rounded-[2rem]">
        <div className="flex h-14 items-center justify-between px-3 md:px-4">
          <Link href="/" className="lg:invisible">
            <BrandLogo />
          </Link>
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <ScaleIn className="w-full max-w-md">{children}</ScaleIn>
        </main>
      </div>
    </div>
  );
}
