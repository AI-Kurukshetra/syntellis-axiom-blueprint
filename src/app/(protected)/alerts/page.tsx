import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireModuleAccess } from "@/lib/auth/authorization";

export default async function AlertsPage() {
  await requireModuleAccess("alerts");

  return (
    <div className="page-stack">
      <PageHeader
        title="Alerts"
        description="Threshold alerts, escalations, notifications, and acknowledgment workflows will be implemented here."
      />
      <EmptyState
        title="Alerts module placeholder"
        description="Reserved for alert rules, alert center, recipient management, and event history."
      />
    </div>
  );
}
