import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireModuleAccess } from "@/lib/auth/authorization";

export default async function CompliancePage() {
  await requireModuleAccess("compliance");

  return (
    <div className="page-stack">
      <PageHeader
        title="Compliance & Audit"
        description="Audit trails, access reviews, and compliance reporting will be implemented in this module."
      />
      <EmptyState
        title="Compliance module placeholder"
        description="Use this page for audit search, sensitive access review, and regulatory report surfaces."
      />
    </div>
  );
}
