'use client';

import { ErrorCard } from '@/components/ui/error-card';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <ErrorCard
        error={error}
        reset={reset}
        title="Unable to load settings"
        message="There was a problem loading the settings page."
        homeHref="/protected"
      />
    </div>
  );
}
