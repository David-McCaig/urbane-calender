export const MINUTES_PER_SLOT = 15;
export const SLOTS_PER_HOUR = 60 / MINUTES_PER_SLOT;
export const SLOTS_PER_DAY = 24 * SLOTS_PER_HOUR;

export interface CalendarHours {
  startSlot: number;
  endSlot: number;
}

export const DEFAULT_CALENDAR_HOURS: CalendarHours = {
  startSlot: 10 * SLOTS_PER_HOUR,
  endSlot: 19 * SLOTS_PER_HOUR,
};

function assertInteger(value: number, name: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
}

export function assertSlot(slot: number) {
  assertInteger(slot, "Slot");
  if (slot < 0 || slot >= SLOTS_PER_DAY) {
    throw new Error(`Slot must be between 0 and ${SLOTS_PER_DAY - 1}`);
  }
}

export function assertCalendarHours({ startSlot, endSlot }: CalendarHours) {
  assertSlot(startSlot);
  assertInteger(endSlot, "End slot");
  if (endSlot <= startSlot || endSlot > SLOTS_PER_DAY) {
    throw new Error(
      `End slot must be greater than start slot and no more than ${SLOTS_PER_DAY}`,
    );
  }
}

export function getVisibleSlots(hours: CalendarHours): number[] {
  assertCalendarHours(hours);
  return Array.from(
    { length: hours.endSlot - hours.startSlot },
    (_, index) => hours.startSlot + index,
  );
}

export function slotToTime(slot: number): string {
  assertSlot(slot);
  const totalMinutes = slot * MINUTES_PER_SLOT;
  const hour = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function timeToSlot(hour: number, minutes: number): number {
  assertInteger(hour, "Hour");
  assertInteger(minutes, "Minutes");
  if (hour < 0 || hour > 23 || minutes < 0 || minutes > 59) {
    throw new Error("Time must be between 00:00 and 23:59");
  }
  if (minutes % MINUTES_PER_SLOT !== 0) {
    throw new Error(`Minutes must align to a ${MINUTES_PER_SLOT}-minute slot`);
  }
  return hour * SLOTS_PER_HOUR + minutes / MINUTES_PER_SLOT;
}

export function formatSlotLabel(slot: number): string {
  assertSlot(slot);
  const totalMinutes = slot * MINUTES_PER_SLOT;
  const hour = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? "PM" : "AM";
  return `${displayHour}${minutes === 0 ? "" : `:${String(minutes).padStart(2, "0")}`} ${period}`;
}

export function durationHoursToSlots(duration: number): number {
  return Math.round(duration * SLOTS_PER_HOUR);
}
