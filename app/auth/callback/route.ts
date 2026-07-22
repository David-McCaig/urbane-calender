import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realm_id");

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

  // 1. Validate CSRF state
  const storedState = request.cookies.get("lightspeed_oauth_state")?.value;
  if (!code || !state || state !== storedState) {
    const errorResponse = NextResponse.redirect(
      new URL("/protected?error=lightspeed_invalid_state", baseUrl),
    );
    clearOAuthCookies(errorResponse);
    return errorResponse;
  }

  // 2. Exchange authorization code for tokens
  const tokenResponse = await fetch(
    "https://cloud.lightspeedapp.com/auth/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.LIGHTSPEED_CLIENT_ID,
        client_secret: process.env.LIGHTSPEED_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    },
  );

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    console.error(
      "Lightspeed token exchange failed:",
      tokenResponse.status,
      body,
    );
    const errorResponse = NextResponse.redirect(
      new URL("/protected?error=lightspeed_token_exchange_failed", baseUrl),
    );
    clearOAuthCookies(errorResponse);
    return errorResponse;
  }

  let tokens: { access_token?: string; refresh_token?: string; expires_in?: number };
  try {
    tokens = await tokenResponse.json();
  } catch {
    console.error("[Lightspeed Callback] Failed to parse token response JSON");
    const errorResponse = NextResponse.redirect(
      new URL("/protected?error=lightspeed_token_parse_failed", baseUrl),
    );
    clearOAuthCookies(errorResponse);
    return errorResponse;
  }

  // 3. Get current user and resolve shop
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("[Lightspeed Callback] No user in session");
    const errorResponse = NextResponse.redirect(new URL("/auth/login", baseUrl));
    clearOAuthCookies(errorResponse);
    return errorResponse;
  }

  const shopId = request.cookies.get("lightspeed_oauth_shop_id")?.value;
  if (!shopId) {
    console.error("[Lightspeed Callback] No shop_id cookie found");
    const errorResponse = NextResponse.redirect(new URL("/onboarding", baseUrl));
    clearOAuthCookies(errorResponse);
    return errorResponse;
  }

  // 4. Resolve account ID — prefer realm_id from query params, fall back to API call
  let accountId = realmId ?? null;
  if (!accountId) {
    try {
      const accountResponse = await fetch(
        `https://api.lightspeedapp.com/API/V3/Account.json`,
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );
      if (accountResponse.ok) {
        const data = await accountResponse.json();
        accountId = data?.Account?.accountID ?? null;
      }
    } catch (err) {
      console.error("[Lightspeed Callback] Failed to fetch account ID:", err);
    }
  }

  // 5. Store tokens in DB (service client — bootstrap-like operation)
  const serviceClient = createServiceClient();
  const expiresIn = tokens.expires_in ?? 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error: dbError } = await serviceClient
    .from("lightspeed_integrations")
    .upsert(
      {
        shop_id: shopId,
        integration_type: "lightspeed",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        account_id: accountId,
      },
      { onConflict: "shop_id, integration_type" },
    );

  if (dbError) {
    console.error("[Lightspeed Callback] DB upsert failed:", dbError);
    const errorResponse = NextResponse.redirect(
      new URL("/protected?error=lightspeed_store_failed", baseUrl),
    );
    clearOAuthCookies(errorResponse);
    return errorResponse;
  }

  // 6. Sync account ID to shops table
  if (accountId) {
    const { error: shopUpdateError } = await serviceClient
      .from("shops")
      .update({ lightspeed_account_id: accountId })
      .eq("id", shopId);
    if (shopUpdateError) {
      console.error(
        "[Lightspeed Callback] Failed to sync account ID to shop:",
        shopUpdateError,
      );
    }
  }

  // 7. Redirect to protected page, clear OAuth cookies
  const response = NextResponse.redirect(
    new URL("/protected?lightspeed=connected", baseUrl),
  );
  clearOAuthCookies(response);
  // Also clear old cookie-based token storage for backward compat
  response.cookies.set("lightspeed_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("lightspeed_account_id", "", { maxAge: 0, path: "/" });

  return response;
}

/** Clear transient OAuth cookies. */
function clearOAuthCookies(response: NextResponse) {
  response.cookies.set("lightspeed_oauth_state", "", { maxAge: 0, path: "/" });
  response.cookies.set("lightspeed_oauth_shop_id", "", { maxAge: 0, path: "/" });
}
