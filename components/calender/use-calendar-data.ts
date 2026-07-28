"use client";

import { useEffect, useRef, useState } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  getJobs,
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
import { getWorkOrdersByDate, getWorkorderStatuses } from "@/lib/actions/light-speed";
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
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  // CRUD
  removeScheduledJob: (scheduledJobId: string) => Promise<void>;
}

export function useCalendarData(activeShop: { id: string } | null): UseCalendarDataReturn {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [allWorkOrders, setAllWorkOrders] = useState<LightspeedWorkOrder[]>([]);
  const [workOrders, setWorkOrders] = useState<LightspeedWorkOrder[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(true);
  const [workOrderStatusMap, setWorkOrderStatusMap] = useState<WorkOrderStatusMap>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workOrdersDate, setWorkOrdersDate] = useState(new Date());
  const [activeDragOverlay, setActiveDragOverlay] = useState<DragOverlayData | null>(null);

  // Keep a ref to currentDate so the realtime callbacks always read the latest date
  // without needing to resubscribe when the date changes.
  const currentDateRef = useRef(currentDate);
  currentDateRef.current = currentDate;

  // Keep a ref to allWorkOrders so handleDragEnd can check Lightspeed origin
  const allWorkOrdersRef = useRef(allWorkOrders);
  allWorkOrdersRef.current = allWorkOrders;

  // Keep a ref to jobs for filtering work orders in fetch callbacks
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

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

    getJobs()
      .then(setJobs)
      .catch(console.error);

    getWorkorderStatuses(activeShop.id)
      .then(setWorkOrderStatusMap)
      .catch(console.error);
  }, [currentDate, activeShop]);

  // Load Lightspeed work orders — independent from grid date
  useEffect(() => {
    if (!activeShop) return;

    const workOrdersDateStr = formatLocalDate(workOrdersDate);

    setLoadingWorkOrders(true);
    getWorkOrdersByDate(activeShop.id, workOrdersDateStr)
      .then((orders) => {
        setAllWorkOrders(orders);
        const localJobWorkorderIds = new Set(
          jobsRef.current.map((j) => j.workorder_id)
        );
        setWorkOrders(
          orders.filter(
            (wo) => !localJobWorkorderIds.has(String(wo.workorderID))
          )
        );
      })
      .catch((err) => {
        console.error("Error fetching work orders:", err);
        setAllWorkOrders([]);
        setWorkOrders([]);
      })
      .finally(() => setLoadingWorkOrders(false));
  }, [workOrdersDate, activeShop]);

  // Keep workOrders in sync when jobs change (e.g., after scheduling/unscheduling)
  useEffect(() => {
    const localJobWorkorderIds = new Set(
      jobs.map((j) => j.workorder_id)
    );
    setWorkOrders(
      allWorkOrders.filter(
        (wo) => !localJobWorkorderIds.has(String(wo.workorderID))
      )
    );
  }, [jobs, allWorkOrders]);

  // Set up real-time subscriptions — scoped to the active shop
  useEffect(() => {
    if (!activeShop) return;

    const jobsSubscription = subscribeToJobs(activeShop.id, (payload) => {
      console.log("Jobs changed:", payload);
      getJobs().then(setJobs).catch(console.error);
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

    // Lightspeed work order drag
    if (dragId.startsWith("ls-")) {
      const workorder = event.active.data.current?.workorder as LightspeedWorkOrder | undefined;
      if (workorder) {
        const itemDescription =
          workorder.Serialized?.description || `WO #${workorder.workorderID}`;
        const customerName = workorder.Customer
          ? `${workorder.Customer.firstName} ${workorder.Customer.lastName}`
          : `Customer #${workorder.customerID}`;
        const etaTime = new Date(workorder.etaOut).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });

        setActiveDragOverlay({
          title: itemDescription,
          subtitle: `${customerName} • ETA ${etaTime}`,
        });
      }
      return;
    }

    // Existing local job drag
    const unscheduledJob = jobs.find((j) => j.id === dragId);
    const scheduledJob = scheduledJobs.find((j) => j.id === dragId);
    const job = unscheduledJob || scheduledJob?.job || null;

    if (job) {
      setActiveDragOverlay({
        title: job.hook_in,
        subtitle: `Customer ${job.customer_id} • ${job.duration}h`,
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragOverlay(null);

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
          // Re-fetch local jobs so the filtering effect picks up the deletion
          getJobs().then(setJobs).catch(console.error);
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
      const itemDescription =
        workorder.Serialized?.description || `Work Order #${workorder.workorderID}`;

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
            hook_in: itemDescription,
            workorder_status_id: workorder.workorderStatusID,
            sale_id: workorder.saleID || "0",
            sale_line_id: workorder.saleLineID || "0",
            duration: 1,
          });
        } catch (err) {
          // Unique constraint violation — job already exists, find it
          const freshJobs = await getJobs();
          const existing = freshJobs.find(
            (j) => j.workorder_id === String(workorder.workorderID)
          );
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

        // Re-fetch to reconcile — realtime subscription will also fire
        getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
        getJobs().then(setJobs).catch(console.error);
      } catch (error) {
        console.error("Error scheduling Lightspeed work order:", error);
        getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
        getJobs().then(setJobs).catch(console.error);
        alert("Failed to schedule job. Please try again.");
      }
      return;
    }

    // ---- Existing local job scheduling logic ----
    const unscheduledJob = jobs.find((j) => j.id === dragId);
    const scheduledJob = scheduledJobs.find((j) => j.id === dragId);
    const job = unscheduledJob || scheduledJob?.job;

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
      if (unscheduledJob) {
        // ---- Schedule an unscheduled job ----
        const optimisticEntry: ScheduledJob = {
          id: `optimistic-${job.id}`,
          job_id: job.id,
          shop_id: job.shop_id,
          mechanic_id: mechanicsList[mechanicIndex].id,
          time_slot: timeSlot,
          date: dateString,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          job: job,
          mechanic: mechanicsList[mechanicIndex],
        };
        setScheduledJobs((prev) => [...prev, optimisticEntry]);
        await createScheduledJob({
          job_id: job.id,
          shop_id: job.shop_id,
          mechanic_id: mechanicsList[mechanicIndex].id,
          time_slot: timeSlot,
          date: dateString,
        });
      } else if (scheduledJob) {
        // ---- Move an existing scheduled job ----
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
      }
    } catch (error) {
      console.error("Error scheduling job:", error);
      getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
      alert("Failed to schedule job. Please try again.");
    }
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
          getJobs().then(setJobs).catch(console.error);
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
    handleDragStart,
    handleDragEnd,
    removeScheduledJob,
  };
}
