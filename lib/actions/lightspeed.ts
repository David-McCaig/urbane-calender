'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { fetchLightspeedWorkOrders } from '@/lib/lightspeed/api';
import { randomBytes } from 'crypto';

export interface LightspeedStatus {
  connected: boolean;
  accountId: string | null;
  shopId: string;
}

/**
 * Initiate the Lightspeed OAuth flow.
 * Generates CSRF state, sets a cookie, redirects to Lightspeed authorize page.
 * Matches the work-order-bumper-urbane reference project flow.
 */
export async function initiateLightspeedAuth(shopId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const resolvedShopId =
    shopId || (user.user_metadata?.active_shop_id as string | undefined);
  if (!resolvedShopId) {
    redirect('/onboarding');
  }

  const state = randomBytes(16).toString('hex');

  const cookieStore = await cookies();
  cookieStore.set('lightspeed_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  cookieStore.set('lightspeed_oauth_shop_id', resolvedShopId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  const clientId = process.env.LIGHTSPEED_CLIENT_ID;

  const authUrl = `https://cloud.lightspeedapp.com/auth/oauth/authorize?response_type=code&client_id=${clientId}&scope=employee:register+employee:inventory+employee:workbench&state=${state}`;

  redirect(authUrl);
}

export interface LightspeedStatus {
  connected: boolean;
  accountId: string | null;
  shopId: string;
}

/**
 * Get the Lightspeed connection status for a shop.
 * Returns whether the shop has a Lightspeed integration and the account ID.
 */
export async function getLightspeedStatus(
  shopId: string,
): Promise<LightspeedStatus> {
  const serviceClient = createServiceClient();

  const { data: integration, error } = await serviceClient
    .from('lightspeed_integrations')
    .select('account_id')
    .eq('shop_id', shopId)
    .eq('integration_type', 'lightspeed')
    .maybeSingle();

  return {
    connected: !error && !!integration,
    accountId: integration?.account_id ?? null,
    shopId,
  };
}

/**
 * Sync work orders from Lightspeed for the active shop.
 * Returns the count of work orders fetched, or null if not connected.
 */
export async function syncLightspeedWorkOrders(
  shopId: string,
): Promise<{ success: boolean; count: number | null; error?: string }> {
  try {
    const workOrders = await fetchLightspeedWorkOrders(shopId);

    if (workOrders === null) {
      return {
        success: false,
        count: null,
        error: 'No Lightspeed integration configured for this shop.',
      };
    }

    console.log(
      `[Lightspeed Sync] Shop ${shopId}: ${workOrders.length} work orders fetched`,
    );

    return {
      success: true,
      count: workOrders.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Lightspeed Sync] Failed:', message);
    return {
      success: false,
      count: null,
      error: message,
    };
  }
}

/**
 * Disconnect Lightspeed from a shop.
 * Deletes the integration row and clears the lightspeed_account_id on the shop.
 * Only owners should call this.
 */
export async function disconnectLightspeed(
  shopId: string,
): Promise<{ success: boolean; error?: string }> {
  const serviceClient = createServiceClient();

  const { error: deleteError } = await serviceClient
    .from('lightspeed_integrations')
    .delete()
    .eq('shop_id', shopId)
    .eq('integration_type', 'lightspeed');

  if (deleteError) {
    console.error('[Lightspeed] Disconnect failed:', deleteError);
    return { success: false, error: deleteError.message };
  }

  // Clear the Lightspeed account ID from the shop
  const { error: shopUpdateError } = await serviceClient
    .from('shops')
    .update({ lightspeed_account_id: null })
    .eq('id', shopId);

  if (shopUpdateError) {
    console.error(
      '[Lightspeed] Failed to clear shop account ID:',
      shopUpdateError,
    );
  }

  return { success: true };
}
