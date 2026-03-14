import { LoadingState } from "@/components/ui/loading-state";

export default function ProtectedLoading() {
  return <LoadingState title="Loading workspace" description="Resolving user context, navigation scope, and module data." />;
}
