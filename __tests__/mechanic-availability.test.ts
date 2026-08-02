import { describe, expect, it } from "vitest";
import {
  getVisibleMechanics,
  getWorkingMechanics,
} from "@/lib/calendar/mechanic-availability";
import type {
  Mechanic,
  MechanicDayStatus,
  ScheduledJob,
} from "@/lib/database/calendar";

const mechanics = [
  { id: "one", name: "One" },
  { id: "two", name: "Two" },
] as Mechanic[];

function status(
  mechanicId: string,
  source: MechanicDayStatus["source"],
  isWorking: boolean,
): MechanicDayStatus {
  return {
    id: `${mechanicId}-${source}`,
    shop_id: "shop",
    mechanic_id: mechanicId,
    date: "2026-08-02",
    is_working: isWorking,
    source,
    created_at: "2026-08-02T00:00:00Z",
    updated_at: "2026-08-02T00:00:00Z",
  };
}

describe("getWorkingMechanics", () => {
  it("defaults mechanics without a status to working", () => {
    expect(getWorkingMechanics(mechanics, [])).toEqual(mechanics);
  });

  it("uses a manual status ahead of a When I Work status", () => {
    const result = getWorkingMechanics(mechanics, [
      status("one", "when_i_work", false),
      status("one", "manual", true),
      status("two", "manual", false),
    ]);

    expect(result.map((mechanic) => mechanic.id)).toEqual(["one"]);
  });
});

describe("getVisibleMechanics", () => {
  it("keeps an unavailable mechanic visible while they have scheduled work", () => {
    const workingMechanics = [mechanics[0]];
    const scheduledJobs = [{ mechanic_id: "two" }] as ScheduledJob[];

    expect(
      getVisibleMechanics(mechanics, workingMechanics, scheduledJobs).map(
        (mechanic) => mechanic.id,
      ),
    ).toEqual(["one", "two"]);
  });

  it("hides an unavailable mechanic after their scheduled work is removed", () => {
    expect(getVisibleMechanics(mechanics, [mechanics[0]], [])).toEqual([
      mechanics[0],
    ]);
  });
});
