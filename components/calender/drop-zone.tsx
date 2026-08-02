import type React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export default function DropZone({
  id,
  className,
  children,
  disabled = false,
}: {
  id: string;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled,
  });

  const isUnscheduledDropZone = id === "unscheduled-jobs";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver
          ? isUnscheduledDropZone
            ? "bg-green-50 border-green-400 border-solid"
            : "bg-blue-50 border-blue-200"
          : null,
        disabled && "cursor-not-allowed",
      )}
    >
      {children}
    </div>
  );
}
