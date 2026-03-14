import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireModuleAccess } from "@/lib/auth/authorization";

export default async function IntegrationsPage() {
  await requireModuleAccess("integrations");

  return (
    <div className="page-stack">
      <PageHeader
        title="Integrations"
        description="EMR, ERP, data source onboarding, mappings, and ingestion monitoring will be implemented here."
      />
      <EmptyState
        title="Integrations module placeholder"
        description="Reserved for source configuration, validation, job status, and mapping workflows."
      />
    </div>
  );
}
