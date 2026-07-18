import type React from "react";
import { useDroppable } from "@dnd-kit/core";

export default function DropZone({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  const isUnscheduledDropZone = id === "unscheduled-jobs";

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${
        isOver
          ? isUnscheduledDropZone
            ? "bg-green-50 border-green-400 border-solid"
            : "bg-blue-50 border-blue-200"
          : ""
      }`}
    >
      {children}
    </div>
  );
}
