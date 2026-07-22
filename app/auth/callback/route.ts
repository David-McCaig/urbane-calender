import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

import { getAccountId } from "@/lib/database/lightspeed";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const clientId = process.env.LIGHTSPEED_CLIENT_ID;
  const clientSecret = process.env.LIGHTSPEED_CLIENT_SECRET;

  // Validate CSRF state: compare query param against the value stored in
  // the httpOnly cookie set by initiateLightspeedAuth before redirecting
  // to Lightspeed. Clears the cookie on mismatch so it can't be replayed.
  const cookieStore = await cookies();
  const storedState = cookieStore.get("lightspeed_oauth_state")?.value;

  if (!code || !state || state !== storedState) {
    const errorResponse = NextResponse.redirect(`${origin}/error`);
    errorResponse.cookies.set("lightspeed_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return errorResponse;
  }

  try {
    const tokenResponse = await axios.post(
      "https://cloud.lightspeedapp.com/auth/oauth/token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
      }
    );

    const data = tokenResponse?.data;
    const refreshToken = data?.refresh_token;

    const newAccessTokenResponse = await axios.post(
      "https://cloud.lightspeedapp.com/auth/oauth/token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }
    );

    const newAccessTokenData = newAccessTokenResponse?.data;
    const newAccessToken = newAccessTokenData?.access_token;

    // Set HTTP-only cookie with the access token
    const response = NextResponse.redirect(`${origin}/protected`);
    response.cookies.set("lightspeed_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    const accountId = await getAccountId(newAccessToken);
    response.cookies.set("lightspeed_account_id", accountId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // Clear the OAuth state cookie — one-time use, consumed now
    response.cookies.set("lightspeed_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error(error);

    // Clear the OAuth state cookie on error too — don't leave it dangling
    const errorResponse = NextResponse.redirect(`${origin}/error`);
    errorResponse.cookies.set("lightspeed_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return errorResponse;
  }
}