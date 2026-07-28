"use client";

import { useState } from "react";
import { CalendarIcon, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DropZone from "./drop-zone";
import { DraggableWorkOrder } from "./draggable-work-order";
import { DatePicker } from "./date-picker";
import type { LightspeedWorkOrder } from "@/lib/lightspeed/types";

interface WorkOrdersSidebarProps {
  workOrders: LightspeedWorkOrder[];
  loadingWorkOrders: boolean;
  currentDate: Date;
  onNavigateDate: (direction: "prev" | "next") => void;
  onGoToToday: () => void;
  onDateSelect: (date: Date) => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function WorkOrdersSidebar({
  workOrders,
  loadingWorkOrders,
  currentDate,
  onNavigateDate,
  onGoToToday,
  onDateSelect,
}: WorkOrdersSidebarProps) {
  const [showInlineDatePicker, setShowInlineDatePicker] = useState(false);

  const isToday =
    currentDate.toDateString() === new Date().toDateString();

  return (
    <div className="w-[30%] flex-shrink-0 bg-white border-l shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Work Orders</h2>

        {/* Date navigation */}
        <div className="flex items-center space-x-1 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateDate("prev")}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInlineDatePicker(!showInlineDatePicker)}
            className="flex-1 justify-start text-left h-8 px-2 text-xs"
          >
            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            <span className="truncate">{formatDate(currentDate)}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateDate("next")}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToToday}
              className="h-8 text-xs hover:bg-blue-50 hover:text-blue-700"
            >
              Today
            </Button>
          )}
        </div>

        {/* Inline date picker */}
        {showInlineDatePicker && (
          <div className="mt-3 p-3 bg-white border rounded-lg shadow-sm">
            <DatePicker
              selectedDate={currentDate}
              onDateSelect={(date) => {
                onDateSelect(date);
                setShowInlineDatePicker(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {loadingWorkOrders ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-3 rounded-lg border border-l-4 border-l-gray-200"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24 mt-2" />
                <Skeleton className="h-3 w-20 mt-1.5" />
              </div>
            ))}
          </div>
        ) : workOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No work orders for this date</p>
            <p className="text-xs text-gray-400 mt-1">
              Try selecting a different date
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {workOrders.map((wo) => (
              <DraggableWorkOrder key={wo.workorderID} workorder={wo} />
            ))}
          </div>
        )}

        {/* Drop zone for unscheduling — subtle, appears on hover */}
        <div className="mt-4">
          <DropZone
            id="unscheduled-jobs"
            className="min-h-[80px] border-2 border-dashed border-gray-200 rounded-lg p-3 transition-colors hover:border-gray-300"
          >
            <p className="text-xs text-gray-400 text-center">
              Drag scheduled jobs here to unschedule
            </p>
          </DropZone>
        </div>
      </div>
    </div>
  );
}

// Keep backward-compatible export for the loading skeleton in Calendar.tsx
export { WorkOrdersSidebar as JobsSidebar };
