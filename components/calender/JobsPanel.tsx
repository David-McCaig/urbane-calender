"use client";

import { useState, useMemo } from "react";
import { Search, CalendarIcon, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { DraggableWorkOrder } from "./draggable-work-order";
import { DatePicker } from "./date-picker";
import DropZone from "./drop-zone";
import type { LightspeedWorkOrder, WorkOrderStatusMap } from "@/lib/lightspeed/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface JobsPanelProps {
  workOrders: LightspeedWorkOrder[];
  workOrderStatusMap: WorkOrderStatusMap;
  loadingWorkOrders: boolean;
  currentDate: Date;
  onNavigateDate: (direction: "prev" | "next") => void;
  onGoToToday: () => void;
  onDateSelect: (date: Date) => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JobsPanel({
  workOrders,
  workOrderStatusMap,
  loadingWorkOrders,
  currentDate,
  onNavigateDate,
  onGoToToday,
  onDateSelect,
}: JobsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInlineDatePicker, setShowInlineDatePicker] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  // Hardcoded category display order. Categories not in this list appear after, sorted alphabetically.
const CATEGORY_ORDER: string[] = [
  "Appointment",
  "Assessment",
  "Open",
  "Assemble For Sale",
  "Test Request",
  "WFA",
  "WFP",
  "Waiting",
  "Estimate",
  "BFF",
];

function sortCategories(categories: string[]): string[] {
  const known = CATEGORY_ORDER.filter((c) => categories.includes(c));
  const unknown = categories
    .filter((c) => !CATEGORY_ORDER.includes(c))
    .sort();
  return [...known, ...unknown];
}

// Derive categories from Lightspeed status names + any status IDs found in data
const effectiveCategories = useMemo(() => {
  const fromMap = Object.values(workOrderStatusMap);
  const fromData = workOrders.map(
    (wo) => workOrderStatusMap[wo.workorderStatusID] || "Unknown"
  );
  return sortCategories([...new Set([...fromMap, ...fromData])]);
}, [workOrderStatusMap, workOrders]);

  // Group work orders by status name
  const grouped = useMemo(() => {
    const map: Record<string, LightspeedWorkOrder[]> = {};
    for (const cat of effectiveCategories) {
      map[cat] = [];
    }
    // Ensure "Unknown" bucket exists even if no data yet
    if (!map["Unknown"]) map["Unknown"] = [];
    for (const wo of workOrders) {
      const statusName = workOrderStatusMap[wo.workorderStatusID] || "Unknown";
      if (!map[statusName]) map[statusName] = [];
      map[statusName].push(wo);
    }
    return map;
  }, [workOrders, workOrderStatusMap, effectiveCategories]);

  // Search filtering
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return { grouped, hasMatches: true };

    const q = searchQuery.toLowerCase();
    const result: Record<string, LightspeedWorkOrder[]> = {};
    let hasMatches = false;

    for (const cat of effectiveCategories) {
      const items = (grouped[cat] || []).filter((wo) => {
        const desc = (wo.hookIn || "").toLowerCase();
        const woId = String(wo.workorderID).toLowerCase();
        const cust = wo.Customer
          ? `${wo.Customer.firstName} ${wo.Customer.lastName}`.toLowerCase()
          : `customer #${wo.customerID}`.toLowerCase();
        const status = (
          workOrderStatusMap[wo.workorderStatusID] || "Unknown"
        ).toLowerCase();
        return (
          desc.includes(q) ||
          woId.includes(q) ||
          cust.includes(q) ||
          status.includes(q)
        );
      });
      result[cat] = items;
      if (items.length > 0) hasMatches = true;
    }

    return { grouped: result, hasMatches };
  }, [searchQuery, grouped, effectiveCategories, workOrderStatusMap]);

  // Categories start closed. Searching auto-expands matching categories below.

  // When searching, auto-expand only categories with matches
  const displayOpenCategories = useMemo(() => {
    if (!searchQuery.trim()) return openCategories;
    return effectiveCategories.filter(
      (cat) => (filtered.grouped[cat] || []).length > 0
    );
  }, [searchQuery, openCategories, effectiveCategories, filtered]);

  const isToday =
    currentDate.toDateString() === new Date().toDateString();

  const isLoading = loadingWorkOrders && workOrders.length === 0;

  return (
    <div className="w-[30%] flex-shrink-0 bg-white border-l shadow-lg flex flex-col h-full pt-6">
      {/* Header */}
      <div className="px-4 pb-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Work Orders</h2>
          <Badge variant="outline">{workOrders.length}</Badge>
        </div>

        {/* Date navigation */}
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateDate("prev")}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInlineDatePicker(!showInlineDatePicker)}
            className="flex-1 justify-start text-left h-8 px-2 text-xs"
          >
            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            <span className="truncate">{formatDate(currentDate)}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateDate("next")}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToToday}
              className="h-8 text-xs hover:bg-blue-50 hover:text-blue-700"
            >
              Today
            </Button>
          )}
        </div>

        {/* Inline date picker */}
        {showInlineDatePicker && (
          <div className="p-3 bg-white border rounded-lg shadow-sm">
            <DatePicker
              selectedDate={currentDate}
              onDateSelect={(date) => {
                onDateSelect(date);
                setShowInlineDatePicker(false);
              }}
            />
          </div>
        )}

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search work orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading skeleton (first load only — no cached data) */}
        {isLoading ? (
          <div className="p-4 space-y-2">
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
        ) : workOrders.length === 0 ? (
          /* No work orders at all */
          <div className="p-8 text-center text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No work orders for this date</p>
            <p className="text-xs text-gray-400 mt-1">
              Try selecting a different date
            </p>
          </div>
        ) : searchQuery.trim() && !filtered.hasMatches ? (
          /* Search with no matches */
          <div className="p-8 text-center text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No jobs match &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          /* Accordion with grouped work orders */
          <Accordion
            type="multiple"
            value={displayOpenCategories}
            onValueChange={(vals) => {
              // Only persist manual toggles when not searching
              if (!searchQuery.trim()) setOpenCategories(vals);
            }}
            className="px-2"
          >
            {effectiveCategories.map((category) => {
              const jobs = filtered.grouped[category] || [];
              // Hide empty categories — always when searching, also when not searching
              if (jobs.length === 0) return null;

              return (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="px-2 text-sm font-semibold text-gray-700 hover:no-underline">
                    <span className="flex items-center gap-2">
                      {category}
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0 h-5"
                      >
                        {jobs.length}
                      </Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {jobs.length === 0 ? (
                      <p className="text-xs text-gray-400 px-2 py-2 italic">
                        No work orders in this category
                      </p>
                    ) : (
                      <div className="space-y-1.5 px-1">
                        {jobs.map((wo) => (
                          <DraggableWorkOrder
                            key={wo.workorderID}
                            workorder={wo}
                            statusMap={workOrderStatusMap}
                          />
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Drop zone for unscheduling — hidden while searching */}
        {!searchQuery.trim() && workOrders.length > 0 && !isLoading && (
          <div className="px-4 py-3">
            <DropZone
              id="unscheduled-jobs"
              className="min-h-[80px] border-2 border-dashed border-gray-200 rounded-lg p-3 transition-colors hover:border-gray-300"
            >
              <p className="text-xs text-gray-400 text-center">
                Drag scheduled jobs here to unschedule
              </p>
            </DropZone>
          </div>
        )}
      </div>
    </div>
  );
}
