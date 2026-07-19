"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function MembersError({
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
        title="Unable to load members"
        message="There was a problem loading the members page."
        homeHref="/protected/members"
      />
    </div>
  );
}
