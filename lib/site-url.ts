function normalizeUrl(value: string) {
  const url = value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;

  return url.replace(/\/$/, "");
}

/**
 * Return the public origin for absolute links and metadata.
 *
 * NEXT_PUBLIC_SITE_URL should be the canonical production URL. Vercel's
 * system variables keep preview deployments working without extra setup.
 */
export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return normalizeUrl(configuredUrl);

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return normalizeUrl(vercelUrl);

  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";

  throw new Error(
    "Unable to determine the public site URL. Set NEXT_PUBLIC_SITE_URL in the deployment environment.",
  );
}
