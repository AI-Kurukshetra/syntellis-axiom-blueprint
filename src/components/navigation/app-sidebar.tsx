import Link from "next/link";

import { SidebarNav } from "@/components/navigation/sidebar-nav";
import { signOutAction } from "@/features/auth/auth.actions";
import { getAccessibleNavigationItems } from "@/lib/auth/authorization";
import { getCurrentUserContext } from "@/lib/auth/current-user";

export async function AppSidebar() {
  const currentUser = await getCurrentUserContext();
  const availableNavigationItems = currentUser ? getAccessibleNavigationItems(currentUser) : [];
  const displayName = currentUser?.profile?.full_name || currentUser?.authUser.email || "Authenticated user";
  const organizationName = currentUser?.organization?.name || "Tenant not assigned";
  const roleSummary = currentUser?.isBootstrapAdmin
    ? "Bootstrap administrator"
    : currentUser?.roles.map((role) => role.name).join(", ") || "No active roles assigned";

  return (
    <aside className="shell-sidebar">
      <div className="sidebar-brand">
        <span className="brand-tag">Healthcare SaaS</span>
        <Link href="/" className="brand-lockup">
          <div className="brand-mark">AX</div>
          <div className="brand-copy">
            <h1 className="brand-title">Syntellis Axiom</h1>
            <p className="brand-subtitle">Operational intelligence for finance, quality, and planning.</p>
          </div>
        </Link>

        <section className="user-panel">
          <span className="sidebar-label">Signed in as</span>
          <p className="user-panel__name">{displayName}</p>
          <p className="user-panel__meta">{organizationName}</p>
          <p className="user-panel__meta">{roleSummary}</p>
        </section>
      </div>

      <div>
        <SidebarNav items={availableNavigationItems} />
        {availableNavigationItems.length === 0 ? (
          <p className="sidebar-note">No modules are currently assigned to this account.</p>
        ) : null}
      </div>

      <div className="sidebar-footer">
        <p className="sidebar-note">Tenant-aware access and scoped navigation are resolved from your active role assignments.</p>
        <form action={signOutAction}>
          <button type="submit" className="button button-secondary button-block">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
