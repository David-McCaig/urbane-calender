import { createServiceClient } from '@/lib/supabase/service';
import type { LightspeedIntegration, LightspeedWorkOrder } from './types';

const LIGHTSPEED_TOKEN_URL =
  'https://cloud.lightspeedapp.com/auth/oauth/token';

const LIGHTSPEED_API_BASE = 'https://api.lightspeedapp.com/API/Account';

const FIVE_MIN_MS = 5 * 60 * 1000;

/**
 * Returns a valid Lightspeed access token for the given shop.
 * Refreshes transparently if the stored token is expired or will expire
 * within 5 minutes. Returns null if the shop has no Lightspeed integration.
 */
export async function getValidAccessToken(
  shopId: string,
): Promise<string | null> {
  const supabase = createServiceClient();

  const { data: integration, error } = await supabase
    .from('lightspeed_integrations')
    .select('*')
    .eq('shop_id', shopId)
    .eq('integration_type', 'lightspeed')
    .single();

  if (error || !integration) return null;

  const expiresAt = integration.expires_at
    ? new Date(integration.expires_at)
    : null;

  if (
    expiresAt &&
    expiresAt.getTime() - Date.now() < FIVE_MIN_MS &&
    integration.refresh_token
  ) {
    return await refreshAccessToken(
      shopId,
      integration as LightspeedIntegration,
    );
  }

  return integration.access_token;
}

/**
 * Refresh an expired Lightspeed access token using the refresh_token grant.
 * Updates the stored row and returns the new access token.
 */
async function refreshAccessToken(
  shopId: string,
  integration: LightspeedIntegration,
): Promise<string> {
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

  const supabase = createServiceClient();
  await supabase
    .from('lightspeed_integrations')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? integration.refresh_token,
      expires_at: expiresAt,
    })
    .eq('shop_id', shopId)
    .eq('integration_type', 'lightspeed');

  return tokens.access_token;
}

/**
 * Fetch work orders from Lightspeed for the given shop.
 * Returns null if the shop has no Lightspeed integration configured.
 * Returns an empty array if the API returns no work orders.
 */
export async function fetchLightspeedWorkOrders(
  shopId: string,
): Promise<LightspeedWorkOrder[] | null> {
  const supabase = createServiceClient();

  // Read Lightspeed account ID from shops table (source of truth)
  const { data: shop, error } = await supabase
    .from('shops')
    .select('lightspeed_account_id')
    .eq('id', shopId)
    .single();

  if (error || !shop?.lightspeed_account_id) return null;

  const token = await getValidAccessToken(shopId);
  if (!token) return null;

  const response = await fetch(
    `${LIGHTSPEED_API_BASE}/${shop.lightspeed_account_id}/WorkOrder.json`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    console.error(
      'Lightspeed API error:',
      response.status,
      await response.text(),
    );
    return [];
  }

  const data = await response.json();
  return (data.WorkOrder ?? []) as LightspeedWorkOrder[];
}
