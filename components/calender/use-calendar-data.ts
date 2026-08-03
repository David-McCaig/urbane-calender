"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  getExistingWorkorderIds,
  getJobByWorkorderId,
  createJob,
  updateJob,
  getMechanics,
  getMechanicDayStatuses,
  setMechanicDayStatuses,
  getScheduledJobs,
  createScheduledJob,
  updateScheduledJob,
  deleteScheduledJob,
  deleteJob,
  subscribeToJobs,
  subscribeToScheduledJobs,
  subscribeToMechanics,
  subscribeToMechanicDayStatuses,
  getSchedulingConflicts,
  type Job,
  type Mechanic,
  type MechanicDaySelection,
  type MechanicDayStatus,
  type ScheduledJob,
} from "@/lib/database/calendar";
import {
  getWorkOrdersByDate,
  getWorkOrdersByIds,
  getWorkOrderDetails,
  getWorkorderStatuses,
  type WorkOrderHydrationResult,
} from "@/lib/actions/light-speed";
import {
  getHydrationRetryDelay,
  shouldRetryHydration,
} from "@/lib/lightspeed/work-order-hydration";
import { labourDollarsToDurationHours } from "@/lib/lightspeed/work-order-pricing";
import type { LightspeedWorkOrder, WorkOrderStatusMap } from "@/lib/lightspeed/types";
import {
  DEFAULT_CALENDAR_HOURS,
  type CalendarHours,
} from "@/lib/calendar/slots";
import {
  getVisibleMechanics,
  getWorkingMechanics,
} from "@/lib/calendar/mechanic-availability";

/** Format a Date as YYYY-MM-DD in the local timezone — avoids the UTC shift of toISOString(). */
export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Lightweight overlay data for the drag overlay. */
interface DragOverlayData {
  title: string;
  subtitle: string;
}

interface UseCalendarDataReturn {
  // Data
  mechanics: Mechanic[];
  workingMechanicIds: Set<string>;
  allMechanics: Mechanic[];
  mechanicDayStatuses: MechanicDayStatus[];
  scheduledJobs: ScheduledJob[];
  scheduledWorkOrders: Record<string, LightspeedWorkOrder>;
  workOrders: LightspeedWorkOrder[];
  workOrderStatusMap: WorkOrderStatusMap;
  loadingGrid: boolean;
  loadingWorkOrders: boolean;
  // Date (grid)
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  navigateDate: (direction: "prev" | "next") => void;
  // Date (work orders sidebar — independent from grid)
  workOrdersDate: Date;
  setWorkOrdersDate: (date: Date) => void;
  navigateWorkOrdersDate: (direction: "prev" | "next") => void;
  // Drag and drop
  activeDragOverlay: DragOverlayData | null;
  isDraggingScheduledJob: boolean;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  // CRUD
  removeScheduledJob: (scheduledJobId: string) => Promise<void>;
  resizeScheduledJob: (scheduledJobId: string, duration: number) => Promise<boolean>;
  saveMechanicDayStatuses: (selections: MechanicDaySelection[]) => Promise<void>;
}

export function useCalendarData(
  activeShop: { id: string } | null,
  calendarHours: CalendarHours = DEFAULT_CALENDAR_HOURS,
): UseCalendarDataReturn {
  const [existingWorkorderIds, setExistingWorkorderIds] = useState<Set<string>>(new Set());
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [scheduledWorkOrders, setScheduledWorkOrders] = useState<
    Record<string, LightspeedWorkOrder>
  >({});
  const [allMechanics, setAllMechanics] = useState<Mechanic[]>([]);
  const [mechanicDayStatuses, setMechanicDayStatusesState] = useState<
    MechanicDayStatus[]
  >([]);
  const [allWorkOrders, setAllWorkOrders] = useState<LightspeedWorkOrder[]>([]);
  const [workOrders, setWorkOrders] = useState<LightspeedWorkOrder[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true);
  const [workOrderStatusMap, setWorkOrderStatusMap] = useState<WorkOrderStatusMap>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workOrdersDate, setWorkOrdersDate] = useState(new Date());
  const [activeDragOverlay, setActiveDragOverlay] = useState<DragOverlayData | null>(null);
  const [isDraggingScheduledJob, setIsDraggingScheduledJob] = useState(false);
  const workingMechanics = useMemo(
    () => getWorkingMechanics(allMechanics, mechanicDayStatuses),
    [allMechanics, mechanicDayStatuses],
  );
  const workingMechanicIds = useMemo(
    () => new Set(workingMechanics.map((mechanic) => mechanic.id)),
    [workingMechanics],
  );
  const mechanics = useMemo(
    () => getVisibleMechanics(allMechanics, workingMechanics, scheduledJobs),
    [allMechanics, workingMechanics, scheduledJobs],
  );
  const scheduledWorkorderIdsKey = useMemo(
    () =>
      [...new Set(scheduledJobs.map((item) => item.job.workorder_id))]
        .sort()
        .join(","),
    [scheduledJobs],
  );

  // Keep a ref to currentDate so the realtime callbacks always read the latest date
  // without needing to resubscribe when the date changes.
  const currentDateRef = useRef(currentDate);
  currentDateRef.current = currentDate;
  const activeShopIdRef = useRef(activeShop?.id ?? null);
  activeShopIdRef.current = activeShop?.id ?? null;
  const mechanicStatusRequestIdRef = useRef(0);

  const refreshMechanicDayStatuses = useCallback(async (
    date: string,
    shopId: string,
  ) => {
    const requestId = ++mechanicStatusRequestIdRef.current;
    const statuses = await getMechanicDayStatuses(date);
    if (
      requestId !== mechanicStatusRequestIdRef.current ||
      activeShopIdRef.current !== shopId ||
      formatLocalDate(currentDateRef.current) !== date
    ) {
      return;
    }
    setMechanicDayStatusesState(statuses);
  }, []);

  // Keep a ref to the current workorder IDs so the realtime subscription callback
  // can re-check only the displayed IDs without resubscribing on every data change.
  const workOrderIdsRef = useRef<string[]>([]);

  // Track which shop owns the hydrated work-order map so details from one shop
  // cannot remain visible after switching to another.
  const hydratedWorkOrdersShopIdRef = useRef<string | null>(null);

  // Load grid data — mechanics, scheduled jobs, local jobs, statuses
  useEffect(() => {
    if (!activeShop) return;

    const dateStr = formatLocalDate(currentDate);
    let cancelled = false;

    setLoadingGrid(true);
    Promise.all([
      getMechanics(),
      refreshMechanicDayStatuses(dateStr, activeShop.id),
      getScheduledJobs(dateStr),
    ])
      .then(([mechanicsData, , scheduledJobsData]) => {
        if (cancelled) return;
        setAllMechanics(mechanicsData);
        setScheduledJobs(scheduledJobsData);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoadingGrid(false);
      });

    getWorkorderStatuses(activeShop.id)
      .then(setWorkOrderStatusMap)
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [currentDate, activeShop, refreshMechanicDayStatuses]);

  // Hydrate scheduled cards with current Lightspeed data. Supabase remains
  // responsible only for placement and duration.
  useEffect(() => {
    const shopId = activeShop?.id ?? null;
    if (hydratedWorkOrdersShopIdRef.current !== shopId) {
      hydratedWorkOrdersShopIdRef.current = shopId;
      setScheduledWorkOrders({});
    }
    if (!shopId) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let hydrationAttempt = 0;
    const workorderIds = scheduledWorkorderIdsKey
      ? scheduledWorkorderIdsKey.split(",")
      : [];
    if (workorderIds.length === 0) {
      setScheduledWorkOrders({});
      return;
    }

    const hydrateWorkOrders = () => {
      hydrationAttempt += 1;
      getWorkOrdersByIds(shopId, workorderIds)
        .then((result) => {
          if (cancelled) return;
          if (result.status !== "ok") {
            if (!shouldRetryHydration(result, hydrationAttempt)) {
              return;
            }
            const delay = getHydrationRetryDelay(result, hydrationAttempt - 1);
            retryTimer = setTimeout(hydrateWorkOrders, delay);
            return;
          }
          setScheduledWorkOrders(
            Object.fromEntries(
              result.orders.map((order) => [String(order.workorderID), order]),
            ),
          );
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("Error hydrating scheduled work orders:", error);
          const retryResult: WorkOrderHydrationResult = {
            status: "unavailable",
            orders: [],
            retryAfter: null,
            retryable: true,
          };
          if (!shouldRetryHydration(retryResult, hydrationAttempt)) return;
          const delay = getHydrationRetryDelay(retryResult, hydrationAttempt - 1);
          retryTimer = setTimeout(hydrateWorkOrders, delay);
        });
    };

    hydrateWorkOrders();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [scheduledWorkorderIdsKey, activeShop]);

  // Load Lightspeed work orders — independent from grid date
  useEffect(() => {
    if (!activeShop) return;

    const workOrdersDateStr = formatLocalDate(workOrdersDate);

    setLoadingWorkOrders(true);
    getWorkOrdersByDate(activeShop.id, workOrdersDateStr)
      .then(async (orders) => {
        setAllWorkOrders(orders);
        const displayedIds = orders.map((wo) => String(wo.workorderID));
        workOrderIdsRef.current = displayedIds;
        const existingIds = await getExistingWorkorderIds(displayedIds);
        setExistingWorkorderIds(existingIds);
        setWorkOrders(
          orders.filter((wo) => !existingIds.has(String(wo.workorderID)))
        );
      })
      .catch((err) => {
        console.error("Error fetching work orders:", err);
        setAllWorkOrders([]);
        setWorkOrders([]);
      })
      .finally(() => setLoadingWorkOrders(false));
  }, [workOrdersDate, activeShop]);

  // Keep workOrders in sync when existingWorkorderIds or allWorkOrders change
  useEffect(() => {
    setWorkOrders(
      allWorkOrders.filter(
        (wo) => !existingWorkorderIds.has(String(wo.workorderID))
      )
    );
  }, [existingWorkorderIds, allWorkOrders]);

  // Set up real-time subscriptions — scoped to the active shop
  useEffect(() => {
    if (!activeShop) return;

    const jobsSubscription = subscribeToJobs(activeShop.id, (payload) => {
      console.log("Jobs changed:", payload);
      getExistingWorkorderIds(workOrderIdsRef.current)
        .then(setExistingWorkorderIds)
        .catch(console.error);
      getScheduledJobs(formatLocalDate(currentDateRef.current))
        .then(setScheduledJobs)
        .catch(console.error);
    });

    const scheduledJobsSubscription = subscribeToScheduledJobs(activeShop.id, (payload) => {
      console.log("Scheduled jobs changed:", payload);
      getScheduledJobs(formatLocalDate(currentDateRef.current))
        .then(setScheduledJobs)
        .catch(console.error);
    });

    const mechanicsSubscription = subscribeToMechanics(activeShop.id, (payload) => {
      console.log("Mechanics changed:", payload);
      getMechanics().then(setAllMechanics).catch(console.error);
    });

    const mechanicDayStatusesSubscription = subscribeToMechanicDayStatuses(
      activeShop.id,
      (payload) => {
        console.log("Mechanic day statuses changed:", payload);
        refreshMechanicDayStatuses(
          formatLocalDate(currentDateRef.current),
          activeShop.id,
        ).catch(console.error);
      },
    );

    return () => {
      jobsSubscription.unsubscribe();
      scheduledJobsSubscription.unsubscribe();
      mechanicsSubscription.unsubscribe();
      mechanicDayStatusesSubscription.unsubscribe();
    };
  }, [activeShop, refreshMechanicDayStatuses]);

  const saveMechanicDayStatuses = useCallback(async (
    selections: MechanicDaySelection[],
  ) => {
    if (!activeShop) throw new Error("No active shop");

    const unavailableMechanicIds = new Set(
      selections
        .filter((selection) => !selection.is_working)
        .map((selection) => selection.mechanic_id),
    );
    const conflicts = allMechanics
      .filter(
        (mechanic) =>
          unavailableMechanicIds.has(mechanic.id) &&
          scheduledJobs.some((job) => job.mechanic_id === mechanic.id),
      )
      .map((mechanic) => {
        const count = scheduledJobs.filter(
          (job) => job.mechanic_id === mechanic.id,
        ).length;
        return `${mechanic.name} has ${count} scheduled ${count === 1 ? "job" : "jobs"}`;
      });

    if (conflicts.length > 0) {
      throw new Error(
        `${conflicts.join("; ")}. Reassign or unschedule them before marking the mechanic as not working.`,
      );
    }

    const savedStatuses = await setMechanicDayStatuses(
      activeShop.id,
      formatLocalDate(currentDate),
      selections,
    );
    mechanicStatusRequestIdRef.current += 1;
    const savedMechanicIds = new Set(
      savedStatuses.map((status) => status.mechanic_id),
    );
    setMechanicDayStatusesState((current) => [
      ...current.filter(
        (status) =>
          status.source !== "manual" ||
          !savedMechanicIds.has(status.mechanic_id),
      ),
      ...savedStatuses,
    ]);
  }, [activeShop, allMechanics, currentDate, scheduledJobs]);

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateWorkOrdersDate = (direction: "prev" | "next") => {
    const newDate = new Date(workOrdersDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setWorkOrdersDate(newDate);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const dragId = event.active.id as string;
    setIsDraggingScheduledJob(false);

    // Lightspeed work order drag
    if (dragId.startsWith("ls-")) {
      const workorder = event.active.data.current?.workorder as LightspeedWorkOrder | undefined;
      if (workorder) {
        const hookIn =
          workorder.hookIn || `WO #${workorder.workorderID}`;
        const customerName = workorder.Customer
          ? `${workorder.Customer.firstName} ${workorder.Customer.lastName}`
          : `Customer #${workorder.customerID}`;
        const customerItem =
          workorder.Serialized?.description || "Customer item unavailable";

        setActiveDragOverlay({
          title: hookIn,
          subtitle: `${customerName} • ${customerItem} • 1h`,
        });
      }
      return;
    }

    // Existing scheduled job drag
    const scheduledJob = scheduledJobs.find((j) => j.id === dragId);
    if (scheduledJob?.job) {
      const workOrder = scheduledWorkOrders[scheduledJob.job.workorder_id];
      const customerName = workOrder?.Customer
        ? `${workOrder.Customer.firstName} ${workOrder.Customer.lastName}`
        : scheduledJob.job.customer_id;
      const customerItem =
        workOrder?.Serialized?.description || "Customer item unavailable";
      setIsDraggingScheduledJob(true);
      setActiveDragOverlay({
        title: workOrder?.hookIn || scheduledJob.job.hook_in,
        subtitle: `${customerName} • ${customerItem} • ${scheduledJob.job.duration}h`,
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragOverlay(null);
    setIsDraggingScheduledJob(false);

    if (!over) return;

    const dragId = active.id as string;
    const dateString = formatLocalDate(currentDate);

    // Handle dropping back to unscheduled jobs
    if (over.id === "unscheduled-jobs") {
      const scheduledJob = scheduledJobs.find((j) => j.id === dragId);
      if (!scheduledJob) return; // Lightspeed WOs can't be unscheduled — no-op

      // Optimistically remove from the grid
      setScheduledJobs((prev) => prev.filter((sj) => sj.id !== scheduledJob.id));
      try {
        // Every local job is the scheduling record for a Lightspeed work order.
        // Delete it directly and let the FK cascade remove scheduled_jobs. This
        // is independent of which date the work-orders sidebar is displaying.
        await deleteJob(scheduledJob.job.id);
        setExistingWorkorderIds((prev) => {
          const next = new Set(prev);
          next.delete(scheduledJob.job.workorder_id);
          return next;
        });
      } catch (error) {
        console.error("Error unscheduling job:", error);
        getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
        alert("Failed to unschedule job. Please try again.");
      }
      return;
    }

    // Handle dropping to schedule slots
    if (!over.id.toString().startsWith("slot-")) return;

    const [, mechanicIndex, timeSlot] = over.id.toString().split("-").map(Number);
    const mechanicsList = mechanics;

    if (mechanicIndex >= mechanicsList.length) {
      alert("Invalid mechanic selection");
      return;
    }

    const targetMechanic = mechanicsList[mechanicIndex];
    if (!workingMechanicIds.has(targetMechanic.id)) {
      alert(`${targetMechanic.name} is not working on this day.`);
      return;
    }

    // ---- Lightspeed work order: create local job, then schedule ----
    if (dragId.startsWith("ls-")) {
      const workorder = active.data.current?.workorder as LightspeedWorkOrder | undefined;
      if (!workorder) return;

      // Build customer display name
      const customerName = workorder.Customer
        ? `${workorder.Customer.firstName} ${workorder.Customer.lastName}`
        : `Customer #${workorder.customerID}`;
      const hookIn =
        workorder.hookIn || `Work Order #${workorder.workorderID}`;

      try {
        const details = await getWorkOrderDetails(
          activeShop!.id,
          String(workorder.workorderID),
        );
        const duration = details.workOrder
          ? labourDollarsToDurationHours(details.workOrder.totals.labour)
          : 1;

        // Try to create a local job — if it already exists (unique constraint),
        // find and reuse the existing one.
        let jobRecord: Job;
        try {
          jobRecord = await createJob({
            shop_id: activeShop!.id,
            workorder_id: String(workorder.workorderID),
            time_in: workorder.timeIn,
            eta_out: workorder.etaOut,
            customer_id: customerName,
            hook_in: hookIn,
            workorder_status_id: workorder.workorderStatusID,
            sale_id: workorder.saleID || "0",
            sale_line_id: workorder.saleLineID || "0",
            duration,
          });
        } catch (err) {
          // Unique constraint violation — job already exists, find it
          const existing = await getJobByWorkorderId(String(workorder.workorderID));
          if (!existing) throw err;
          jobRecord = existing;
          if (jobRecord.duration !== duration) {
            jobRecord = await updateJob(jobRecord.id, { duration });
          }
        }

        // Conflict check
        const conflicts = getSchedulingConflicts(
          jobRecord,
          mechanicIndex,
          timeSlot,
          scheduledJobs,
          mechanicsList,
          calendarHours,
        );
        if (conflicts.length > 0) {
          alert(`Cannot schedule job: ${conflicts.join(", ")}`);
          return;
        }

        // Create scheduled job
        await createScheduledJob({
          job_id: jobRecord.id,
          shop_id: activeShop!.id,
          mechanic_id: mechanicsList[mechanicIndex].id,
          time_slot: timeSlot,
          date: dateString,
        });

        // Re-fetch scheduled jobs to reconcile — realtime subscription will also fire.
        // Add workorder_id to existing set locally so the sidebar filters it out
        // without needing a full jobs re-fetch.
        getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
        setExistingWorkorderIds((prev) =>
          new Set(prev).add(String(workorder.workorderID))
        );
      } catch (error) {
        console.error("Error scheduling Lightspeed work order:", error);
        getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
        alert("Failed to schedule job. Please try again.");
      }
      return;
    }

    // ---- Move an existing scheduled job to a new slot ----
    const scheduledJob = scheduledJobs.find((j) => j.id === dragId);
    const job = scheduledJob?.job;

    if (!job) return;

    // Conflict check against current committed state, excluding the job being moved
    const otherScheduledJobs = scheduledJobs.filter((j) => j.id !== dragId);
    const conflicts = getSchedulingConflicts(
      job,
      mechanicIndex,
      timeSlot,
      otherScheduledJobs,
      mechanicsList,
      calendarHours,
    );

    if (conflicts.length > 0) {
      alert(`Cannot schedule job: ${conflicts.join(", ")}`);
      return;
    }

    try {
      // Optimistically move the scheduled job in local state
      setScheduledJobs((prev) =>
        prev.map((sj) =>
          sj.id === scheduledJob.id
            ? { ...sj, mechanic_id: mechanicsList[mechanicIndex].id, time_slot: timeSlot }
            : sj
        )
      );
      await updateScheduledJob(scheduledJob.id, {
        mechanic_id: mechanicsList[mechanicIndex].id,
        time_slot: timeSlot,
      });
    } catch (error) {
      console.error("Error moving scheduled job:", error);
      getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
      alert("Failed to move scheduled job. Please try again.");
    }
  };

  const handleDragCancel = () => {
    setActiveDragOverlay(null);
    setIsDraggingScheduledJob(false);
  };

  const removeScheduledJob = async (scheduledJobId: string) => {
    const dateString = formatLocalDate(currentDate);
    const scheduledJob = scheduledJobs.find((sj) => sj.id === scheduledJobId);

    setScheduledJobs((prev) => prev.filter((sj) => sj.id !== scheduledJobId));
    try {
      if (scheduledJob) {
        await deleteJob(scheduledJob.job.id);
        setExistingWorkorderIds((prev) => {
          const next = new Set(prev);
          next.delete(scheduledJob.job.workorder_id);
          return next;
        });
      } else {
        await deleteScheduledJob(scheduledJobId);
      }
    } catch (error) {
      console.error("Error removing scheduled job:", error);
      getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
      alert("Failed to remove scheduled job. Please try again.");
    }
  };

  const resizeScheduledJob = async (
    scheduledJobId: string,
    duration: number,
  ): Promise<boolean> => {
    const scheduledJob = scheduledJobs.find((item) => item.id === scheduledJobId);
    if (!scheduledJob) return false;

    const mechanicIndex = mechanics.findIndex(
      (mechanic) => mechanic.id === scheduledJob.mechanic_id,
    );
    const resizedJob = { ...scheduledJob.job, duration };
    const conflicts = getSchedulingConflicts(
      resizedJob,
      mechanicIndex,
      scheduledJob.time_slot,
      scheduledJobs.filter((item) => item.id !== scheduledJobId),
      mechanics,
      calendarHours,
    );

    if (conflicts.length > 0) {
      alert(`Cannot resize job: ${conflicts.join(", ")}`);
      return false;
    }

    const dateString = formatLocalDate(currentDate);
    setScheduledJobs((previous) =>
      previous.map((item) =>
        item.id === scheduledJobId
          ? { ...item, job: { ...item.job, duration } }
          : item,
      ),
    );

    try {
      await updateJob(scheduledJob.job.id, { duration });
      return true;
    } catch (error) {
      console.error("Error resizing scheduled job:", error);
      getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
      alert("Failed to resize job. Please try again.");
      return false;
    }
  };

  return {
    mechanics,
    workingMechanicIds,
    allMechanics,
    mechanicDayStatuses,
    scheduledJobs,
    scheduledWorkOrders,
    workOrders,
    workOrderStatusMap,
    loadingGrid,
    loadingWorkOrders,
    currentDate,
    setCurrentDate,
    navigateDate,
    workOrdersDate,
    setWorkOrdersDate,
    navigateWorkOrdersDate,
    activeDragOverlay,
    isDraggingScheduledJob,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    removeScheduledJob,
    resizeScheduledJob,
    saveMechanicDayStatuses,
  };
}
