import Link from "next/link";
import { BrandLogo } from "./Brand";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <Link href="/">
          <BrandLogo />
        </Link>
        <p className="text-muted-foreground text-center text-sm">
          &copy; {new Date().getFullYear()} Expense Tracker. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
