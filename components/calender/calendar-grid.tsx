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
import type { WorkOrderDetailsSelection } from "@/components/calender/work-order-details-dialog";
import {
  formatSlotLabel,
  getVisibleSlots,
  MINUTES_PER_SLOT,
  type CalendarHours,
} from "@/lib/calendar/slots";

interface CalendarGridProps {
  calendarHours: CalendarHours;
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
  onToggleDatePicker: () => void;
  onDateSelect: (date: Date) => void;
  onRemoveScheduledJob: (id: string) => void;
  onResizeScheduledJob: (id: string, duration: number) => Promise<boolean>;
  onViewWorkOrder: (selection: WorkOrderDetailsSelection) => void;
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
  calendarHours,
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
  onToggleDatePicker,
  onDateSelect,
  onRemoveScheduledJob,
  onResizeScheduledJob,
  onViewWorkOrder,
}: CalendarGridProps) {
  if (loadingGrid) {
    return (
      <div className="w-[70%] flex-shrink-0">
        <main className="p-6">
          <CalendarGridSkeleton calendarHours={calendarHours} />
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
  const visibleSlots = getVisibleSlots(calendarHours);

  return (
    <div className="w-[70%] flex-shrink-0">
      <main className="p-6">
        {/* Date and Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              {currentDate.toDateString() === new Date().toDateString()
                ? "TODAY"
                : "SCHEDULE"}
            </h1>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateDate("prev")}
                className="hover:bg-gray-100"
              >
                ←
              </Button>
              <Button
                variant="outline"
                onClick={onToggleDatePicker}
                className="min-w-[200px] justify-start text-left hover:bg-gray-50"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {formatDate(currentDate)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateDate("next")}
                className="hover:bg-gray-100"
              >
                →
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            className="flex items-center space-x-2 bg-transparent"
          >
            <span>FILTERS</span>
          </Button>
        </div>

        {/* Scheduler Grid */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden relative">
          {/* Header Row */}
          <div className="flex border-b">
            <div className="w-20 p-4 bg-gray-50 border-r flex-shrink-0">
              <span className="text-sm font-medium text-gray-600">TIME</span>
            </div>

            <div
              ref={headerScrollRef}
              className="flex-1 min-w-0 flex overflow-hidden mechanics-scroll-container"
            >
              {mechanics.map((mechanic) => (
                <div
                  key={mechanic.id}
                  className="min-w-[192px] flex-1 p-4 bg-gray-50 border-r last:border-r-0"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
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
            <div className="w-20 border-r bg-gray-50/50 flex-shrink-0">
              {visibleSlots.map((slot) => {
                const minutes = (slot * MINUTES_PER_SLOT) % 60;
                const showLabel = minutes === 0 || minutes === 30;

                return (
                  <div
                    key={slot}
                    className="h-5 border-b border-gray-100 flex items-center justify-center"
                  >
                    {showLabel && (
                      <span className="text-xs font-medium text-gray-600">
                        {formatSlotLabel(slot)}
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
                  {visibleSlots.map((slot) => (
                    <DropZone
                      key={slot}
                      id={`slot-${mechanicIndex}-${slot}`}
                      className="h-5 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors relative"
                    />
                  ))}

                  {scheduledJobs
                    .filter(
                      (scheduledJob) =>
                        scheduledJob.mechanic_id === mechanic.id &&
                        scheduledJob.time_slot >= calendarHours.startSlot &&
                        scheduledJob.time_slot < calendarHours.endSlot
                    )
                    .map((scheduledJob) => (
                      <ScheduledJobBlock
                        key={scheduledJob.id}
                        scheduledJob={scheduledJob}
                        calendarHours={calendarHours}
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
                        onResize={(duration) =>
                          onResizeScheduledJob(scheduledJob.id, duration)
                        }
                        onViewDetails={() => {
                          const workOrder =
                            scheduledWorkOrders[scheduledJob.job.workorder_id];
                          const statusName =
                            workOrderStatusMap[
                              workOrder?.workorderStatusID ||
                                scheduledJob.job.workorder_status_id
                            ] || "Unknown";
                          onViewWorkOrder({
                            workOrderId: scheduledJob.job.workorder_id,
                            initialWorkOrder: workOrder,
                            statusName,
                            assignedEmployee: scheduledJob.mechanic.name,
                          });
                        }}
                      />
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-80">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
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
