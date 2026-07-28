import { Skeleton } from "@/components/ui/skeleton";

export function JobsSidebarSkeleton() {
  return (
    <div className="w-[30%] flex-shrink-0 bg-white border-l shadow-lg flex flex-col">
      <div className="p-4 border-b">
        <Skeleton className="h-5 w-28" />
        <div className="flex items-center space-x-1 mt-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-3 rounded-lg border border-l-4 border-l-gray-200"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24 mt-2" />
            <Skeleton className="h-3 w-20 mt-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkOrdersSidebarSkeleton() {
  return <JobsSidebarSkeleton />;
}
