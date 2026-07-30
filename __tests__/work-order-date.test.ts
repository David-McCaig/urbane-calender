import {
  getLightspeedWorkOrderDateRange,
  isWorkOrderOnDate,
} from "@/lib/lightspeed/work-order-date";
import { describe, expect, it } from "vitest";

describe("getLightspeedWorkOrderDateRange", () => {
  it("uses a UTC buffer around the selected calendar date", () => {
    expect(getLightspeedWorkOrderDateRange("2026-07-29")).toEqual({
      startISO: "2026-07-28T00:00:00.000Z",
      endISO: "2026-07-30T23:59:59.999Z",
    });
  });
});

describe("isWorkOrderOnDate", () => {
  it.each([
    "2026-07-29T00:00:00.000Z",
    "2026-07-29T12:01:00.000Z",
    "2026-07-29T16:05:00-04:00",
  ])("includes %s based on its calendar date", (etaOut) => {
    expect(isWorkOrderOnDate(etaOut, "2026-07-29")).toBe(true);
  });

  it("excludes adjacent dates and missing values", () => {
    expect(isWorkOrderOnDate("2026-07-28T23:59:59.999Z", "2026-07-29")).toBe(
      false,
    );
    expect(isWorkOrderOnDate(null, "2026-07-29")).toBe(false);
  });
});
