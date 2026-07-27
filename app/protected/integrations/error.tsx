"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function IntegrationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <ErrorCard
        error={error}
        reset={reset}
        title="Unable to load integrations"
        message="There was a problem loading the integrations page."
        homeHref="/protected/integrations"
      />
    </div>
  );
}
