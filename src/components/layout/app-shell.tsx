import type { ReactNode } from "react";

import { AppSidebar } from "@/components/navigation/app-sidebar";

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <AppSidebar />
      <main className="app-main">
        <div className="content-shell app-content">{children}</div>
      </main>
    </div>
  );
}
