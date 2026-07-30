import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLightspeedApiConfig: vi.fn(),
  getValidAccessToken: vi.fn(),
}));

vi.mock("@/lib/lightspeed/api", () => mocks);
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { getWorkOrdersByIds } from "@/lib/actions/light-speed";

function response(
  status: number,
  headers: Record<string, string> = {},
  body: unknown = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("getWorkOrdersByIds rate limiting", () => {
  beforeEach(() => {
    mocks.getLightspeedApiConfig.mockResolvedValue({
      token: "access-token",
      accountId: "account-1",
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mocks.getLightspeedApiConfig.mockReset();
  });

  it("returns Retry-After metadata for a 429 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(429, {
          "retry-after": "45",
          "x-ls-api-bucket-level": "90/100",
        }),
      ),
    );

    await expect(getWorkOrdersByIds("shop-429", ["101"])).resolves.toEqual({
      status: "rate_limited",
      orders: [],
      retryAfter: "45",
      retryable: true,
    });
  });

  it("classifies server errors as retryable and client errors as permanent", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(404));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getWorkOrdersByIds("shop-503", ["102"])).resolves.toMatchObject({
      status: "unavailable",
      retryable: true,
    });
    await expect(getWorkOrdersByIds("shop-404", ["103"])).resolves.toMatchObject({
      status: "unavailable",
      retryable: false,
    });
  });

  it("treats thrown fetch errors, including timeouts, as retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        new DOMException("The operation was aborted", "TimeoutError"),
      ),
    );

    await expect(
      getWorkOrdersByIds("shop-timeout", ["104"]),
    ).resolves.toMatchObject({
      status: "unavailable",
      retryable: true,
    });
  });

  it("passes an eight-second timeout signal to fetch", async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(timeoutSignal);
    const fetchMock = vi.fn().mockResolvedValue(response(200, {}, {}));
    vi.stubGlobal("fetch", fetchMock);

    await getWorkOrdersByIds("shop-signal", ["105"]);

    expect(timeoutSpy).toHaveBeenCalledWith(8_000);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: timeoutSignal }),
    );
  });

  it("deduplicates equivalent ID requests while the cache is warm", async () => {
    let resolveFetch!: (value: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pendingResponse);
    vi.stubGlobal("fetch", fetchMock);

    const first = getWorkOrdersByIds("shop-dedupe", ["202", "201", "201"]);
    const second = getWorkOrdersByIds("shop-dedupe", ["201", "202"]);
    resolveFetch(response(200, {}, {}));

    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.getLightspeedApiConfig).toHaveBeenCalledTimes(2);
  });

  it("authorizes every caller before returning a warm cached result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(200, {}, {}));
    vi.stubGlobal("fetch", fetchMock);
    mocks.getLightspeedApiConfig
      .mockResolvedValueOnce({
        token: "access-token",
        accountId: "account-1",
      })
      .mockResolvedValueOnce(null);

    await getWorkOrdersByIds("shop-auth", ["301"]);
    const unauthorizedResult = await getWorkOrdersByIds("shop-auth", ["301"]);

    expect(unauthorizedResult).toEqual({
      status: "unavailable",
      orders: [],
      retryAfter: null,
      retryable: false,
    });
    expect(mocks.getLightspeedApiConfig).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("warns when the Lightspeed bucket reaches 80 percent capacity", async () => {
    const warnSpy = vi.spyOn(console, "warn");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          200,
          {
            "x-ls-api-bucket-level": "80/100",
            "x-ls-api-drip-rate": "1",
            "x-ls-api-request-cost": "2",
          },
          {},
        ),
      ),
    );

    await getWorkOrdersByIds("shop-warning", ["401"]);

    expect(warnSpy).toHaveBeenCalledWith(
      "[Lightspeed] API bucket nearing capacity",
      {
        bucketLevel: "80/100",
        dripRate: "1",
        requestCost: "2",
      },
    );
  });
});
