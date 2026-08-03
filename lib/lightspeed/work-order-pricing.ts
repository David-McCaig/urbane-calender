import type {
  LightspeedWorkOrderDetails,
  LightspeedWorkOrderLine,
} from "@/lib/lightspeed/types";

export const DEFAULT_SHOP_LABOUR_RATE = 120;
const QUARTER_HOUR = 0.25;

export function labourDollarsToDurationHours(
  labourDollars: number,
  hourlyRate = DEFAULT_SHOP_LABOUR_RATE,
): number {
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
    throw new Error("Shop labour rate must be greater than zero");
  }

  const safeLabourDollars = Number.isFinite(labourDollars)
    ? Math.max(0, labourDollars)
    : 0;

  return Math.max(
    QUARTER_HOUR,
    Math.ceil(safeLabourDollars / hourlyRate / QUARTER_HOUR) * QUARTER_HOUR,
  );
}

type LightspeedRecord = Record<string, unknown>;

function asRecord(value: unknown): LightspeedRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as LightspeedRecord)
    : {};
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

function rateValue(value: unknown): number {
  const rate = Math.abs(numberValue(value));
  return rate > 1 ? rate / 100 : rate;
}

function discountValue(value: unknown, subtotal: number): number {
  const discount = asRecord(value);
  const fixedAmount = Math.abs(numberValue(discount.discountAmount));
  if (fixedAmount > 0) return Math.min(subtotal, fixedAmount);

  const rawPercent = Math.abs(numberValue(discount.discountPercent));
  const percent = rawPercent > 1 ? rawPercent / 100 : rawPercent;
  return Math.min(subtotal, subtotal * percent);
}

function employeeName(value: unknown): string {
  const employee = asRecord(value);
  return [employee.firstName, employee.lastName]
    .filter((part): part is string => typeof part === "string" && Boolean(part))
    .join(" ");
}

export function normalizeWorkOrderPricingLine(
  value: unknown,
  index: number,
  kindOverride?: LightspeedWorkOrderLine["kind"],
  serviceRate = 0,
): LightspeedWorkOrderLine {
  const line = asRecord(value);
  const item = asRecord(line.Item);
  const parsedQuantity = optionalNumber(line.unitQuantity ?? line.quantity);
  const quantity =
    parsedQuantity !== null && parsedQuantity >= 0 ? parsedQuantity : 1;
  const kind = kindOverride ?? "part";
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
  const calculatedSubtotal = optionalNumber(
    line.calcSubtotal ?? line.subtotal,
  );
  const subtotal = calculatedSubtotal ?? quantity * baseUnitPrice;
  const unitPrice =
    baseUnitPrice || (quantity > 0 ? subtotal / quantity : 0);
  const discount =
    Math.abs(numberValue(line.calcDiscount ?? line.discountAmount)) ||
    discountValue(line.Discount, subtotal);
  const aggregateTax = optionalNumber(line.calcTax);
  const calculatedTax =
    aggregateTax ??
    numberValue(line.calcTax1) + numberValue(line.calcTax2);
  const taxRate = rateValue(line.tax1Rate) + rateValue(line.tax2Rate);
  const tax =
    calculatedTax ||
    (booleanValue(line.tax)
      ? Math.round(Math.max(0, subtotal - discount) * taxRate * 100) / 100
      : 0);
  const calculatedTotal = optionalNumber(line.calcTotal ?? line.total);
  const total =
    calculatedTotal ?? Math.max(0, subtotal - discount + tax);
  const isComplete = booleanValue(line.done);
  const isSpecialOrder = booleanValue(line.isSpecialOrder);
  const description =
    (typeof item.description === "string" && item.description) ||
    (typeof line.description === "string" && line.description) ||
    (typeof line.note === "string" && line.note) ||
    "Work order item";
  const note = typeof line.note === "string" ? line.note : "";

  return {
    id: String(
      line.saleLineID ??
        line.workorderItemID ??
        line.workorderLineID ??
        `${kindOverride || "line"}-${index}`,
    ),
    description,
    note: note === description ? "" : note,
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

interface WorkOrderTotalsOptions {
  workOrderDiscount?: unknown;
  calculatedTax?: number;
  fallbackTaxRate?: number;
  taxLabour?: boolean;
}

export function calculateWorkOrderTotals(
  lines: LightspeedWorkOrderLine[],
  options: WorkOrderTotalsOptions = {},
): LightspeedWorkOrderDetails["totals"] {
  const categoryTotal = (kind: LightspeedWorkOrderLine["kind"]) =>
    lines
      .filter((line) => line.kind === kind)
      .reduce((sum, line) => sum + line.subtotal, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const lineDiscounts = lines.reduce((sum, line) => sum + line.discount, 0);
  const workOrderDiscount = discountValue(
    options.workOrderDiscount,
    subtotal,
  );
  const discounts = workOrderDiscount || lineDiscounts;
  let tax =
    lines.reduce((sum, line) => sum + line.tax, 0) ||
    options.calculatedTax ||
    0;

  if (tax === 0 && options.fallbackTaxRate) {
    const taxableSubtotal = lines.reduce((sum, line) => {
      if (line.kind === "labour" && !options.taxLabour) return sum;
      return sum + Math.max(0, line.subtotal - line.discount);
    }, 0);
    const taxableAfterWorkOrderDiscount = Math.max(
      0,
      taxableSubtotal - Math.max(0, workOrderDiscount - lineDiscounts),
    );
    tax =
      Math.round(taxableAfterWorkOrderDiscount * options.fallbackTaxRate * 100) /
      100;
  }

  return {
    labour: categoryTotal("labour"),
    parts: categoryTotal("part"),
    fees: categoryTotal("fee"),
    discounts,
    tax,
    total: Math.max(0, subtotal - discounts + tax),
  };
}
