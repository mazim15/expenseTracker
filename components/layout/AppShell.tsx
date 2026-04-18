import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";

interface AppShellProps {
  children: React.ReactNode;
  showAdmin?: boolean;
}

export function AppShell({ children, showAdmin = false }: AppShellProps) {
  return (
    <div className="bg-background flex min-h-screen">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <AppSidebar showAdmin={showAdmin} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar showAdmin={showAdmin} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
