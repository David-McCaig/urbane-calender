/**
 * Extract a human-readable error message from any thrown value.
 * Use this instead of writing `err instanceof Error ? err.message : "…"` inline.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred",
): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}
