"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getValidAccessToken, getLightspeedApiConfig } from "@/lib/lightspeed/api";
import type { LightspeedWorkOrder, LightspeedWorkOrderResponse, LightspeedWorkOrderStatusResponse, WorkOrderStatusMap } from "@/lib/lightspeed/types";

const WORK_ORDER_HYDRATION_DEDUPE_MS = 10_000;
const LIGHTSPEED_HYDRATION_TIMEOUT_MS = 8_000;

export interface WorkOrderHydrationResult {
  status: "ok" | "rate_limited" | "unavailable";
  orders: LightspeedWorkOrder[];
  retryAfter: string | null;
  retryable: boolean;
}

interface WorkOrderHydrationCacheEntry {
  expiresAt: number;
  promise: Promise<WorkOrderHydrationResult>;
}

const workOrderHydrationRequests = new Map<
  string,
  WorkOrderHydrationCacheEntry
>();

function logLightspeedRateLimitHeaders(response: Response): void {
  const bucketLevel = response.headers.get("x-ls-api-bucket-level");
  const dripRate = response.headers.get("x-ls-api-drip-rate");
  const requestCost = response.headers.get("x-ls-api-request-cost");

  if (!bucketLevel) return;

  const [level, capacity] = bucketLevel.split("/").map(Number);
  const isNearCapacity =
    Number.isFinite(level) &&
    Number.isFinite(capacity) &&
    capacity > 0 &&
    level / capacity >= 0.8;

  if (isNearCapacity) {
    console.warn("[Lightspeed] API bucket nearing capacity", {
      bucketLevel,
      dripRate,
      requestCost,
    });
  }
}

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
    // Parse manually to avoid new Date("YYYY-MM-DD") which is UTC-parsed
    // and shifts the date in non-UTC timezones.
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Lightspeed between operator: %3E%3C = ><  ,  %2C = ,
    const queryString =
      `etaOut=%3E%3C%2C${encodeURIComponent(startISO)}%2C${encodeURIComponent(endISO)}` +
      `&load_relations=${encodeURIComponent('["Customer","Serialized"]')}`;

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

/**
 * Fetches the current Lightspeed records for scheduled work orders.
 * Lightspeed's IN filter keeps calendar hydration to a single API request.
 */
export async function getWorkOrdersByIds(
  shopId: string,
  workorderIds: string[],
): Promise<WorkOrderHydrationResult> {
  const uniqueIds = [...new Set(workorderIds)].filter(Boolean).sort();
  if (uniqueIds.length === 0) {
    return { status: "ok", orders: [], retryAfter: null, retryable: false };
  }

  // Authorize every caller before consulting the process-wide cache. The cache
  // is shared across requests, so returning a warm entry first could expose one
  // shop's work orders to a caller who is not a member of that shop.
  const config = await getLightspeedApiConfig(shopId);
  if (!config) {
    return {
      status: "unavailable",
      orders: [],
      retryAfter: null,
      retryable: false,
    };
  }

  const cacheKey = `${shopId}:${uniqueIds.join(",")}`;
  const now = Date.now();
  const cached = workOrderHydrationRequests.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.promise;

  for (const [key, entry] of workOrderHydrationRequests) {
    if (entry.expiresAt <= now) workOrderHydrationRequests.delete(key);
  }

  const promise = (async (): Promise<WorkOrderHydrationResult> => {
    const { token, accountId } = config;
    const idFilter = ["IN", ...uniqueIds].join(",");
    const queryString =
      `workorderID=${encodeURIComponent(idFilter)}` +
      `&load_relations=${encodeURIComponent('["Customer","Serialized"]')}`;
    const url = `https://api.lightspeedapp.com/API/V3/Account/${accountId}/Workorder.json?${queryString}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(LIGHTSPEED_HYDRATION_TIMEOUT_MS),
    });

    logLightspeedRateLimitHeaders(response);

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      console.warn("[getWorkOrdersByIds] Lightspeed rate limit reached", {
        retryAfter,
        bucketLevel: response.headers.get("x-ls-api-bucket-level"),
      });
      return {
        status: "rate_limited",
        orders: [],
        retryAfter,
        retryable: true,
      };
    }

    if (!response.ok) {
      console.error(
        `[getWorkOrdersByIds] Lightspeed API error: ${response.status}`,
      );
      return {
        status: "unavailable",
        orders: [],
        retryAfter: null,
        retryable: response.status >= 500,
      };
    }

    const json: LightspeedWorkOrderResponse = await response.json();
    if (
      !json.Workorder ||
      (!Array.isArray(json.Workorder) &&
        Object.keys(json.Workorder).length === 0)
    ) {
      return { status: "ok", orders: [], retryAfter: null, retryable: false };
    }

    const orders = Array.isArray(json.Workorder)
      ? json.Workorder
      : [json.Workorder as unknown as LightspeedWorkOrder];

    return { status: "ok", orders, retryAfter: null, retryable: false };
  })().catch((error): WorkOrderHydrationResult => {
    console.error("[getWorkOrdersByIds] Unexpected error:", error);
    return {
      status: "unavailable",
      orders: [],
      retryAfter: null,
      retryable: true,
    };
  });

  workOrderHydrationRequests.set(cacheKey, {
    expiresAt: now + WORK_ORDER_HYDRATION_DEDUPE_MS,
    promise,
  });

  return promise;
}

/**
 * Fetches all work order statuses and returns a lookup map
 * (workorderStatusID → name). Cached per request — statuses change rarely.
 */
export async function getWorkorderStatuses(
  shopId: string,
): Promise<WorkOrderStatusMap> {
  try {
    const config = await getLightspeedApiConfig(shopId);
    if (!config) return {};

    const { token, accountId } = config;
    const url = `https://api.lightspeedapp.com/API/V3/Account/${accountId}/WorkorderStatus.json`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(
        `[getWorkorderStatuses] Lightspeed API error: ${response.status}`,
      );
      return {};
    }

    const json: LightspeedWorkOrderStatusResponse = await response.json();
    const statuses = json.WorkorderStatus || [];

    const map: WorkOrderStatusMap = {};
    for (const status of statuses) {
      map[status.workorderStatusID] = status.name;
    }
    return map;
  } catch (error) {
    console.error('[getWorkorderStatuses] Unexpected error:', error);
    return {};
  }
}
