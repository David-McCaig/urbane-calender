import { useDraggable } from "@dnd-kit/core";
import type { ScheduledJob } from "@/lib/database/calendar";
import type { JobCardData } from "@/components/calender/job-card-content";
import { JobCardContent } from "@/components/calender/job-card-content";

export function ScheduledJobBlock({
  scheduledJob,
  cardData,
  onRemove,
  onViewDetails,
}: {
  scheduledJob: ScheduledJob;
  cardData: JobCardData;
  onRemove: () => void;
  onViewDetails: () => void;
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
      className={`absolute left-1 right-1 overflow-hidden rounded-lg border border-blue-200 border-l-4 border-l-blue-500 bg-white p-2 cursor-move shadow-sm transition-all hover:shadow-md ${isDragging ? "opacity-50 z-50" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      <JobCardContent
        job={cardData}
        compact
        onViewDetails={onViewDetails}
      />
    </div>
  );
}
