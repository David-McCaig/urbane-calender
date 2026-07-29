"use client";

import { useDraggable } from "@dnd-kit/core";
import { JobCardContent } from "@/components/calender/job-card-content";
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

  const hookIn = workorder.hookIn || `Work order #${workorder.workorderID}`;
  const customerName = workorder.Customer
    ? `${workorder.Customer.firstName} ${workorder.Customer.lastName}`
    : `Customer #${workorder.customerID}`;
  const customerItem =
    workorder.Serialized?.description || "Customer item unavailable";
  const statusName = statusMap[workorder.workorderStatusID] || "Unknown";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-xl border border-slate-200 border-l-4 border-l-emerald-400 bg-white p-3 cursor-move shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <JobCardContent
        job={{
          hookIn,
          customerName,
          customerItem,
          status: statusName,
          duration: 1,
        }}
      />
    </div>
  );
}
