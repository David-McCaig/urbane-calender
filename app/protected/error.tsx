"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <ErrorCard
        error={error}
        reset={reset}
        title="Unable to load calendar"
        message="There was a problem loading your shop calendar."
        homeHref="/protected"
      />
    </div>
  );
}
