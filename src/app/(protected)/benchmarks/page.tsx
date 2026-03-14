import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireModuleAccess } from "@/lib/auth/authorization";

export default async function BenchmarksPage() {
  await requireModuleAccess("benchmarks");

  return (
    <div className="page-stack">
      <PageHeader
        title="Benchmarks & Planning"
        description="Targets, peer comparisons, and planning scenarios will be implemented in this module."
      />
      <EmptyState
        title="Benchmarking module placeholder"
        description="Reserved for targets, benchmark datasets, scenario versions, and variance analysis."
      />
    </div>
  );
}
