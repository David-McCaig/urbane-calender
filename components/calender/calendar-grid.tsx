"use client";

import type React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import DropZone from "./drop-zone";
import { ScheduledJobBlock } from "./scheduled-job-block";
import { DatePicker } from "./date-picker";
import { CalendarGridSkeleton } from "./calendar-grid-skeleton";
import type { Mechanic, ScheduledJob } from "@/lib/database/calendar";
import type { LightspeedWorkOrder, WorkOrderStatusMap } from "@/lib/lightspeed/types";

interface CalendarGridProps {
  mechanics: Mechanic[];
  scheduledJobs: ScheduledJob[];
  scheduledWorkOrders: Record<string, LightspeedWorkOrder>;
  workOrderStatusMap: WorkOrderStatusMap;
  currentDate: Date;
  loadingGrid: boolean;
  showDatePicker: boolean;
  headerScrollRef: React.RefObject<HTMLDivElement | null>;
  contentScrollRef: React.RefObject<HTMLDivElement | null>;
  onNavigateDate: (direction: "prev" | "next") => void;
  onGoToToday: () => void;
  onToggleDatePicker: () => void;
  onDateSelect: (date: Date) => void;
  onRemoveScheduledJob: (id: string) => void;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CalendarGrid({
  mechanics,
  scheduledJobs,
  scheduledWorkOrders,
  workOrderStatusMap,
  currentDate,
  loadingGrid,
  showDatePicker,
  headerScrollRef,
  contentScrollRef,
  onNavigateDate,
  onGoToToday,
  onToggleDatePicker,
  onDateSelect,
  onRemoveScheduledJob,
}: CalendarGridProps) {
  if (loadingGrid) {
    return (
      <div className="w-[70%] flex-shrink-0">
        <main className="p-6">
          <CalendarGridSkeleton />
        </main>
      </div>
    );
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Sync the header to match the content scroll position
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="w-[70%] flex-shrink-0 overflow-hidden bg-white">
      <main className="p-6">
        {/* Date and Controls */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold tracking-[.04em] text-[#242426]">
              {currentDate.toDateString() === new Date().toDateString()
                ? "TODAY"
                : "SCHEDULE"}
            </h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateDate("prev")}
                className="border-[#d9dce6] bg-[#f1f2f6] hover:bg-[#e8eaf0]"
              >
                ←
              </Button>
              <Button
                variant="outline"
                onClick={onToggleDatePicker}
                className="min-w-[200px] justify-start border-[#d9dce6] bg-white text-left hover:bg-[#f6f7f9]"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {formatDate(currentDate)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateDate("next")}
                className="border-[#d9dce6] bg-[#f1f2f6] hover:bg-[#e8eaf0]"
              >
                →
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onGoToToday}
                className="ml-2 border-[#d9dce6] bg-white text-xs hover:bg-[#f6f7f9]"
              >
                Today
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              className="flex items-center space-x-2 border-[#d9dce6] bg-white"
            >
              <span>FILTERS</span>
            </Button>
            <div className="flex rounded-md border border-[#242426] bg-white">
              <Button
                variant="default"
                className="rounded-none bg-[#242426] text-white hover:bg-[#343438]"
              >
                DAY
              </Button>
              <Button variant="ghost" className="rounded-none text-[#242426]">
                WEEK
              </Button>
            </div>
          </div>
        </div>

        {/* Scheduler Grid */}
        <div className="relative overflow-hidden border border-[#d9dce6] bg-white">
          {/* Header Row */}
          <div className="flex border-b">
            <div className="w-20 flex-shrink-0 border-r border-[#d9dce6] bg-white p-4">
              <span className="text-xs font-bold tracking-[.08em] text-[#777b95]">TIME</span>
            </div>

            <div
              ref={headerScrollRef}
              className="flex-1 min-w-0 flex overflow-hidden mechanics-scroll-container"
            >
              {mechanics.map((mechanic) => (
                <div
                  key={mechanic.id}
                  className="min-w-[192px] flex-1 border-r border-[#d9dce6] bg-white p-4 last:border-r-0"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-[#eeeafe] font-medium text-[#565083]">
                        {mechanic.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {mechanic.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {mechanic.specialty}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content Row */}
          <div className="flex">
            {/* Time slots column */}
            <div className="w-20 flex-shrink-0 border-r border-[#d9dce6] bg-[#fafbfc]">
              {Array.from({ length: 32 }, (_, index) => {
                const totalMinutes = 10 * 60 + index * 15;
                const hour = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                const showLabel = minutes === 0 || minutes === 30;

                let timeLabel = "";
                if (showLabel) {
                  const displayHour =
                    hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                  const period = hour >= 12 ? "PM" : "AM";
                  timeLabel = `${displayHour}${minutes === 30 ? ":30" : ""} ${period}`;
                }

                return (
                  <div
                    key={index}
                    className="h-5 border-b border-gray-100 flex items-center justify-center"
                  >
                    {showLabel && (
                      <span className="text-xs font-medium text-gray-600">
                        {timeLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mechanic schedule columns */}
            <div
              ref={contentScrollRef}
              className="flex-1 min-w-0 flex overflow-x-auto mechanics-scroll-container"
              onScroll={handleScroll}
            >
              {mechanics.map((mechanic, mechanicIndex) => (
                <div
                  key={mechanic.id}
                  className="min-w-[192px] flex-1 border-r last:border-r-0 relative"
                >
                  {Array.from({ length: 32 }, (_, timeIndex) => (
                    <DropZone
                      key={timeIndex}
                      id={`slot-${mechanicIndex}-${timeIndex}`}
                      className="relative h-5 border-b border-[#eaecf1] bg-white transition-colors hover:bg-[#f8f9fb]"
                    />
                  ))}

                  {scheduledJobs
                    .filter(
                      (scheduledJob) =>
                        scheduledJob.mechanic_id === mechanic.id
                    )
                    .map((scheduledJob) => (
                      <ScheduledJobBlock
                        key={scheduledJob.id}
                        scheduledJob={scheduledJob}
                        cardData={(() => {
                          const workOrder =
                            scheduledWorkOrders[scheduledJob.job.workorder_id];
                          return {
                            hookIn:
                              workOrder?.hookIn ||
                              scheduledJob.job.hook_in ||
                              `Work order #${scheduledJob.job.workorder_id}`,
                            customerName:
                              workOrder?.Customer
                                ? `${workOrder.Customer.firstName} ${workOrder.Customer.lastName}`
                                : scheduledJob.job.customer_id,
                            customerItem:
                              workOrder?.Serialized?.description ||
                              "Customer item unavailable",
                            status:
                              workOrderStatusMap[
                                workOrder?.workorderStatusID ||
                                  scheduledJob.job.workorder_status_id
                              ] || "Unknown",
                            duration: scheduledJob.job.duration,
                          };
                        })()}
                        onRemove={() =>
                          onRemoveScheduledJob(scheduledJob.id)
                        }
                      />
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm">
            <div className="w-80 rounded-3xl border border-white/70 bg-[#fffdf8] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-[Georgia,'Times_New_Roman',serif] text-xl font-semibold">
                  Select Date
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleDatePicker}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <DatePicker
                selectedDate={currentDate}
                onDateSelect={onDateSelect}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
