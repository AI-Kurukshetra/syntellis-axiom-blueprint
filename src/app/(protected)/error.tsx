"use client";

import { ErrorState } from "@/components/ui/error-state";

type ProtectedErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProtectedError({ error, reset }: ProtectedErrorProps) {
  return (
    <ErrorState
      title="Protected workspace failed to load"
      description={error.message || "The authenticated workspace could not be rendered."}
      onAction={reset}
    />
  );
}
