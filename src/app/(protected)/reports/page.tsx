import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireModuleAccess } from "@/lib/auth/authorization";

export default async function ReportsPage() {
  await requireModuleAccess("reports");

  return (
    <div className="page-stack">
      <PageHeader
        title="Reports"
        description="Self-service reports, templates, scheduling, and exports will be implemented in this module."
      />
      <EmptyState
        title="Reporting module placeholder"
        description="Use this page for report builder, saved reports, scheduled delivery, and export history."
      />
    </div>
  );
}
