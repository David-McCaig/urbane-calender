"use client";

import { useMemo } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DropZone from "./drop-zone";
import { DraggableJob } from "./draggable-job";
import { JobsSidebarSkeleton } from "./jobs-sidebar-skeleton";
import type { Job } from "@/lib/database/calendar";

interface JobsSidebarProps {
  jobs: Job[];
  loadingJobs: boolean;
  onShowJobForm: () => void;
}

export function JobsSidebar({
  jobs,
  loadingJobs,
  onShowJobForm,
}: JobsSidebarProps) {
  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) =>
        a.workorder_id.localeCompare(b.workorder_id)
      ),
    [jobs]
  );

  if (loadingJobs) {
    return <JobsSidebarSkeleton />;
  }

  return (
    <div className="w-[30%] flex-shrink-0 bg-white border-l shadow-lg flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
          <Button
            onClick={onShowJobForm}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">
            Unscheduled Jobs
          </h3>
          <Badge variant="outline">{jobs.length}</Badge>
        </div>

        <DropZone
          id="unscheduled-jobs"
          className="min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-4 transition-colors"
        >
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No unscheduled jobs</p>
              <p className="text-xs text-gray-400 mt-1">
                Click &quot;Add&quot; to create a new job
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Or drag scheduled jobs here to unschedule them
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedJobs.map((job) => (
                <DraggableJob key={job.id} job={job} />
              ))}
            </div>
          )}
        </DropZone>
      </div>
    </div>
  );
}
