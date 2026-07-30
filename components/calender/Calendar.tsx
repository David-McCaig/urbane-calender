"use client";

import { useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
} from "@dnd-kit/core";
import { useActiveShop } from "@/lib/context/shop-context";
import { useCalendarData } from "./use-calendar-data";
import { CalendarGrid } from "./calendar-grid";
import { CalendarGridSkeleton } from "./calendar-grid-skeleton";
import { JobsPanel } from "./JobsPanel";

export default function Calendar() {
  const { activeShop, isLoading: shopLoading } = useActiveShop();

  const {
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
  } = useCalendarData(activeShop);

  // UI-only local state
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Refs for scroll syncing
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // Loading state — shop context still resolving
  if (shopLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] bg-[#f5f3ef]">
        <div className="w-[70%] flex-shrink-0">
          <main className="p-6">
            <CalendarGridSkeleton />
          </main>
        </div>
      </div>
    );
  }

  // No shop set up
  if (!activeShop) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f5f3ef] p-6">
        <div className="max-w-md rounded-2xl border bg-white p-10 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 size-12 text-[#8589a3]" />
          <h2 className="mb-2 font-[Georgia,'Times_New_Roman',serif] text-2xl font-semibold">No shop set up</h2>
          <p className="mb-5 text-sm text-[#655f55]">
            You need to create or join a shop before you can use the calendar.
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center rounded-md bg-[#1c1c1e] px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90"
          >
            Set Up Your Shop
          </a>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-[calc(100vh-4rem)] bg-[#f5f3ef]">
        <CalendarGrid
          mechanics={mechanics}
          scheduledJobs={scheduledJobs}
          scheduledWorkOrders={scheduledWorkOrders}
          workOrderStatusMap={workOrderStatusMap}
          currentDate={currentDate}
          loadingGrid={loadingGrid}
          showDatePicker={showDatePicker}
          headerScrollRef={headerScrollRef}
          contentScrollRef={contentScrollRef}
          onNavigateDate={navigateDate}
          onGoToToday={goToToday}
          onToggleDatePicker={() => setShowDatePicker(!showDatePicker)}
          onDateSelect={(date) => {
            setCurrentDate(date);
            setShowDatePicker(false);
          }}
          onRemoveScheduledJob={removeScheduledJob}
        />

        <JobsPanel
          workOrders={workOrders}
          workOrderStatusMap={workOrderStatusMap}
          loadingWorkOrders={loadingWorkOrders}
          currentDate={workOrdersDate}
          onNavigateDate={navigateWorkOrdersDate}
          onGoToToday={() => setWorkOrdersDate(new Date())}
          onDateSelect={setWorkOrdersDate}
          isDraggingScheduledJob={isDraggingScheduledJob}
        />

        <DragOverlay>
          {activeDragOverlay ? (
            <div className="rounded-2xl border-2 border-[#e9a48b] bg-[#f9e5d6] p-3 shadow-lg">
              <div className="text-sm font-medium text-[#452c27]">
                {activeDragOverlay.title}
              </div>
              <div className="text-xs text-[#8b594e]">
                {activeDragOverlay.subtitle}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
