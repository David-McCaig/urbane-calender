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
  let mechanicDayStatusCallback: (() => void) | undefined;

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
    mocks.subscribeToMechanicDayStatuses.mockImplementation(
      (_shopId: string, callback: () => void) => {
        mechanicDayStatusCallback = callback;
        return subscription();
      },
    );
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

  it("discards a realtime status response after navigating to another day", async () => {
    mocks.getScheduledJobs.mockResolvedValue([]);
    mocks.getWorkOrdersByIds.mockResolvedValue({
      status: "ok",
      orders: [],
      retryAfter: null,
      retryable: false,
    });
    const activeShop = { id: "shop-1" };
    const { result } = renderHook(() => useCalendarData(activeShop));

    await waitFor(() => {
      expect(mechanicDayStatusCallback).toBeTypeOf("function");
      expect(mocks.getMechanicDayStatuses).toHaveBeenCalledTimes(1);
    });

    let resolveOldRequest!: (statuses: never[]) => void;
    mocks.getMechanicDayStatuses.mockImplementationOnce(
      () => new Promise<never[]>((resolve) => {
        resolveOldRequest = resolve;
      }),
    );
    act(() => mechanicDayStatusCallback?.());

    const nextDayStatus = {
      id: "next-day",
      shop_id: "shop-1",
      mechanic_id: "mechanic-1",
      date: "2099-01-02",
      is_working: false,
      source: "manual",
      created_at: "2099-01-02T00:00:00Z",
      updated_at: "2099-01-02T00:00:00Z",
    };
    mocks.getMechanicDayStatuses.mockResolvedValueOnce([nextDayStatus]);
    act(() => result.current.setCurrentDate(new Date(2099, 0, 2)));

    await waitFor(() => {
      expect(result.current.mechanicDayStatuses).toEqual([nextDayStatus]);
    });

    await act(async () => {
      resolveOldRequest([]);
      await Promise.resolve();
    });

    expect(result.current.mechanicDayStatuses).toEqual([nextDayStatus]);
  });

  it("unschedules a work order even when the sidebar is showing another date", async () => {
    mocks.getWorkOrdersByIds.mockResolvedValue({
      status: "ok",
      orders: [],
      retryAfter: null,
      retryable: false,
    });
    mocks.deleteJob.mockResolvedValue(undefined);

    const activeShop = { id: "shop-1" };
    const { result } = renderHook(() => useCalendarData(activeShop));

    await waitFor(() => {
      expect(result.current.scheduledJobs).toHaveLength(1);
    });
    expect(result.current.workOrders).toEqual([]);

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: "scheduled-1" },
        over: { id: "unscheduled-jobs" },
      } as never);
    });

    expect(mocks.deleteJob).toHaveBeenCalledWith("job-1");
    expect(mocks.deleteScheduledJob).not.toHaveBeenCalled();
    expect(result.current.scheduledJobs).toEqual([]);
  });
});
