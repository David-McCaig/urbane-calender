import { useDraggable } from "@dnd-kit/core";
import type { ScheduledJob } from "@/lib/database/calendar";
import type { JobCardData } from "@/components/calender/job-card-content";
import { JobCardContent } from "@/components/calender/job-card-content";
import { getStatusPalette } from "./status-colors";
import { cn } from "@/lib/utils";

export function ScheduledJobBlock({
  scheduledJob,
  cardData,
  onRemove,
}: {
  scheduledJob: ScheduledJob;
  cardData: JobCardData;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: scheduledJob.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const topPosition = scheduledJob.time_slot * 20;
  const height = scheduledJob.job.duration * 4 * 20;
  const palette = getStatusPalette(cardData.status);

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
      className={cn(
        "absolute left-1 right-1 cursor-move overflow-hidden rounded-sm border border-l-4 p-2 shadow-sm transition-all hover:saturate-[1.35] hover:shadow-md",
        palette.card,
        palette.accent,
        isDragging && "z-50 opacity-50",
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      <JobCardContent job={cardData} compact />
    </div>
  );
}
