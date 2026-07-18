import { CalendarGridSkeleton } from "@/components/calender/calendar-grid-skeleton";
import { JobsSidebarSkeleton } from "@/components/calender/jobs-sidebar-skeleton";

export default function ProtectedLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-[70%] flex-shrink-0">
        <main className="p-6">
          <CalendarGridSkeleton />
        </main>
      </div>
      <JobsSidebarSkeleton />
    </div>
  );
}
