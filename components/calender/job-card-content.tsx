import { Bike, Clock3, Eye, UserRound, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface JobCardData {
  hookIn: string;
  customerName: string;
  customerItem: string;
  status: string;
  duration: number;
}

export function JobCardContent({
  job,
  compact = false,
  onViewDetails,
}: {
  job: JobCardData;
  compact?: boolean;
  onViewDetails?: () => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-slate-900">
          <Bike className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          <p
            className={cn(
              "min-w-0 truncate font-semibold",
              compact ? "text-xs" : "text-sm",
            )}
            title={job.customerItem}
          >
            {job.customerItem}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant="secondary"
            className="h-5 max-w-[96px] truncate px-1.5 text-[10px] font-medium"
            title={job.status}
          >
            {job.status}
          </Badge>
          {onViewDetails && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-full p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                compact ? "h-6 w-6" : "h-7 w-7",
              )}
              aria-label="View work order details"
              title="View details"
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onViewDetails();
              }}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <div className={cn("mt-1.5 space-y-1", compact && "mt-1 space-y-0.5")}>
        <div className="flex min-w-0 items-center gap-1.5 text-slate-600">
          <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate text-xs" title={job.customerName}>
            {job.customerName}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-slate-500">
          <Wrench className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate text-xs" title={job.hookIn}>
            {job.hookIn}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-600">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {job.duration}h
          </span>
        </div>
      </div>
    </div>
  );
}
