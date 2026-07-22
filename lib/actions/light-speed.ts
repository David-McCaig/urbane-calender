"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Initiates the OAuth flow with Lightspeed
 * @param state - CSRF state token
 */
export async function initiateLightspeedAuth(state: string) {
  const clientId = process.env.LIGHTSPEED_CLIENT_ID;

  // Store state in httpOnly cookie so callback can validate it against the
  // state param returned by Lightspeed — prevents CSRF authorization code
  // injection attacks.
  const cookieStore = await cookies();
  cookieStore.set("lightspeed_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes — user must complete OAuth within this window
  });

  const authUrl = `https://cloud.lightspeedapp.com/auth/oauth/authorize?response_type=code&client_id=${clientId}&scope=employee:register+employee:inventory+employee:workbench&state=${state}`;

  redirect(authUrl);
}

/**
 * Checks if the current Lightspeed token is still valid
 * @returns Promise<boolean> - true if token is valid, false otherwise
 */
export async function isTokenValid(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("lightspeed_token")?.value;
    const lightSpeedApiUrl = process.env.LIGHTSPEED_API_URL;
    if (!token) {
      return false;
    }

    const response = await fetch(`${lightSpeedApiUrl}/API/V3/Account.json`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
