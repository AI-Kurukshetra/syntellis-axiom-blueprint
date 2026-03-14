import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireModuleAccess } from "@/lib/auth/authorization";

export default async function DashboardPage() {
  await requireModuleAccess("dashboard");

  return (
    <div className="page-stack">
      <PageHeader
        title="Dashboard Workspace"
        description="Executive scorecards, KPI widgets, and role-based dashboards will be implemented in this module."
      />
      <EmptyState
        title="Dashboard shell ready"
        description="Use this page for executive dashboards, operational KPI boards, and facility drill-down entry points."
      />
    </div>
  );
}
