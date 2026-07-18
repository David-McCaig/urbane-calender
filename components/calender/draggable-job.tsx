import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/lib/database/calendar";

export function DraggableJob({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: job.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg border border-l-4 cursor-move hover:shadow-md transition-all border-l-blue-400 bg-blue-50 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">{job.hook_in}</div>
          <div className="text-xs text-gray-500">
            Customer {job.customer_id} • {job.duration}h
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {job.workorder_id}
        </Badge>
      </div>
    </div>
  );
}
