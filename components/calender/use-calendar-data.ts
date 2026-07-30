"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  getExistingWorkorderIds,
  getJobByWorkorderId,
  createJob,
  getMechanics,
  getScheduledJobs,
  createScheduledJob,
  updateScheduledJob,
  deleteScheduledJob,
  deleteJob,
  subscribeToJobs,
  subscribeToScheduledJobs,
  subscribeToMechanics,
  getSchedulingConflicts,
  type Job,
  type Mechanic,
  type ScheduledJob,
} from "@/lib/database/calendar";
import {
  getWorkOrdersByDate,
  getWorkOrdersByIds,
  getWorkorderStatuses,
  type WorkOrderHydrationResult,
} from "@/lib/actions/light-speed";
import {
  getHydrationRetryDelay,
  shouldRetryHydration,
} from "@/lib/lightspeed/work-order-hydration";
import type { LightspeedWorkOrder, WorkOrderStatusMap } from "@/lib/lightspeed/types";

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
  goToToday: () => void;
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
}

export function useCalendarData(activeShop: { id: string } | null): UseCalendarDataReturn {
  const [existingWorkorderIds, setExistingWorkorderIds] = useState<Set<string>>(new Set());
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [scheduledWorkOrders, setScheduledWorkOrders] = useState<
    Record<string, LightspeedWorkOrder>
  >({});
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [allWorkOrders, setAllWorkOrders] = useState<LightspeedWorkOrder[]>([]);
  const [workOrders, setWorkOrders] = useState<LightspeedWorkOrder[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true);
  const [workOrderStatusMap, setWorkOrderStatusMap] = useState<WorkOrderStatusMap>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workOrdersDate, setWorkOrdersDate] = useState(new Date());
  const [activeDragOverlay, setActiveDragOverlay] = useState<DragOverlayData | null>(null);
  const [isDraggingScheduledJob, setIsDraggingScheduledJob] = useState(false);
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

  // Keep a ref to allWorkOrders so handleDragEnd can check Lightspeed origin
  const allWorkOrdersRef = useRef(allWorkOrders);
  allWorkOrdersRef.current = allWorkOrders;

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

    setLoadingGrid(true);
    getMechanics()
      .then(setMechanics)
      .catch(console.error)
      .finally(() => setLoadingGrid(false));

    getScheduledJobs(dateStr)
      .then(setScheduledJobs)
      .catch(console.error);

    getWorkorderStatuses(activeShop.id)
      .then(setWorkOrderStatusMap)
      .catch(console.error);
  }, [currentDate, activeShop]);

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
    });

    const scheduledJobsSubscription = subscribeToScheduledJobs(activeShop.id, (payload) => {
      console.log("Scheduled jobs changed:", payload);
      getScheduledJobs(formatLocalDate(currentDateRef.current))
        .then(setScheduledJobs)
        .catch(console.error);
    });

    const mechanicsSubscription = subscribeToMechanics(activeShop.id, (payload) => {
      console.log("Mechanics changed:", payload);
      getMechanics().then(setMechanics).catch(console.error);
    });

    return () => {
      jobsSubscription.unsubscribe();
      scheduledJobsSubscription.unsubscribe();
      mechanicsSubscription.unsubscribe();
    };
  }, [activeShop]);

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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
        await deleteScheduledJob(scheduledJob.id);

        // If this job originated from a Lightspeed work order, delete the local
        // job record too so it reappears in the sidebar.
        const isLightspeedOrigin = allWorkOrdersRef.current.some(
          (wo) => String(wo.workorderID) === scheduledJob.job.workorder_id
        );
        if (isLightspeedOrigin) {
          await deleteJob(scheduledJob.job.id);
          // Remove workorder_id from existing set so it reappears in the sidebar
          setExistingWorkorderIds((prev) => {
            const next = new Set(prev);
            next.delete(scheduledJob.job.workorder_id);
            return next;
          });
        }
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
            duration: 1,
          });
        } catch (err) {
          // Unique constraint violation — job already exists, find it
          const existing = await getJobByWorkorderId(String(workorder.workorderID));
          if (!existing) throw err;
          jobRecord = existing;
        }

        // Conflict check
        const conflicts = getSchedulingConflicts(
          jobRecord,
          mechanicIndex,
          timeSlot,
          scheduledJobs,
          mechanicsList,
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
      await deleteScheduledJob(scheduledJobId);

      // If this job came from Lightspeed, also delete the local job record
      if (scheduledJob) {
        const isLightspeedOrigin = allWorkOrdersRef.current.some(
          (wo) => String(wo.workorderID) === scheduledJob.job.workorder_id
        );
        if (isLightspeedOrigin) {
          await deleteJob(scheduledJob.job.id);
          // Remove workorder_id from existing set so it reappears in the sidebar
          setExistingWorkorderIds((prev) => {
            const next = new Set(prev);
            next.delete(scheduledJob.job.workorder_id);
            return next;
          });
        }
      }
    } catch (error) {
      console.error("Error removing scheduled job:", error);
      getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
      alert("Failed to remove scheduled job. Please try again.");
    }
  };

  return {
    mechanics,
    scheduledJobs,
    scheduledWorkOrders,
    workOrders,
    workOrderStatusMap,
    loadingGrid,
    loadingWorkOrders,
    currentDate,
    setCurrentDate,
    navigateDate,
    goToToday,
    workOrdersDate,
    setWorkOrdersDate,
    navigateWorkOrdersDate,
    activeDragOverlay,
    isDraggingScheduledJob,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    removeScheduledJob,
  };
}
