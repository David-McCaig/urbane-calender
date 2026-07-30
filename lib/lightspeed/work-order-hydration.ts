import type { WorkOrderHydrationResult } from "@/lib/actions/light-speed";

export const HYDRATION_MIN_RETRY_MS = 11_000;
export const HYDRATION_BASE_RETRY_MS = 15_000;
export const HYDRATION_MAX_RETRY_MS = 5 * 60_000;
export const HYDRATION_RETRY_JITTER_MS = 1_000;
export const HYDRATION_MAX_ATTEMPTS = 5;

export function shouldRetryHydration(
  result: WorkOrderHydrationResult,
  attempt: number,
): boolean {
  return result.status !== "ok" &&
    result.retryable &&
    attempt < HYDRATION_MAX_ATTEMPTS;
}

export function getHydrationRetryDelay(
  result: WorkOrderHydrationResult,
  attempt: number,
  now = Date.now(),
  random = Math.random(),
): number {
  let retryAfterMs = 0;
  if (result.status === "rate_limited" && result.retryAfter) {
    const retryAfterSeconds = Number(result.retryAfter);
    if (Number.isFinite(retryAfterSeconds)) {
      retryAfterMs = retryAfterSeconds * 1_000;
    } else {
      const retryAfterDate = Date.parse(result.retryAfter);
      if (Number.isFinite(retryAfterDate)) {
        retryAfterMs = Math.max(0, retryAfterDate - now);
      }
    }
  }

  const backoffMs = Math.min(
    HYDRATION_BASE_RETRY_MS * 2 ** attempt,
    HYDRATION_MAX_RETRY_MS,
  );
  return (
    Math.max(HYDRATION_MIN_RETRY_MS, retryAfterMs, backoffMs) +
    random * HYDRATION_RETRY_JITTER_MS
  );
}
