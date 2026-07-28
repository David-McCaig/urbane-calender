"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getValidAccessToken, getLightspeedApiConfig } from "@/lib/lightspeed/api";
import type { LightspeedWorkOrder, LightspeedWorkOrderResponse } from "@/lib/lightspeed/types";

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
    `&scope=employee:workbench+employee:inventory_read` +
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

  redirect("/protected/integrations");
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

/**
 * Fetches Lightspeed work orders due on the given date (filtered by etaOut
 * using Lightspeed's native range query). Returns an empty array on error
 * or if no integration is configured.
 */
export async function getWorkOrdersByDate(
  shopId: string,
  date: string, // "YYYY-MM-DD"
): Promise<LightspeedWorkOrder[]> {
  try {
    const config = await getLightspeedApiConfig(shopId);
    if (!config) {
      console.log('[getWorkOrdersByDate] No Lightspeed integration for shop:', shopId);
      return [];
    }

    const { token, accountId } = config;

    // Build date range — etaOut on the given date using Lightspeed's
    // between-operator query: ?etaOut=><,startISO,endISO
    const dateObj = new Date(date);
    const startDate = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      0, 0, 0, 0,
    );
    const endDate = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
      23, 59, 59, 999,
    );
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Lightspeed between operator: %3E%3C = ><  ,  %2C = ,
    const queryString =
      `etaOut=%3E%3C%2C${encodeURIComponent(startISO)}%2C${encodeURIComponent(endISO)}`;

    const url = `https://api.lightspeedapp.com/API/V3/Account/${accountId}/Workorder.json?${queryString}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(
        `[getWorkOrdersByDate] Lightspeed API error: ${response.status}`,
      );
      return [];
    }

    const json: LightspeedWorkOrderResponse = await response.json();

    // Lightspeed returns {} (empty object) when no work orders exist,
    // a single object when one exists, and an array when multiple exist.
    let allWorkOrders: LightspeedWorkOrder[];
    if (!json.Workorder || (typeof json.Workorder === 'object' && !Array.isArray(json.Workorder) && Object.keys(json.Workorder).length === 0)) {
      allWorkOrders = [];
    } else if (!Array.isArray(json.Workorder)) {
      allWorkOrders = [json.Workorder as unknown as LightspeedWorkOrder];
    } else {
      allWorkOrders = json.Workorder;
    }

    return allWorkOrders;
  } catch (error) {
    console.error('[getWorkOrdersByDate] Unexpected error:', error);
    return [];
  }
}
