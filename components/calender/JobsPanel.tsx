"use client";

import { useState, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  Search,
  CalendarIcon,
  CalendarMinus,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { getStatusPalette } from "./status-colors";
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
  isDraggingScheduledJob: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Hardcoded category display order. Categories not in this list appear after,
// sorted alphabetically.
const CATEGORY_ORDER: string[] = [
  "Appointment",
  "Assessment",
  "TODAY'S REPAIRS",
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
  const known = CATEGORY_ORDER.filter((category) =>
    categories.includes(category)
  );
  const unknown = categories
    .filter((category) => !CATEGORY_ORDER.includes(category))
    .sort();
  return [...known, ...unknown];
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
  isDraggingScheduledJob,
}: JobsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInlineDatePicker, setShowInlineDatePicker] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const { isOver, setNodeRef } = useDroppable({
    id: "unscheduled-jobs",
    disabled: !isDraggingScheduledJob,
  });

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
        const customerItem = (wo.Serialized?.description || "").toLowerCase();
        const woId = String(wo.workorderID).toLowerCase();
        const cust = wo.Customer
          ? `${wo.Customer.firstName} ${wo.Customer.lastName}`.toLowerCase()
          : `customer #${wo.customerID}`.toLowerCase();
        const status = (
          workOrderStatusMap[wo.workorderStatusID] || "Unknown"
        ).toLowerCase();
        return (
          desc.includes(q) ||
          customerItem.includes(q) ||
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
    <div
      ref={setNodeRef}
      className="relative flex h-full w-[30%] flex-shrink-0 flex-col overflow-hidden border-l border-[#d9dce6] bg-[#fafbfc] pt-5"
    >
      {isOver && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[#f7e7ed]/90 p-5 backdrop-blur-[1px]">
          <div className="w-full max-w-[240px] rounded-2xl bg-white/95 p-6 text-center shadow-xl shadow-blue-950/10">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f9e5d6]">
              <CalendarMinus className="h-6 w-6 text-[#a75f56]" />
            </div>
            <p className="text-base font-semibold text-slate-900">
              Drop to unschedule
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="space-y-3 border-b border-[#d9dce6] bg-white px-4 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#242426]">Work Orders</h2>
          <Badge variant="outline" className="rounded-full border-[#d9dce6] bg-[#f4f5f7]">{workOrders.length}</Badge>
        </div>

        {/* Date navigation */}
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateDate("prev")}
            className="h-8 w-8 border-[#d9dce6] bg-[#f1f2f6] p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInlineDatePicker(!showInlineDatePicker)}
            className="h-8 flex-1 justify-start border-[#d9dce6] px-2 text-left text-xs"
          >
            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            <span className="truncate">{formatDate(currentDate)}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateDate("next")}
            className="h-8 w-8 border-[#d9dce6] bg-[#f1f2f6] p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToToday}
              className="h-8 border-[#d9dce6] text-xs hover:bg-[#f6f7f9]"
            >
              Today
            </Button>
          )}
        </div>

        {/* Inline date picker */}
        {showInlineDatePicker && (
          <div className="rounded-2xl border border-[#e9e2d3] bg-[#fffdf8] p-3 shadow-sm">
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
            className="h-9 border-[#d9dce6] bg-[#f8f9fb] pl-8 text-sm focus-visible:ring-[#777b95]"
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
              const palette = getStatusPalette(category);
              // Hide empty categories — always when searching, also when not searching
              if (jobs.length === 0) return null;

              return (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="px-2 text-sm font-semibold text-[#30334f] hover:no-underline">
                    <span className="flex items-center gap-2">
                      <span className={`size-2.5 rounded-full ${palette.dot}`} />
                      {category}
                      <Badge
                        variant="secondary"
                        className={`h-5 rounded-full px-1.5 py-0 text-xs ${palette.badge}`}
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

      </div>
    </div>
  );
}
