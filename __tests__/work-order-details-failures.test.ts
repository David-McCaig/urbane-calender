import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLightspeedApiConfig: vi.fn(),
}));

vi.mock("@/lib/lightspeed/api", () => ({
  getLightspeedApiConfig: mocks.getLightspeedApiConfig,
  getValidAccessToken: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { getWorkOrderDetails } from "@/lib/actions/light-speed";

function response(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function successfulBody(url: string): unknown {
  if (url.includes("/Workorder/101.json")) {
    return {
      Workorder: {
        workorderID: "101",
        shopID: "shop-1",
        saleID: "sale-1",
        taxCategoryID: "tax-1",
      },
    };
  }
  if (url.includes("/WorkorderItem.json")) {
    return {
      WorkorderItem: {
        workorderItemID: "item-1",
        saleLineID: "sale-line-1",
        unitQuantity: "1",
      },
    };
  }
  if (url.includes("/WorkorderLine.json")) {
    return { WorkorderLine: [] };
  }
  if (url.includes("/Shop/")) {
    return {
      Shop: {
        serviceRate: "120",
        taxCategoryID: "tax-1",
        taxLabor: "true",
      },
    };
  }
  if (url.includes("/Sale/sale-1/SaleLine.json")) {
    return {
      SaleLine: {
        saleLineID: "sale-line-1",
        unitQuantity: "1",
        unitPrice: "100",
      },
    };
  }
  if (url.includes("/Sale/")) {
    return { Sale: { saleID: "sale-1" } };
  }
  if (url.includes("/TaxCategory/")) {
    return { TaxCategory: { tax1Rate: "0.13" } };
  }
  return {};
}

describe("getWorkOrderDetails dependency failures", () => {
  beforeEach(() => {
    mocks.getLightspeedApiConfig.mockResolvedValue({
      token: "access-token",
      accountId: "account-1",
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mocks.getLightspeedApiConfig.mockReset();
  });

  it.each([
    "/WorkorderItem.json",
    "/WorkorderLine.json",
    "/Shop/",
    "/SaleLine.json",
    "/Sale/",
    "/TaxCategory/",
  ])("does not return authoritative totals when %s fails", async (failedPath) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: string | URL | Request) => {
        const url = String(input);
        return Promise.resolve(
          url.includes(failedPath)
            ? response(503)
            : response(200, successfulBody(url)),
        );
      }),
    );

    await expect(getWorkOrderDetails("shop-1", "101")).resolves.toEqual({
      status: "unavailable",
      workOrder: null,
    });
  });

  it("loads sale lines through their parent sale", async () => {
    const fetchMock = vi.fn().mockImplementation(
      (input: string | URL | Request) =>
        Promise.resolve(response(200, successfulBody(String(input)))),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getWorkOrderDetails("shop-1", "101"),
    ).resolves.toMatchObject({ status: "ok" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/Sale/sale-1/SaleLine.json?"),
      expect.anything(),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/Account/account-1/SaleLine.json"),
      expect.anything(),
    );
  });
});
