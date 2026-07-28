"use client";

import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import type { LightspeedWorkOrder, WorkOrderStatusMap } from "@/lib/lightspeed/types";

export function DraggableWorkOrder({
  workorder,
  statusMap,
}: {
  workorder: LightspeedWorkOrder;
  statusMap: WorkOrderStatusMap;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `ls-${workorder.workorderID}`,
      data: { type: "lightspeed", workorder },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const itemDescription =
    workorder.Serialized?.description || "No item description";
  const customerName = workorder.Customer
    ? `${workorder.Customer.firstName} ${workorder.Customer.lastName}`
    : `Customer #${workorder.customerID}`;
  const statusName =
    statusMap[workorder.workorderStatusID] || "Unknown";
  const etaTime = new Date(workorder.etaOut).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg border border-l-4 cursor-move hover:shadow-md transition-all border-l-green-400 bg-green-50 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {itemDescription}
          </div>
          <div className="text-xs text-gray-500 truncate">{customerName}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            ETA {etaTime}
          </div>
        </div>
        <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">
          {statusName}
        </Badge>
      </div>
    </div>
  );
}
