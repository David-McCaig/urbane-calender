"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getValidAccessToken, getLightspeedApiConfig } from "@/lib/lightspeed/api";
import {
  getLightspeedWorkOrderDateRange,
  isWorkOrderOnDate,
} from "@/lib/lightspeed/work-order-date";
import type {
  LightspeedWorkOrder,
  LightspeedWorkOrderDetails,
  LightspeedWorkOrderLine,
  LightspeedWorkOrderResponse,
  LightspeedWorkOrderStatusResponse,
  WorkOrderDetailsResult,
  WorkOrderStatusMap,
} from "@/lib/lightspeed/types";

const WORK_ORDER_HYDRATION_DEDUPE_MS = 10_000;
const LIGHTSPEED_HYDRATION_TIMEOUT_MS = 8_000;

type LightspeedRecord = Record<string, unknown>;

function asRecord(value: unknown): LightspeedRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as LightspeedRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  return Object.keys(record).length === 0 ? [] : [record];
}

function relationArray(
  container: unknown,
  singularName: string,
  pluralName: string,
): unknown[] {
  const record = asRecord(container);
  const relation = record[pluralName] ?? record[singularName];
  const relationRecord = asRecord(relation);
  return asArray(
    relationRecord[singularName] ??
      relationRecord[pluralName] ??
      relation,
  );
}

function mergeRawLines(
  primary: unknown[],
  fallback: unknown[],
  idField: string,
): unknown[] {
  const ids = new Set(
    primary
      .map((value) => String(asRecord(value)[idField] ?? ""))
      .filter(Boolean),
  );
  return [
    ...primary,
    ...fallback.filter((value) => {
      const id = String(asRecord(value)[idField] ?? "");
      if (id && ids.has(id)) return false;
      if (id) ids.add(id);
      return true;
    }),
  ];
}

function enrichWithSaleLines(
  lines: unknown[],
  saleLines: unknown[],
): unknown[] {
  const saleLinesById = new Map(
    saleLines.map((value) => {
      const record = asRecord(value);
      return [String(record.saleLineID ?? ""), record];
    }),
  );

  return lines.map((value) => {
    const line = asRecord(value);
    const saleLine = saleLinesById.get(String(line.saleLineID ?? ""));
    // Keep work-order fields and relations authoritative while adding the
    // calculated subtotal, discount, and taxes from the linked SaleLine.
    return saleLine ? { ...saleLine, ...line } : line;
  });
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function booleanValue(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

function discountValue(value: unknown, subtotal: number): number {
  const discount = asRecord(value);
  const fixedAmount = Math.abs(numberValue(discount.discountAmount));
  if (fixedAmount > 0) return Math.min(subtotal, fixedAmount);

  const rawPercent = Math.abs(numberValue(discount.discountPercent));
  const percent = rawPercent > 1 ? rawPercent / 100 : rawPercent;
  return Math.min(subtotal, subtotal * percent);
}

function rateValue(value: unknown): number {
  const rate = Math.abs(numberValue(value));
  return rate > 1 ? rate / 100 : rate;
}

function responseRecord(
  response: LightspeedRecord | null,
  name: string,
): LightspeedRecord {
  const value = response?.[name];
  return asRecord(Array.isArray(value) ? value[0] : value);
}

function firstNonZeroId(...values: unknown[]): string {
  return (
    values
      .map((value) => String(value ?? ""))
      .find((value) => value !== "" && value !== "0") ?? ""
  );
}

function employeeName(value: unknown): string {
  const employee = asRecord(value);
  return [employee.firstName, employee.lastName]
    .filter((part): part is string => typeof part === "string" && Boolean(part))
    .join(" ");
}

function lineKind(line: LightspeedRecord): LightspeedWorkOrderLine["kind"] {
  const item = asRecord(line.Item);
  const category = asRecord(item.Category);
  const searchable = [
    line.lineType,
    item.type,
    item.itemType,
    item.description,
    category.name,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (/labou?r|service/.test(searchable)) return "labour";
  if (/fee|misc|charge|shipping/.test(searchable)) return "fee";
  return "part";
}

function normalizeSaleLine(
  value: unknown,
  index: number,
  kindOverride?: LightspeedWorkOrderLine["kind"],
  serviceRate = 0,
): LightspeedWorkOrderLine {
  const line = asRecord(value);
  const item = asRecord(line.Item);
  const quantity = numberValue(line.unitQuantity ?? line.quantity) || 1;
  const kind = kindOverride || lineKind(line);
  const durationMinutes =
    numberValue(line.hours) * 60 + numberValue(line.minutes);
  const timedLabourPrice =
    kind === "labour" && durationMinutes > 0
      ? Math.round(serviceRate * (durationMinutes / 60) * 100) / 100
      : 0;
  const baseUnitPrice =
    kind === "labour" || kind === "fee"
      ? numberValue(line.unitPriceOverride) ||
        numberValue(line.unitPrice) ||
        timedLabourPrice ||
        numberValue(line.unitCost)
      : numberValue(line.unitPrice ?? line.amount);
  const subtotal =
    numberValue(line.calcSubtotal ?? line.subtotal) ||
    quantity * baseUnitPrice;
  const unitPrice = baseUnitPrice || subtotal / quantity;
  const discount =
    Math.abs(numberValue(line.calcDiscount ?? line.discountAmount)) ||
    discountValue(line.Discount, subtotal);
  const calculatedTax =
    numberValue(line.calcTax ?? line.calcTax1) +
    numberValue(line.calcTax2);
  const taxRate =
    rateValue(line.tax1Rate) +
    rateValue(line.tax2Rate);
  const tax =
    calculatedTax ||
    (booleanValue(line.tax)
      ? Math.round(Math.max(0, subtotal - discount) * taxRate * 100) / 100
      : 0);
  const total =
    numberValue(line.calcTotal ?? line.total) ||
    Math.max(0, subtotal - discount + tax);
  const isComplete = booleanValue(line.done);
  const isSpecialOrder = booleanValue(line.isSpecialOrder);

  return {
    id: String(
      line.saleLineID ??
        line.workorderItemID ??
        line.workorderLineID ??
        `${kindOverride || "line"}-${index}`,
    ),
    description:
      stringValue(item.description) ||
      stringValue(line.description) ||
      stringValue(line.note) ||
      "Work order item",
    note:
      stringValue(line.note) ===
      (stringValue(item.description) ||
        stringValue(line.description) ||
        stringValue(line.note))
        ? ""
        : stringValue(line.note),
    quantity,
    unitPrice,
    subtotal,
    discount,
    tax,
    total,
    kind: numberValue(line.itemFeeID) !== 0 ? "fee" : kind,
    employeeName: employeeName(line.Employee),
    status:
      kindOverride === "labour"
        ? isComplete
          ? "Finished"
          : "Not finished"
        : isSpecialOrder
          ? "Special order"
          : "Standard",
    isComplete,
    durationMinutes,
    reservedQuantity: numberValue(
      line.reservedQuantity ??
        line.unitQuantityReserved ??
        line.quantityReserved,
    ),
  };
}

function normalizeWorkOrderLine(
  value: unknown,
  index: number,
  serviceRate: number,
): LightspeedWorkOrderLine {
  return normalizeSaleLine(value, index, "labour", serviceRate);
}

async function fetchLightspeedJson(
  url: string,
  token: string,
): Promise<LightspeedRecord | null> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(LIGHTSPEED_HYDRATION_TIMEOUT_MS),
  });

  logLightspeedRateLimitHeaders(response);
  if (!response.ok) return null;
  return (await response.json()) as LightspeedRecord;
}

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

    // Fetch a UTC buffer around the selected date, then filter by the date
    // portion of etaOut. This keeps server timezones and time-of-day values
    // from excluding work orders that belong to the selected calendar day.
    const { startISO, endISO } = getLightspeedWorkOrderDateRange(date);

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

    return allWorkOrders.filter((workOrder) =>
      isWorkOrderOnDate(workOrder.etaOut, date),
    );
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
 * Loads the complete read-only view of a work order. This is intentionally
 * fetched on demand so the calendar does not pay for sale lines and totals
 * until a user asks to see them.
 */
export async function getWorkOrderDetails(
  shopId: string,
  workorderId: string,
): Promise<WorkOrderDetailsResult> {
  try {
    const config = await getLightspeedApiConfig(shopId);
    if (!config) return { status: "unavailable", workOrder: null };

    const { token, accountId } = config;
    const relations = encodeURIComponent(
      '["Customer","Serialized","Employee","Discount","WorkorderItems","WorkorderItems.Discount","WorkorderLines","WorkorderLines.Discount","WorkorderLines.TaxClass"]',
    );
    const workOrderUrl =
      `https://api.lightspeedapp.com/API/V3/Account/${accountId}` +
      `/Workorder/${encodeURIComponent(workorderId)}.json?load_relations=${relations}`;
    const workOrderJson = await fetchLightspeedJson(workOrderUrl, token);
    const workOrderValue = workOrderJson?.Workorder;
    const workOrderRecord = asRecord(
      Array.isArray(workOrderValue) ? workOrderValue[0] : workOrderValue,
    );

    if (Object.keys(workOrderRecord).length === 0) {
      return { status: "unavailable", workOrder: null };
    }

    const workOrder = workOrderRecord as unknown as LightspeedWorkOrder;
    const saleId = String(workOrder.saleID || "");
    let saleRecord: LightspeedRecord = {};
    let lines: LightspeedWorkOrderLine[] = [];

    const workOrderBaseUrl =
      `https://api.lightspeedapp.com/API/V3/Account/${accountId}` +
      `/Workorder/${encodeURIComponent(workorderId)}`;
    const itemRelations = encodeURIComponent(
      '["Item","Employee","Discount"]',
    );
    const workOrderLineRelations = encodeURIComponent(
      '["Item","Employee","Discount","TaxClass"]',
    );
    const lightspeedShopId = String(workOrderRecord.shopID ?? "");
    const lightspeedShopUrl =
      `https://api.lightspeedapp.com/API/V3/Account/${accountId}` +
      `/Shop/${encodeURIComponent(lightspeedShopId)}.json`;
    const [itemsJson, labourJson, shopJson] = await Promise.all([
      fetchLightspeedJson(
        `${workOrderBaseUrl}/WorkorderItem.json?load_relations=${itemRelations}`,
        token,
      ),
      fetchLightspeedJson(
        `${workOrderBaseUrl}/WorkorderLine.json?load_relations=${workOrderLineRelations}`,
        token,
      ),
      lightspeedShopId
        ? fetchLightspeedJson(lightspeedShopUrl, token)
        : Promise.resolve(null),
    ]);
    const lightspeedShop = responseRecord(shopJson, "Shop");
    const serviceRate = numberValue(lightspeedShop.serviceRate);

    const embeddedItems = relationArray(
      workOrderRecord,
      "WorkorderItem",
      "WorkorderItems",
    );
    const endpointItems = relationArray(
      itemsJson,
      "WorkorderItem",
      "WorkorderItems",
    );
    const embeddedLines = relationArray(
      workOrderRecord,
      "WorkorderLine",
      "WorkorderLines",
    );
    const endpointLines = relationArray(
      labourJson,
      "WorkorderLine",
      "WorkorderLines",
    );
    const rawItems = mergeRawLines(
      endpointItems,
      embeddedItems,
      "workorderItemID",
    );
    const rawLines = mergeRawLines(
      endpointLines,
      embeddedLines,
      "workorderLineID",
    );

    const saleLineIds = [...rawItems, ...rawLines]
      .map((value) => String(asRecord(value).saleLineID ?? ""))
      .filter((id) => id && id !== "0");
    let relatedSaleLines: unknown[] = [];

    if (saleLineIds.length > 0) {
      const idFilter = ["IN", ...new Set(saleLineIds)].join(",");
      const saleLinesUrl =
        `https://api.lightspeedapp.com/API/V3/Account/${accountId}` +
        `/SaleLine.json?saleLineID=${encodeURIComponent(idFilter)}`;
      const saleLinesJson = await fetchLightspeedJson(saleLinesUrl, token);
      relatedSaleLines = relationArray(
        saleLinesJson,
        "SaleLine",
        "SaleLines",
      );
    }

    const enrichedItems = enrichWithSaleLines(rawItems, relatedSaleLines);
    const enrichedLines = enrichWithSaleLines(rawLines, relatedSaleLines);
    const parts = enrichedItems.map((line, index) =>
      normalizeSaleLine(line, index, "part"),
    );
    const labour = enrichedLines.map((line, index) =>
      normalizeWorkOrderLine(line, index, serviceRate),
    );
    lines = [...labour, ...parts];

    if (saleId && saleId !== "0") {
      const saleRelations = encodeURIComponent('["Employee"]');
      const saleUrl =
        `https://api.lightspeedapp.com/API/V3/Account/${accountId}` +
        `/Sale/${encodeURIComponent(saleId)}.json?load_relations=${saleRelations}`;
      const saleJson = await fetchLightspeedJson(saleUrl, token);
      saleRecord = responseRecord(saleJson, "Sale");
    }

    const categoryTotal = (kind: LightspeedWorkOrderLine["kind"]) =>
      lines
        .filter((line) => line.kind === kind)
        .reduce((sum, line) => sum + line.subtotal, 0);
    const lineDiscounts = lines.reduce(
      (sum, line) => sum + line.discount,
      0,
    );
    const lineTax = lines.reduce((sum, line) => sum + line.tax, 0);
    const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const workOrderDiscount = discountValue(
      workOrderRecord.Discount,
      subtotal,
    );
    const discounts = workOrderDiscount || lineDiscounts;
    let tax =
      lineTax ||
      numberValue(saleRecord.calcTax) ||
      numberValue(saleRecord.calcTax1) + numberValue(saleRecord.calcTax2) ||
      numberValue(saleRecord.taxTotal) ||
      0;

    // Open work orders often have no calculated Sale tax yet. In practice,
    // Lightspeed can return Workorder.tax=false while its UI still previews
    // tax from the shop configuration, so do not gate this fallback on that
    // field. Prefer calculated line/sale tax above whenever it exists.
    if (tax === 0) {
      const customer = asRecord(workOrderRecord.Customer);
      const taxCategoryId = firstNonZeroId(
        saleRecord.taxCategoryID,
        customer.taxCategoryID,
        lightspeedShop.taxCategoryID,
      );
      let fallbackRate =
        rateValue(saleRecord.tax1Rate) +
        rateValue(saleRecord.tax2Rate);

      if (fallbackRate === 0 && taxCategoryId) {
        const taxCategoryUrl =
          `https://api.lightspeedapp.com/API/V3/Account/${accountId}` +
          `/TaxCategory/${encodeURIComponent(taxCategoryId)}.json` +
          `?load_relations=${encodeURIComponent('["TaxCategoryClasses"]')}`;
        const taxCategoryJson = await fetchLightspeedJson(
          taxCategoryUrl,
          token,
        );
        const taxCategory = responseRecord(
          taxCategoryJson,
          "TaxCategory",
        );
        fallbackRate =
          rateValue(taxCategory.tax1Rate) +
          rateValue(taxCategory.tax2Rate);
      }

      if (fallbackRate > 0) {
        const taxLabour = booleanValue(lightspeedShop.taxLabor);
        const taxableSubtotal = lines.reduce((sum, line) => {
          if (line.kind === "labour" && !taxLabour) return sum;
          return sum + Math.max(0, line.subtotal - line.discount);
        }, 0);
        const taxableAfterWorkOrderDiscount = Math.max(
          0,
          taxableSubtotal - Math.max(0, workOrderDiscount - lineDiscounts),
        );
        tax =
          Math.round(taxableAfterWorkOrderDiscount * fallbackRate * 100) /
          100;
      }
    }

    const details: LightspeedWorkOrderDetails = {
      ...workOrder,
      lines,
      totals: {
        labour: categoryTotal("labour"),
        parts: categoryTotal("part"),
        fees: categoryTotal("fee"),
        discounts,
        tax,
        total: Math.max(0, subtotal - discounts + tax),
      },
    };

    return { status: "ok", workOrder: details };
  } catch (error) {
    console.error("[getWorkOrderDetails] Unexpected error:", error);
    return { status: "unavailable", workOrder: null };
  }
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
