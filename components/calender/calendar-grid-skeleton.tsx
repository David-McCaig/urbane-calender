import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DEFAULT_CALENDAR_HOURS,
  formatSlotLabel,
  getVisibleSlots,
  MINUTES_PER_SLOT,
  type CalendarHours,
} from "@/lib/calendar/slots";

export function CalendarGridSkeleton({
  calendarHours = DEFAULT_CALENDAR_HOURS,
}: {
  calendarHours?: CalendarHours;
}) {
  const visibleSlots = getVisibleSlots(calendarHours);

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header Row */}
      <div className="flex border-b">
        <div className="w-20 p-4 bg-gray-50 border-r flex-shrink-0">
          <span className="text-sm font-medium text-gray-600">TIME</span>
        </div>
        <div className="flex-1 min-w-0 flex overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="min-w-[192px] flex-1 p-4 bg-gray-50 border-r last:border-r-0"
            >
              <div className="flex items-center space-x-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16 mt-1" />
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
                  <span className="text-xs font-medium text-gray-400">
                    {formatSlotLabel(slot)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Mechanic schedule columns */}
        <div className="flex-1 min-w-0 flex">
          {[1, 2, 3, 4].map((colIndex) => (
            <div
              key={colIndex}
              className="min-w-[192px] flex-1 border-r last:border-r-0"
            >
              {visibleSlots.map((slot) => (
                <div
                  key={slot}
                  className="h-5 border-b border-gray-100"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
