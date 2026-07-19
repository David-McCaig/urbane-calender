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
  subscribeToJobs,
  subscribeToScheduledJobs,
  subscribeToMechanics,
  getSchedulingConflicts,
  type Job,
  type Mechanic,
  type ScheduledJob,
} from "@/lib/database/calendar";

/** Format a Date as YYYY-MM-DD in the local timezone — avoids the UTC shift of toISOString(). */
function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface UseCalendarDataReturn {
  // Data
  mechanics: Mechanic[];
  scheduledJobs: ScheduledJob[];
  jobs: Job[];
  loadingGrid: boolean;
  loadingJobs: boolean;
  // Date
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  navigateDate: (direction: "prev" | "next") => void;
  goToToday: () => void;
  // Drag and drop
  activeJob: Job | null;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  // CRUD
  addJob: (jobData: Omit<Job, "id" | "shop_id" | "created_at" | "updated_at">) => Promise<void>;
  removeScheduledJob: (scheduledJobId: string) => Promise<void>;
}

export function useCalendarData(activeShop: { id: string } | null): UseCalendarDataReturn {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  // Keep a ref to currentDate so the realtime callbacks always read the latest date
  // without needing to resubscribe when the date changes.
  const currentDateRef = useRef(currentDate);
  currentDateRef.current = currentDate;

  // Load initial data — independent queries so grid renders before jobs
  useEffect(() => {
    if (!activeShop) return;

    const dateStr = formatLocalDate(currentDate);

    // Mechanics → unblocks the grid
    setLoadingGrid(true);
    getMechanics()
      .then(setMechanics)
      .catch(console.error)
      .finally(() => setLoadingGrid(false));

    // Scheduled jobs → overlays on the grid (doesn't block grid render)
    getScheduledJobs(dateStr)
      .then(setScheduledJobs)
      .catch(console.error);

    // Jobs → unblocks the sidebar
    setLoadingJobs(true);
    getJobs()
      .then(setJobs)
      .catch(console.error)
      .finally(() => setLoadingJobs(false));
  }, [currentDate, activeShop]);

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

  const addJob = async (jobData: Omit<Job, "id" | "shop_id" | "created_at" | "updated_at">) => {
    if (!activeShop) {
      alert("No shop selected. Please set up your shop first.");
      return;
    }

    try {
      const jobWithShop = {
        ...jobData,
        shop_id: activeShop.id,
      };

      const newJob = await createJob(jobWithShop);
      setJobs((prev) => [newJob, ...prev]);
    } catch (error) {
      console.error("Error adding job:", error);
      alert("Failed to add job. Please try again.");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const dragId = event.active.id as string;
    const unscheduledJob = jobs.find((j) => j.id === dragId);
    const scheduledJob = scheduledJobs.find((j) => j.id === dragId);
    setActiveJob(unscheduledJob || scheduledJob?.job || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) return;

    const jobId = active.id as string;
    const unscheduledJob = jobs.find((j) => j.id === jobId);
    const scheduledJob = scheduledJobs.find((j) => j.id === jobId);
    const job = unscheduledJob || scheduledJob?.job;

    if (!job) return;

    const dropZoneId = over.id as string;
    const dateString = formatLocalDate(currentDate);

    // Handle dropping back to unscheduled jobs
    if (dropZoneId === "unscheduled-jobs") {
      if (scheduledJob) {
        // Optimistically remove from the grid — synchronous, paints immediately
        setScheduledJobs((prev) => prev.filter((sj) => sj.id !== scheduledJob.id));
        try {
          await deleteScheduledJob(scheduledJob.id);
          // The real-time subscription will reconcile
        } catch (error) {
          console.error("Error unscheduling job:", error);
          // Re-fetch from server to reconcile state (avoids overwriting real-time updates)
          getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
          alert("Failed to unschedule job. Please try again.");
        }
      }
      return;
    }

    // Handle dropping to schedule slots
    if (!dropZoneId.startsWith("slot-")) return;

    const [, mechanicIndex, timeSlot] = dropZoneId.split("-").map(Number);

    if (mechanicIndex >= mechanics.length) {
      alert("Invalid mechanic selection");
      return;
    }

    // Conflict check against current committed state, excluding the job being moved
    const otherScheduledJobs = scheduledJobs.filter((j) => j.id !== jobId);
    const conflicts = getSchedulingConflicts(
      job,
      mechanicIndex,
      timeSlot,
      otherScheduledJobs,
      mechanics
    );

    if (conflicts.length > 0) {
      alert(`Cannot schedule job: ${conflicts.join(", ")}`);
      return;
    }

    try {
      if (unscheduledJob) {
        // ---- Schedule an unscheduled job ----
        // Optimistically add to the grid immediately with a placeholder ID
        const optimisticEntry: ScheduledJob = {
          id: `optimistic-${job.id}`,
          job_id: job.id,
          shop_id: job.shop_id,
          mechanic_id: mechanics[mechanicIndex].id,
          time_slot: timeSlot,
          date: dateString,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          job: job,
          mechanic: mechanics[mechanicIndex],
        };
        setScheduledJobs((prev) => [...prev, optimisticEntry]);
        await createScheduledJob({
          job_id: job.id,
          shop_id: job.shop_id,
          mechanic_id: mechanics[mechanicIndex].id,
          time_slot: timeSlot,
          date: dateString,
        });
        // The real-time subscription will reconcile (replaces placeholder ID with real one)
      } else if (scheduledJob) {
        // ---- Move an existing scheduled job ----
        // Optimistically update in place — synchronous, paints immediately
        setScheduledJobs((prev) =>
          prev.map((sj) =>
            sj.id === scheduledJob.id
              ? { ...sj, mechanic_id: mechanics[mechanicIndex].id, time_slot: timeSlot }
              : sj
          )
        );
        await updateScheduledJob(scheduledJob.id, {
          mechanic_id: mechanics[mechanicIndex].id,
          time_slot: timeSlot,
        });
        // The real-time subscription will reconcile
      }
    } catch (error) {
      console.error("Error scheduling job:", error);
      // Re-fetch from server to reconcile state (avoids overwriting real-time updates)
      getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
      alert("Failed to schedule job. Please try again.");
    }
  };

  const removeScheduledJob = async (scheduledJobId: string) => {
    const dateString = formatLocalDate(currentDate);
    // Optimistically remove from the grid — synchronous, paints immediately
    setScheduledJobs((prev) => prev.filter((sj) => sj.id !== scheduledJobId));
    try {
      await deleteScheduledJob(scheduledJobId);
      // The real-time subscription will reconcile
    } catch (error) {
      console.error("Error removing scheduled job:", error);
      // Re-fetch from server to reconcile state (avoids overwriting real-time updates)
      getScheduledJobs(dateString).then(setScheduledJobs).catch(console.error);
      alert("Failed to remove scheduled job. Please try again.");
    }
  };

  return {
    mechanics,
    scheduledJobs,
    jobs,
    loadingGrid,
    loadingJobs,
    currentDate,
    setCurrentDate,
    navigateDate,
    goToToday,
    activeJob,
    handleDragStart,
    handleDragEnd,
    addJob,
    removeScheduledJob,
  };
}
