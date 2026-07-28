import { createClient } from '@/lib/supabase/server';
import type { LightspeedIntegration } from '@/lib/lightspeed/types';

const LIGHTSPEED_TOKEN_URL =
  'https://cloud.lightspeedapp.com/auth/oauth/token';

const FIVE_MIN_MS = 5 * 60 * 1000;

/**
 * Shared helper — returns the full decrypted Lightspeed integration row
 * for the given shop, or null if none exists. Token refresh is handled
 * transparently when the access token is expired or near-expired.
 */
async function _getIntegration(
  shopId: string,
): Promise<LightspeedIntegration | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required to access Lightspeed tokens');
  }

  const { data: rows, error } = await supabase
    .rpc('get_decrypted_lightspeed_integration', { p_shop_id: shopId });

  if (error) {
    console.error('[_getIntegration] RPC error:', error);
    return null;
  }
  if (!rows || rows.length === 0) {
    return null;
  }

  const integration = rows[0] as LightspeedIntegration;
  const expiresAt = integration.expires_at
    ? new Date(integration.expires_at)
    : null;

  // Refresh if expired or expiring within 5 minutes and a refresh token exists
  if (
    expiresAt &&
    integration.refresh_token &&
    expiresAt.getTime() - Date.now() < FIVE_MIN_MS
  ) {
    return await _refreshAccessToken(shopId, integration);
  }

  // Token is expired and cannot be refreshed
  if (expiresAt && expiresAt.getTime() <= Date.now() && !integration.refresh_token) {
    return null;
  }

  return integration;
}

/**
 * Returns a valid Lightspeed access token for the given shop.
 * Refreshes transparently if the stored token is expired or will expire
 * within 5 minutes. Returns null if the shop has no Lightspeed integration.
 */
export async function getValidAccessToken(
  shopId: string,
): Promise<string | null> {
  const integration = await _getIntegration(shopId);
  return integration?.access_token ?? null;
}

/**
 * Returns both access token and account ID needed for Lightspeed API calls.
 * Refreshes transparently like getValidAccessToken.
 * Returns null if the shop has no Lightspeed integration.
 */
export async function getLightspeedApiConfig(
  shopId: string,
): Promise<{ token: string; accountId: string } | null> {
  const integration = await _getIntegration(shopId);
  if (!integration || !integration.account_id) return null;
  return {
    token: integration.access_token,
    accountId: integration.account_id,
  };
}

/**
 * Refresh an expired or near-expired Lightspeed access token using the
 * refresh_token grant. Updates the stored row and returns the new integration.
 */
async function _refreshAccessToken(
  shopId: string,
  integration: LightspeedIntegration,
): Promise<LightspeedIntegration> {
  const response = await fetch(LIGHTSPEED_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.LIGHTSPEED_CLIENT_ID,
      client_secret: process.env.LIGHTSPEED_CLIENT_SECRET,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Lightspeed token refresh failed: ${response.status} ${body}`,
    );
  }

  const tokens = await response.json();
  const expiresAt = new Date(
    Date.now() + (tokens.expires_in || 3600) * 1000,
  ).toISOString();

  if (!tokens.refresh_token) {
    console.warn(
      '[Lightspeed] Refresh response missing refresh_token — reusing existing one.',
    );
  }
  const newRefreshToken = tokens.refresh_token ?? integration.refresh_token;

  const supabase = await createClient();
  await supabase.rpc('upsert_lightspeed_integration', {
    p_shop_id: shopId,
    p_access_token: tokens.access_token,
    p_refresh_token: newRefreshToken,
    p_expires_at: expiresAt,
    p_account_id: integration.account_id,
  });

  return {
    ...integration,
    access_token: tokens.access_token,
    refresh_token: newRefreshToken,
    expires_at: expiresAt,
  };
}
