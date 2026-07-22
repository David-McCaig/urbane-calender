import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const accountId = searchParams.get('realm_id');

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000';

  // 1. Verify state parameter (CSRF protection)
  const storedState = request.cookies.get('lightspeed_oauth_state')?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL('/protected?error=lightspeed_invalid_state', baseUrl),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/protected?error=lightspeed_no_code', baseUrl),
    );
  }

  // 2. Exchange authorization code for tokens
  const tokenResponse = await fetch(
    'https://cloud.lightspeedapp.com/auth/oauth/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.LIGHTSPEED_CLIENT_ID,
        client_secret: process.env.LIGHTSPEED_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.LIGHTSPEED_REDIRECT_URI,
      }),
    },
  );

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    console.error(
      'Lightspeed token exchange failed:',
      tokenResponse.status,
      body,
    );
    return NextResponse.redirect(
      new URL('/protected?error=lightspeed_token_exchange_failed', baseUrl),
    );
  }

  const tokens = await tokenResponse.json();

  // 3. Get current user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[Lightspeed Callback] No user in session');
    return NextResponse.redirect(new URL('/auth/login', baseUrl));
  }

  const shopId = request.cookies.get('lightspeed_oauth_shop_id')?.value;
  if (!shopId) {
    console.error('[Lightspeed Callback] No shop_id cookie found');
    return NextResponse.redirect(new URL('/onboarding', baseUrl));
  }

  console.log('[Lightspeed Callback] Storing tokens for shop:', shopId);

  // 4. Store tokens using service client (bypasses RLS — user auth verified above)
  const serviceClient = createServiceClient();
  const expiresIn = tokens.expires_in ?? 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error: dbError } = await serviceClient
    .from('lightspeed_integrations')
    .upsert(
      {
        shop_id: shopId,
        integration_type: 'lightspeed',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        account_id: accountId ?? null,
      },
      { onConflict: 'shop_id, integration_type' },
    );

  if (dbError) {
    console.error('[Lightspeed Callback] DB upsert failed:', dbError);
    return NextResponse.redirect(
      new URL('/protected?error=lightspeed_store_failed', baseUrl),
    );
  }

  console.log('[Lightspeed Callback] Tokens stored successfully');

  // Sync Lightspeed account ID to shops table (also uses service client — RLS on shops is restrictive)
  if (accountId) {
    const { error: shopUpdateError } = await serviceClient
      .from('shops')
      .update({ lightspeed_account_id: accountId })
      .eq('id', shopId);
    if (shopUpdateError) {
      console.error(
        '[Lightspeed Callback] Failed to sync account ID to shop:',
        shopUpdateError,
      );
    } else {
      console.log('[Lightspeed Callback] Account ID synced to shop:', accountId);
    }
  }

  // 5. Clear state cookie and redirect
  const response = NextResponse.redirect(
    new URL('/protected?lightspeed=connected', baseUrl),
  );
  response.cookies.set('lightspeed_oauth_state', '', {
    maxAge: 0,
    path: '/',
  });
  response.cookies.set('lightspeed_oauth_shop_id', '', {
    maxAge: 0,
    path: '/',
  });

  return response;
}
