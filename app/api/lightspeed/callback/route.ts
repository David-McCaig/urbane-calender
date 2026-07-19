import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const accountId = searchParams.get('realm_id');

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
    'https://cloud.lightspeedapp.com/oauth/access_token.php',
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

  // 3. Get current user and active shop
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', baseUrl));
  }

  const shopId = user.user_metadata?.active_shop_id as string | undefined;
  if (!shopId) {
    return NextResponse.redirect(new URL('/onboarding', baseUrl));
  }

  // 4. Store tokens using upsert
  const expiresIn = tokens.expires_in ?? 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error: dbError } = await supabase
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
    console.error('Failed to store Lightspeed tokens:', dbError);
    return NextResponse.redirect(
      new URL('/protected?error=lightspeed_store_failed', baseUrl),
    );
  }

  // Sync Lightspeed account ID to shops table
  if (accountId) {
    const { error: shopUpdateError } = await supabase
      .from('shops')
      .update({ lightspeed_account_id: accountId })
      .eq('id', shopId);
    if (shopUpdateError) {
      console.error(
        'Failed to sync Lightspeed account ID to shop:',
        shopUpdateError,
      );
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

  return response;
}
