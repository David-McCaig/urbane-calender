import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL('/auth/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    );
  }

  const shopId = user.user_metadata?.active_shop_id as string | undefined;
  if (!shopId) {
    return NextResponse.redirect(
      new URL('/onboarding', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    );
  }

  // Generate CSRF state
  const state = randomBytes(16).toString('hex');

  const authorizeUrl = new URL(
    'https://cloud.lightspeedapp.com/oauth/authorize.php',
  );
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set(
    'client_id',
    process.env.LIGHTSPEED_CLIENT_ID!,
  );
  authorizeUrl.searchParams.set('scope', 'employee:all');
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set('lightspeed_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
