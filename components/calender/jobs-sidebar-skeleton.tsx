import { Skeleton } from "@/components/ui/skeleton";

export function JobsSidebarSkeleton() {
  return (
    <div className="w-[30%] flex-shrink-0 bg-white border-l shadow-lg flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <div className="min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-l-4 border-l-gray-200"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
