import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { ScheduledJob } from "@/lib/database/calendar";
import type { JobCardData } from "@/components/calender/job-card-content";
import { JobCardContent } from "@/components/calender/job-card-content";
import {
  durationHoursToSlots,
  SLOTS_PER_HOUR,
  type CalendarHours,
} from "@/lib/calendar/slots";

export function ScheduledJobBlock({
  scheduledJob,
  calendarHours,
  cardData,
  onRemove,
  onViewDetails,
  onResize,
}: {
  scheduledJob: ScheduledJob;
  calendarHours: CalendarHours;
  cardData: JobCardData;
  onRemove: () => void;
  onViewDetails: () => void;
  onResize: (duration: number) => Promise<boolean>;
}) {
  const [resizeDuration, setResizeDuration] = useState<number | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: scheduledJob.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const topPosition = (scheduledJob.time_slot - calendarHours.startSlot) * 20;
  const displayedDuration = resizeDuration ?? scheduledJob.job.duration;
  const height = displayedDuration * SLOTS_PER_HOUR * 20;

  const handleResizeStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startY = event.clientY;
    const initialSlots = durationHoursToSlots(scheduledJob.job.duration);
    const maximumSlots = calendarHours.endSlot - scheduledJob.time_slot;
    let nextSlots = initialSlots;

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      const slotDelta = Math.round((pointerEvent.clientY - startY) / 20);
      nextSlots = Math.min(maximumSlots, Math.max(1, initialSlots + slotDelta));
      setResizeDuration(nextSlots / SLOTS_PER_HOUR);
    };

    const handlePointerUp = async () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);

      if (nextSlots !== initialSlots) {
        await onResize(nextSlots / SLOTS_PER_HOUR);
      }
      setResizeDuration(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        top: `${topPosition}px`,
        height: `${height}px`,
      }}
      {...listeners}
      {...attributes}
      className={`absolute left-1 right-1 overflow-hidden rounded-lg border border-blue-200 border-l-4 border-l-blue-500 bg-white p-2 cursor-move shadow-sm transition-shadow hover:shadow-md ${isDragging ? "opacity-50 z-50" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      <JobCardContent
        job={{ ...cardData, duration: displayedDuration }}
        compact
        onViewDetails={onViewDetails}
      />
      <button
        type="button"
        aria-label="Resize work order duration"
        title="Drag to change duration"
        onPointerDown={handleResizeStart}
        onClick={(event) => event.stopPropagation()}
        className="absolute inset-x-0 bottom-0 z-10 flex h-3 cursor-ns-resize touch-none items-end justify-center bg-gradient-to-t from-blue-100/80 to-transparent"
      >
        <span className="mb-0.5 h-0.5 w-8 rounded-full bg-blue-400" />
      </button>
    </div>
  );
}
