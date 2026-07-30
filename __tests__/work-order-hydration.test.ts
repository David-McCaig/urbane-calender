import {
  getHydrationRetryDelay,
  HYDRATION_MAX_RETRY_MS,
  shouldRetryHydration,
} from "@/lib/lightspeed/work-order-hydration";
import type { WorkOrderHydrationResult } from "@/lib/actions/light-speed";
import { describe, expect, it } from "vitest";

const retryableResult: WorkOrderHydrationResult = {
  status: "unavailable",
  orders: [],
  retryAfter: null,
  retryable: true,
};

describe("getHydrationRetryDelay", () => {
  it("applies exponential backoff and deterministic jitter", () => {
    expect(getHydrationRetryDelay(retryableResult, 0, 0, 0)).toBe(15_000);
    expect(getHydrationRetryDelay(retryableResult, 1, 0, 0.5)).toBe(30_500);
  });

  it("caps exponential backoff at five minutes", () => {
    expect(getHydrationRetryDelay(retryableResult, 10, 0, 0)).toBe(
      HYDRATION_MAX_RETRY_MS,
    );
  });

  it("honors Retry-After seconds when longer than the backoff", () => {
    const result: WorkOrderHydrationResult = {
      ...retryableResult,
      status: "rate_limited",
      retryAfter: "90",
    };

    expect(getHydrationRetryDelay(result, 0, 0, 0)).toBe(90_000);
  });

  it("honors an HTTP-date Retry-After value", () => {
    const now = Date.parse("2026-07-30T12:00:00.000Z");
    const result: WorkOrderHydrationResult = {
      ...retryableResult,
      status: "rate_limited",
      retryAfter: "Thu, 30 Jul 2026 12:02:00 GMT",
    };

    expect(getHydrationRetryDelay(result, 0, now, 0)).toBe(120_000);
  });

  it("falls back to backoff for invalid Retry-After values", () => {
    const result: WorkOrderHydrationResult = {
      ...retryableResult,
      status: "rate_limited",
      retryAfter: "not-a-date",
    };

    expect(getHydrationRetryDelay(result, 0, 0, 0)).toBe(15_000);
  });
});

describe("shouldRetryHydration", () => {
  it("retries transient failures only before the fifth attempt", () => {
    expect(shouldRetryHydration(retryableResult, 1)).toBe(true);
    expect(shouldRetryHydration(retryableResult, 4)).toBe(true);
    expect(shouldRetryHydration(retryableResult, 5)).toBe(false);
  });

  it("does not retry successful or permanent outcomes", () => {
    expect(
      shouldRetryHydration(
        { status: "ok", orders: [], retryAfter: null, retryable: false },
        1,
      ),
    ).toBe(false);
    expect(
      shouldRetryHydration(
        { ...retryableResult, retryable: false },
        1,
      ),
    ).toBe(false);
  });
});
