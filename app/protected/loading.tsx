import { CalendarGridSkeleton } from "@/components/calender/calendar-grid-skeleton";
import { JobsSidebarSkeleton } from "@/components/calender/jobs-sidebar-skeleton";

export default function ProtectedLoading() {
  return (
    <div className="flex min-h-screen bg-[#f5f3ef]">
      <div className="w-[70%] flex-shrink-0">
        <main className="p-6">
          <CalendarGridSkeleton />
        </main>
      </div>
      <JobsSidebarSkeleton />
    </div>
  );
}
