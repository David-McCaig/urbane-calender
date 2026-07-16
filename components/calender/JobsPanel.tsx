"use client";

import { useState, useMemo } from "react";
import { Search, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useDraggable } from "@dnd-kit/core";
import type { Job } from "@/lib/database/calendar";

// ---------------------------------------------------------------------------
// Hardcoded prototype jobs — organised by category
// ---------------------------------------------------------------------------

export type JobCategory =
  | "Open"
  | "Appointment"
  | "Todays Repairs"
  | "BFF"
  | "AFS"
  | "Test Request";

export interface HardcodedJob extends Job {
  category: JobCategory;
}

const CATEGORIES: JobCategory[] = [
  "Open",
  "Appointment",
  "Todays Repairs",
  "BFF",
  "AFS",
  "Test Request",
];

const MOCK_SHOP_ID = "b0000000-0000-4000-8000-000000000001";

const NOW = "2026-07-15T08:00:00Z";

export const HARDCODED_JOBS: HardcodedJob[] = [
  // ---- Open ----
  {
    id: "e0000000-0000-4000-8000-000000000001",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-200",
    time_in: "2026-07-15T08:00:00Z",
    eta_out: "2026-07-15T12:00:00Z",
    customer_id: "CUST-101",
    hook_in: "Full suspension service",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "SL-200",
    duration: 3,
    category: "Open",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "e0000000-0000-4000-8000-000000000002",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-201",
    time_in: "2026-07-15T08:30:00Z",
    eta_out: "2026-07-15T10:30:00Z",
    customer_id: "CUST-102",
    hook_in: "Brake bleed & pad replacement",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "SL-201",
    duration: 2,
    category: "Open",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "e0000000-0000-4000-8000-000000000003",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-202",
    time_in: "2026-07-15T09:00:00Z",
    eta_out: "2026-07-15T11:00:00Z",
    customer_id: "CUST-103",
    hook_in: "Drivetrain clean & tune",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "SL-202",
    duration: 1.5,
    category: "Open",
    created_at: NOW,
    updated_at: NOW,
  },

  // ---- Appointment ----
  {
    id: "e0000000-0000-4000-8000-000000000004",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-203",
    time_in: "2026-07-16T10:00:00Z",
    eta_out: "2026-07-16T14:00:00Z",
    customer_id: "CUST-104",
    hook_in: "Wheel build — carbon road",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440002",
    sale_id: "0",
    sale_line_id: "SL-203",
    duration: 4,
    category: "Appointment",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "e0000000-0000-4000-8000-000000000005",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-204",
    time_in: "2026-07-16T13:00:00Z",
    eta_out: "2026-07-16T14:00:00Z",
    customer_id: "CUST-105",
    hook_in: "Tubeless setup & sealant",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440002",
    sale_id: "0",
    sale_line_id: "SL-204",
    duration: 1,
    category: "Appointment",
    created_at: NOW,
    updated_at: NOW,
  },

  // ---- Todays Repairs ----
  {
    id: "e0000000-0000-4000-8000-000000000006",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-205",
    time_in: "2026-07-15T07:00:00Z",
    eta_out: "2026-07-15T09:00:00Z",
    customer_id: "CUST-106",
    hook_in: "Flat repair — rear tire",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440003",
    sale_id: "0",
    sale_line_id: "SL-205",
    duration: 0.5,
    category: "Todays Repairs",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "e0000000-0000-4000-8000-000000000007",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-206",
    time_in: "2026-07-15T08:00:00Z",
    eta_out: "2026-07-15T10:00:00Z",
    customer_id: "CUST-107",
    hook_in: "Gear indexing & limit adjustment",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440003",
    sale_id: "0",
    sale_line_id: "SL-206",
    duration: 1,
    category: "Todays Repairs",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "e0000000-0000-4000-8000-000000000008",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-207",
    time_in: "2026-07-15T09:00:00Z",
    eta_out: "2026-07-15T13:00:00Z",
    customer_id: "CUST-108",
    hook_in: "Fork lower-leg service",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440003",
    sale_id: "0",
    sale_line_id: "SL-207",
    duration: 2.5,
    category: "Todays Repairs",
    created_at: NOW,
    updated_at: NOW,
  },

  // ---- BFF (Brakes, Fluids, Filters) ----
  {
    id: "e0000000-0000-4000-8000-000000000009",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-208",
    time_in: "2026-07-15T08:00:00Z",
    eta_out: "2026-07-15T09:00:00Z",
    customer_id: "CUST-109",
    hook_in: "Brake fluid flush — DOT 5.1",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "SL-208",
    duration: 1,
    category: "BFF",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "e0000000-0000-4000-8000-000000000010",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-209",
    time_in: "2026-07-15T10:00:00Z",
    eta_out: "2026-07-15T11:00:00Z",
    customer_id: "CUST-110",
    hook_in: "Air filter & spark plug service",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "SL-209",
    duration: 1,
    category: "BFF",
    created_at: NOW,
    updated_at: NOW,
  },

  // ---- AFS (Alignment, Fit, Safety) ----
  {
    id: "e0000000-0000-4000-8000-000000000011",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-210",
    time_in: "2026-07-15T11:00:00Z",
    eta_out: "2026-07-15T12:30:00Z",
    customer_id: "CUST-111",
    hook_in: "Bike fit — road geometry",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "SL-210",
    duration: 1.5,
    category: "AFS",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "e0000000-0000-4000-8000-000000000012",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-211",
    time_in: "2026-07-15T13:00:00Z",
    eta_out: "2026-07-15T14:00:00Z",
    customer_id: "CUST-112",
    hook_in: "Safety check — pre-race",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "SL-211",
    duration: 0.75,
    category: "AFS",
    created_at: NOW,
    updated_at: NOW,
  },

  // ---- Test Request ----
  {
    id: "e0000000-0000-4000-8000-000000000013",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-212",
    time_in: "2026-07-15T14:00:00Z",
    eta_out: "2026-07-15T15:00:00Z",
    customer_id: "CUST-113",
    hook_in: "Diagnostic — intermittent creak",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "SL-212",
    duration: 1,
    category: "Test Request",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: "e0000000-0000-4000-8000-000000000014",
    shop_id: MOCK_SHOP_ID,
    workorder_id: "WO-213",
    time_in: "2026-07-15T15:00:00Z",
    eta_out: "2026-07-15T16:00:00Z",
    customer_id: "CUST-114",
    hook_in: "Di2 shifting diagnostic",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "SL-213",
    duration: 0.75,
    category: "Test Request",
    created_at: NOW,
    updated_at: NOW,
  },
];

// Build a lookup map for O(1) access by job id
export const HARDCODED_JOBS_MAP = new Map<string, HardcodedJob>(
  HARDCODED_JOBS.map((j) => [j.id, j])
);

// ---------------------------------------------------------------------------
// Draggable job card (mirrors the one in Calendar.tsx)
// ---------------------------------------------------------------------------

function DraggableJobCard({ job }: { job: HardcodedJob }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: job.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-start gap-2 p-3 rounded-lg border border-l-4 cursor-move hover:shadow-md transition-all border-l-blue-400 bg-blue-50 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <GripVertical className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 truncate">
          {job.hook_in}
        </div>
        <div className="text-xs text-gray-500">
          Customer {job.customer_id} • {job.duration}h
        </div>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">
        {job.workorder_id}
      </Badge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// JobsPanel component
// ---------------------------------------------------------------------------

export default function JobsPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>([
    "Todays Repairs",
  ]);

  // Group hardcoded jobs by category
  const grouped = useMemo(() => {
    const map: Record<JobCategory, HardcodedJob[]> = {
      Open: [],
      Appointment: [],
      "Todays Repairs": [],
      BFF: [],
      AFS: [],
      "Test Request": [],
    };
    for (const job of HARDCODED_JOBS) {
      map[job.category].push(job);
    }
    return map;
  }, []);

  // Filter jobs (and categories) when search is active
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return { grouped, matchingIds: null as Set<string> | null };

    const q = searchQuery.toLowerCase();
    const matchingIds = new Set<string>();
    const result: Record<JobCategory, HardcodedJob[]> = {
      Open: [],
      Appointment: [],
      "Todays Repairs": [],
      BFF: [],
      AFS: [],
      "Test Request": [],
    };

    for (const category of CATEGORIES) {
      result[category] = grouped[category].filter((job) => {
        const matches =
          job.hook_in.toLowerCase().includes(q) ||
          job.workorder_id.toLowerCase().includes(q) ||
          job.customer_id.toLowerCase().includes(q);
        if (matches) matchingIds.add(job.id);
        return matches;
      });
    }

    return { grouped: result, matchingIds };
  }, [searchQuery, grouped]);

  // When searching, auto-expand categories that have matches
  const displayOpenCategories = useMemo(() => {
    if (!searchQuery.trim()) return openCategories;
    // Auto-expand all categories that have matching jobs
    return CATEGORIES.filter(
      (cat) => filtered.grouped[cat].length > 0
    );
  }, [searchQuery, openCategories, filtered]);

  const totalJobs = HARDCODED_JOBS.length;

  return (
    <div className="w-[30%] flex-shrink-0 bg-white border-l shadow-lg flex flex-col h-full pt-6">
      {/* Header */}
      <div className="px-4 pb-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
          <Badge variant="outline">{totalJobs}</Badge>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search jobs or work orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Accordion list */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() &&
          CATEGORIES.every((cat) => filtered.grouped[cat].length === 0) ? (
          <div className="p-8 text-center text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No jobs match &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={displayOpenCategories}
            onValueChange={(vals) => {
              // Only persist manual toggles when not searching
              if (!searchQuery.trim()) setOpenCategories(vals);
            }}
            className="px-2"
          >
            {CATEGORIES.map((category) => {
              const jobs = filtered.grouped[category];
              // When searching, hide empty categories entirely
              if (searchQuery.trim() && jobs.length === 0) return null;

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
                        No jobs in this category
                      </p>
                    ) : (
                      <div className="space-y-1.5 px-1">
                        {jobs.map((job) => (
                          <DraggableJobCard key={job.id} job={job} />
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
