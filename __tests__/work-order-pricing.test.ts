import {
  calculateWorkOrderTotals,
  labourDollarsToDurationHours,
  normalizeWorkOrderPricingLine,
} from "@/lib/lightspeed/work-order-pricing";
import { describe, expect, it } from "vitest";

describe("labourDollarsToDurationHours", () => {
  it("converts labour dollars at $120/hour and rounds up to 15 minutes", () => {
    expect(labourDollarsToDurationHours(120)).toBe(1);
    expect(labourDollarsToDurationHours(121)).toBe(1.25);
    expect(labourDollarsToDurationHours(60)).toBe(0.5);
  });

  it("uses a minimum 15-minute calendar allocation", () => {
    expect(labourDollarsToDurationHours(0)).toBe(0.25);
  });
});

describe("normalizeWorkOrderPricingLine", () => {
  it("prices timed labour using the shop service rate", () => {
    const line = normalizeWorkOrderPricingLine(
      {
        workorderLineID: "labour-1",
        hours: "1",
        minutes: "0",
        unitPrice: "0",
        unitPriceOverride: "0",
        unitCost: "0",
        note: "Estimated 30-60min.",
      },
      0,
      "labour",
      120,
    );

    expect(line).toMatchObject({
      kind: "labour",
      durationMinutes: 60,
      unitPrice: 120,
      subtotal: 120,
      total: 120,
    });
  });

  it("uses an explicit labour price instead of the timed estimate", () => {
    const line = normalizeWorkOrderPricingLine(
      {
        hours: "1",
        unitPriceOverride: "190",
        calcSubtotal: "190",
      },
      0,
      "labour",
      120,
    );

    expect(line.unitPrice).toBe(190);
    expect(line.subtotal).toBe(190);
  });

  it("classifies item fees separately from labour", () => {
    const line = normalizeWorkOrderPricingLine(
      { itemFeeID: "42", unitPrice: "25" },
      0,
      "labour",
      120,
    );

    expect(line.kind).toBe("fee");
    expect(line.subtotal).toBe(25);
  });

  it("preserves explicit zero quantities and calculated totals", () => {
    const line = normalizeWorkOrderPricingLine(
      {
        unitQuantity: "0",
        unitPrice: "125",
        calcSubtotal: "0",
        calcTotal: "0",
      },
      0,
      "part",
    );

    expect(line).toMatchObject({
      quantity: 0,
      unitPrice: 125,
      subtotal: 0,
      total: 0,
    });
  });
});

describe("calculateWorkOrderTotals", () => {
  it("matches the Lightspeed totals for work order 131791", () => {
    const line = (
      kind: "labour" | "part" | "fee",
      subtotal: number,
      discount = 0,
    ) =>
      normalizeWorkOrderPricingLine(
        { unitPrice: subtotal, calcSubtotal: subtotal, calcDiscount: discount },
        0,
        kind,
      );
    const lines = [
      line("labour", 669),
      line("part", 475),
      line("fee", 0),
    ];

    expect(
      calculateWorkOrderTotals(lines, {
        workOrderDiscount: { discountAmount: "30" },
        fallbackTaxRate: 0.13,
        taxLabour: true,
      }),
    ).toEqual({
      labour: 669,
      parts: 475,
      fees: 0,
      discounts: 30,
      tax: 144.82,
      total: 1258.82,
    });
  });

  it("does not tax labour when the shop disables labour tax", () => {
    const labour = normalizeWorkOrderPricingLine(
      { unitPrice: 100 },
      0,
      "labour",
    );
    const part = normalizeWorkOrderPricingLine(
      { unitPrice: 50 },
      1,
      "part",
    );

    expect(
      calculateWorkOrderTotals([labour, part], {
        fallbackTaxRate: 0.13,
        taxLabour: false,
      }).tax,
    ).toBe(6.5);
  });

  it("prefers calculated line tax over a fallback rate", () => {
    const part = normalizeWorkOrderPricingLine(
      { unitPrice: 100, calcTax: 5 },
      0,
      "part",
    );

    expect(
      calculateWorkOrderTotals([part], {
        fallbackTaxRate: 0.13,
        taxLabour: true,
      }).tax,
    ).toBe(5);
  });

  it("uses aggregate line tax instead of adding component taxes twice", () => {
    const part = normalizeWorkOrderPricingLine(
      {
        unitPrice: 100,
        calcTax: 13,
        calcTax1: 5,
        calcTax2: 8,
      },
      0,
      "part",
    );

    expect(part.tax).toBe(13);
    expect(calculateWorkOrderTotals([part]).tax).toBe(13);
  });
});
