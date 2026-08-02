import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getExistingWorkorderIds: vi.fn(),
  getJobByWorkorderId: vi.fn(),
  createJob: vi.fn(),
  getMechanics: vi.fn(),
  getMechanicDayStatuses: vi.fn(),
  setMechanicDayStatuses: vi.fn(),
  getScheduledJobs: vi.fn(),
  createScheduledJob: vi.fn(),
  updateScheduledJob: vi.fn(),
  deleteScheduledJob: vi.fn(),
  deleteJob: vi.fn(),
  subscribeToJobs: vi.fn(),
  subscribeToScheduledJobs: vi.fn(),
  subscribeToMechanics: vi.fn(),
  subscribeToMechanicDayStatuses: vi.fn(),
  getSchedulingConflicts: vi.fn(),
  getWorkOrdersByDate: vi.fn(),
  getWorkOrdersByIds: vi.fn(),
  getWorkorderStatuses: vi.fn(),
}));

vi.mock("@/lib/database/calendar", () => ({
  getExistingWorkorderIds: mocks.getExistingWorkorderIds,
  getJobByWorkorderId: mocks.getJobByWorkorderId,
  createJob: mocks.createJob,
  getMechanics: mocks.getMechanics,
  getMechanicDayStatuses: mocks.getMechanicDayStatuses,
  setMechanicDayStatuses: mocks.setMechanicDayStatuses,
  getScheduledJobs: mocks.getScheduledJobs,
  createScheduledJob: mocks.createScheduledJob,
  updateScheduledJob: mocks.updateScheduledJob,
  deleteScheduledJob: mocks.deleteScheduledJob,
  deleteJob: mocks.deleteJob,
  subscribeToJobs: mocks.subscribeToJobs,
  subscribeToScheduledJobs: mocks.subscribeToScheduledJobs,
  subscribeToMechanics: mocks.subscribeToMechanics,
  subscribeToMechanicDayStatuses: mocks.subscribeToMechanicDayStatuses,
  getSchedulingConflicts: mocks.getSchedulingConflicts,
}));

vi.mock("@/lib/actions/light-speed", () => ({
  getWorkOrdersByDate: mocks.getWorkOrdersByDate,
  getWorkOrdersByIds: mocks.getWorkOrdersByIds,
  getWorkorderStatuses: mocks.getWorkorderStatuses,
}));

import { useCalendarData } from "@/components/calender/use-calendar-data";
import type { WorkOrderHydrationResult } from "@/lib/actions/light-speed";

describe("useCalendarData hydration cleanup", () => {
  beforeEach(() => {
    const subscription = () => ({ unsubscribe: vi.fn() });

    mocks.getMechanics.mockResolvedValue([]);
    mocks.getMechanicDayStatuses.mockResolvedValue([]);
    mocks.getScheduledJobs.mockResolvedValue([
      {
        id: "scheduled-1",
        job: {
          id: "job-1",
          workorder_id: "123",
        },
      },
    ]);
    mocks.getWorkOrdersByDate.mockResolvedValue([]);
    mocks.getWorkorderStatuses.mockResolvedValue({});
    mocks.getExistingWorkorderIds.mockResolvedValue(new Set());
    mocks.subscribeToJobs.mockImplementation(subscription);
    mocks.subscribeToScheduledJobs.mockImplementation(subscription);
    mocks.subscribeToMechanics.mockImplementation(subscription);
    mocks.subscribeToMechanicDayStatuses.mockImplementation(subscription);
    mocks.getSchedulingConflicts.mockReturnValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("cancels a pending rate-limit retry when the calendar unmounts", async () => {
    let resolveHydration!: (result: WorkOrderHydrationResult) => void;
    mocks.getWorkOrdersByIds.mockReturnValue(
      new Promise<WorkOrderHydrationResult>((resolve) => {
        resolveHydration = resolve;
      }),
    );

    const activeShop = { id: "shop-1" };
    const { unmount } = renderHook(() => useCalendarData(activeShop));

    await waitFor(() => {
      expect(mocks.getWorkOrdersByIds).toHaveBeenCalledTimes(1);
    });

    vi.useFakeTimers();
    await act(async () => {
      resolveHydration({
        status: "rate_limited",
        orders: [],
        retryAfter: "30",
        retryable: true,
      });
      await Promise.resolve();
    });

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });

    expect(mocks.getWorkOrdersByIds).toHaveBeenCalledTimes(1);
  });
});
