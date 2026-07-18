"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function AcceptInvitationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <ErrorCard
        error={error}
        reset={reset}
        title="Unable to load invitation"
        message="There was a problem loading your invitation. Ask the shop owner for a new one if this persists."
        homeHref="/"
      />
    </div>
  );
}
