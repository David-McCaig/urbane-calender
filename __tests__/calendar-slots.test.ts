import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALENDAR_HOURS,
  formatSlotLabel,
  getVisibleSlots,
  slotToTime,
  timeToSlot,
} from "@/lib/calendar/slots";

describe("calendar slots", () => {
  it("converts absolute daily slots to 24-hour times", () => {
    expect(slotToTime(0)).toBe("00:00");
    expect(slotToTime(40)).toBe("10:00");
    expect(slotToTime(43)).toBe("10:45");
    expect(slotToTime(76)).toBe("19:00");
    expect(slotToTime(95)).toBe("23:45");
  });

  it("converts quarter-hour times to absolute slots", () => {
    expect(timeToSlot(0, 0)).toBe(0);
    expect(timeToSlot(10, 0)).toBe(40);
    expect(timeToSlot(19, 0)).toBe(76);
    expect(timeToSlot(23, 45)).toBe(95);
  });

  it("rejects times that do not align to a quarter hour", () => {
    expect(() => timeToSlot(10, 10)).toThrow(
      "Minutes must align to a 15-minute slot",
    );
  });

  it("builds the configured workday with an exclusive end slot", () => {
    const slots = getVisibleSlots(DEFAULT_CALENDAR_HOURS);
    expect(slots).toHaveLength(36);
    expect(slots[0]).toBe(40);
    expect(slots.at(-1)).toBe(75);
  });

  it("formats slot labels for the calendar", () => {
    expect(formatSlotLabel(40)).toBe("10 AM");
    expect(formatSlotLabel(42)).toBe("10:30 AM");
    expect(formatSlotLabel(76)).toBe("7 PM");
  });
});
