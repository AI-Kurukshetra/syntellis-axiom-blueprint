import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireModuleAccess } from "@/lib/auth/authorization";

export default async function AnalyticsPage() {
  await requireModuleAccess("analytics");

  return (
    <div className="page-stack">
      <PageHeader
        title="Analytics"
        description="Financial, clinical, operational, revenue cycle, and benchmark analytics surfaces will live here."
      />
      <EmptyState
        title="Analytics module placeholder"
        description="Reserved for KPI exploration, drill-downs, trends, and benchmark comparisons."
      />
    </div>
  );
}
