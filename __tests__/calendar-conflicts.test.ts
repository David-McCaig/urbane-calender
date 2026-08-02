import { beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_CALENDAR_HOURS } from "@/lib/calendar/slots";
import type {
  Job,
  Mechanic,
  ScheduledJob,
} from "@/lib/database/calendar";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

let getSchedulingConflicts: typeof import("@/lib/database/calendar").getSchedulingConflicts;

const job = {
  id: "job-1",
  hook_in: "Repair",
  duration: 1,
} as Job;

const mechanics = [{ id: "mechanic-1" }] as Mechanic[];

beforeAll(async () => {
  ({ getSchedulingConflicts } = await import("@/lib/database/calendar"));
});

describe("calendar scheduling conflicts", () => {
  it("allows a job to finish exactly at the exclusive workday end", () => {
    expect(
      getSchedulingConflicts(
        job,
        0,
        72,
        [],
        mechanics,
        DEFAULT_CALENDAR_HOURS,
      ),
    ).toEqual([]);
  });

  it("rejects a job that extends beyond the workday", () => {
    expect(
      getSchedulingConflicts(
        job,
        0,
        73,
        [],
        mechanics,
        DEFAULT_CALENDAR_HOURS,
      ),
    ).toContain("Job extends beyond work hours (7 PM)");
  });

  it("detects overlap using absolute slots", () => {
    const existingJob = {
      mechanic_id: "mechanic-1",
      time_slot: 44,
      job: { ...job, id: "job-2", hook_in: "Tune-up" },
    } as ScheduledJob;

    expect(
      getSchedulingConflicts(
        job,
        0,
        46,
        [existingJob],
        mechanics,
        DEFAULT_CALENDAR_HOURS,
      ),
    ).toContain("Time slot conflicts with Tune-up");
  });
});
