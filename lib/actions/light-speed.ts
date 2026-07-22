"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getValidAccessToken } from "@/lib/lightspeed/api";

/**
 * Initiates the OAuth flow with Lightspeed. Generates CSRF state server-side,
 * stores it alongside the active shop ID in httpOnly cookies, and redirects
 * to the Lightspeed authorize page.
 */
export async function initiateLightspeedAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const shopId = user.user_metadata?.active_shop_id as string | undefined;
  if (!shopId) {
    redirect("/onboarding");
  }

  const state = randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("lightspeed_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  cookieStore.set("lightspeed_oauth_shop_id", shopId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  const clientId = process.env.LIGHTSPEED_CLIENT_ID;

  const authUrl =
    `https://cloud.lightspeedapp.com/auth/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&scope=employee:register+employee:inventory+employee:workbench` +
    `&state=${state}`;

  redirect(authUrl);
}

/**
 * Disconnects Lightspeed from the active shop. Deletes the integration row
 * and clears the Lightspeed account ID on the shop. Only owners can do this
 * (enforced by RLS DELETE policy).
 */
export async function logoutLightspeed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const shopId = user.user_metadata?.active_shop_id as string | undefined;
  if (!shopId) {
    redirect("/onboarding");
  }

  // Delete integration row (RLS restricts to owner)
  const { error: deleteError } = await supabase
    .from("lightspeed_integrations")
    .delete()
    .eq("shop_id", shopId)
    .eq("integration_type", "lightspeed");

  if (deleteError) {
    console.error("[Lightspeed] Disconnect failed:", deleteError);
  }

  // Clear the Lightspeed account ID from the shop (service client needed
  // because shops UPDATE is restricted)
  const serviceClient = createServiceClient();
  const { error: shopUpdateError } = await serviceClient
    .from("shops")
    .update({ lightspeed_account_id: null })
    .eq("id", shopId);

  if (shopUpdateError) {
    console.error(
      "[Lightspeed] Failed to clear shop account ID:",
      shopUpdateError,
    );
  }

  // Clear any legacy cookies
  const cookieStore = await cookies();
  cookieStore.set("lightspeed_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  cookieStore.set("lightspeed_account_id", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  redirect("/protected/lightspeed");
}

/**
 * Checks if a shop has a Lightspeed integration row (regardless of token validity).
 * Takes an explicit shopId to avoid JWT staleness after createShopAndMembership
 * or acceptInvitation where the client-side JWT may not yet have active_shop_id.
 */
export async function shopHasLightspeedIntegration(
  shopId: string,
): Promise<boolean> {
  const token = await getValidAccessToken(shopId);
  return token !== null;
}

/**
 * Checks if the current shop has a valid Lightspeed access token.
 * Uses the database-backed token store with automatic refresh.
 */
export async function isTokenValid(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const shopId = user.user_metadata?.active_shop_id as string | undefined;
    if (!shopId) return false;

    const token = await getValidAccessToken(shopId);
    return token !== null;
  } catch {
    return false;
  }
}
