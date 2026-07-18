import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import type { ScheduledJob } from "@/lib/database/calendar";

export function ScheduledJobBlock({
  scheduledJob,
  onRemove,
}: {
  scheduledJob: ScheduledJob;
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
      className={`absolute left-1 right-1 rounded-md border-2 p-2 cursor-move hover:shadow-md transition-shadow bg-blue-100 border-blue-300 text-blue-800 ${isDragging ? "opacity-50 z-50" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      <div className="text-xs font-medium truncate">{scheduledJob.job.hook_in}</div>
      <div className="text-xs opacity-75 truncate">Customer {scheduledJob.job.customer_id}</div>
      <div className="text-xs opacity-75">{scheduledJob.job.duration}h</div>
      <Badge variant="secondary" className="text-xs mt-1">
        {scheduledJob.job.workorder_id}
      </Badge>
      <div className="absolute top-1 right-1 text-xs opacity-50">⋮⋮</div>
    </div>
  );
}
