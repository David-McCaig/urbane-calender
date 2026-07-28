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
import { WorkOrdersSidebar } from "./jobs-sidebar";
import { JobsSidebarSkeleton } from "./jobs-sidebar-skeleton";

export default function Calendar() {
  const { activeShop, isLoading: shopLoading } = useActiveShop();

  const {
    mechanics,
    scheduledJobs,
    workOrders,
    loadingGrid,
    loadingWorkOrders,
    currentDate,
    setCurrentDate,
    navigateDate,
    goToToday,
    activeDragOverlay,
    handleDragStart,
    handleDragEnd,
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
      <div className="min-h-screen bg-gray-50 flex">
        <div className="w-[70%] flex-shrink-0">
          <main className="p-6">
            <CalendarGridSkeleton />
          </main>
        </div>
        <JobsSidebarSkeleton />
      </div>
    );
  }

  // No shop set up
  if (!activeShop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Shop Set Up</h2>
          <p className="text-gray-600 mb-4">
            You need to create or join a shop before you can use the calendar.
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
    >
      <div className="min-h-screen bg-gray-50 flex">
        <CalendarGrid
          mechanics={mechanics}
          scheduledJobs={scheduledJobs}
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

        <WorkOrdersSidebar
          workOrders={workOrders}
          loadingWorkOrders={loadingWorkOrders}
          currentDate={currentDate}
          onNavigateDate={navigateDate}
          onGoToToday={goToToday}
          onDateSelect={setCurrentDate}
        />

        <DragOverlay>
          {activeDragOverlay ? (
            <div className="p-3 bg-blue-100 border-2 border-blue-300 rounded-lg shadow-lg">
              <div className="font-medium text-sm text-blue-900">
                {activeDragOverlay.title}
              </div>
              <div className="text-xs text-blue-700">
                {activeDragOverlay.subtitle}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
