"use client";

import type React from "react";

import {
  Plus,
  X,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface Job {
  workorderID: string;
  timeIn: string;
  etaOut: string;
  customerID: string;
  hookIn: string;
  shopID: string;
  workorderStatusID: string;
  saleID: string;
  saleLineID: string;
  duration?: number;
  mechanicIndex?: number;
  timeSlot?: number;
}

interface ScheduledJob extends Job {
  mechanicIndex: number;
  timeSlot: number;
}

const mechanics = [
  { name: "Em Kieffer", avatar: "EK", specialty: "Service Writer" },
  { name: "Rory Hiles", avatar: "RH", specialty: "Service Writer" },
  { name: "Nestor Czernysz", avatar: "NC", specialty: "Mechanic" },
  { name: "Silum Zhang", avatar: "SZ", specialty: "Mechanic" },
  { name: "Sasha Fabrikant", avatar: "SF", specialty: "Service Lead" },
];

export default function Calender() {
  const [showJobForm, setShowJobForm] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([
    {
      workorderID: "1",
      timeIn: "2021-10-25T15:11:28+00:00",
      etaOut: "2021-10-25T16:11:28+00:00",
      customerID: "2",
      hookIn: "Oil Change",
      shopID: "1",
      workorderStatusID: "5",
      saleID: "0",
      saleLineID: "138",
      duration: 1,
    },
    {
      workorderID: "2",
      timeIn: "2021-10-25T14:00:00+00:00",
      etaOut: "2021-10-25T16:00:00+00:00",
      customerID: "3",
      hookIn: "Brake Repair",
      shopID: "1",
      workorderStatusID: "5",
      saleID: "0",
      saleLineID: "139",
      duration: 1,
    },
    {
      workorderID: "3",
      timeIn: "2021-10-25T13:30:00+00:00",
      etaOut: "2021-10-25T15:00:00+00:00",
      customerID: "4",
      hookIn: "Engine Diagnostic",
      shopID: "1",
      workorderStatusID: "5",
      saleID: "0",
      saleLineID: "140",
      duration: 1,
    },
  ]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([
    {
      workorderID: "100",
      timeIn: "2021-10-25T10:00:00+00:00",
      etaOut: "2021-10-25T13:00:00+00:00",
      customerID: "5",
      hookIn: "Transmission Service",
      shopID: "1",
      workorderStatusID: "5",
      saleID: "0",
      saleLineID: "141",
      duration: 1,
      mechanicIndex: 1,
      timeSlot: 1,
    },
  ]);


  const addJob = (jobData: Omit<Job, 'workorderID'>) => {
    const newJob = {
      workorderID: Date.now().toString(),
      duration: 1, // Default to 1 hour
      ...jobData,
    };
    setJobs([...jobs, newJob]);
    setShowJobForm(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const unscheduledJob = jobs.find((j) => j.workorderID === event.active.id);
    const scheduledJob = scheduledJobs.find(
      (j) => j.workorderID === event.active.id
    );
    setActiveJob(unscheduledJob || scheduledJob || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) return;

    const jobId = active.id as string;
    const unscheduledJob = jobs.find((j) => j.workorderID === jobId);
    const scheduledJob = scheduledJobs.find((j) => j.workorderID === jobId);
    const job = unscheduledJob || scheduledJob;

    if (!job) return;

    const dropZoneId = over.id as string;
    
    // Handle dropping back to unscheduled jobs
    if (dropZoneId === "unscheduled-jobs") {
      if (scheduledJob) {
        // Remove from scheduled jobs
        setScheduledJobs(scheduledJobs.filter((j) => j.workorderID !== jobId));
        
        // Add back to unscheduled jobs (remove scheduling properties)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { mechanicIndex, timeSlot, ...unscheduledJobData } = scheduledJob;
        setJobs([...jobs, unscheduledJobData]);
      }
      return;
    }

    // Handle dropping to schedule slots
    if (!dropZoneId.startsWith("slot-")) return;

    const [, mechanicIndex, timeSlot] = dropZoneId.split("-").map(Number);

    const otherScheduledJobs = scheduledJobs.filter((j) => j.workorderID !== jobId);
    const conflicts = getSchedulingConflicts(
      job,
      mechanicIndex,
      timeSlot,
      otherScheduledJobs
    );

    if (conflicts.length > 0) {
      alert(`Cannot schedule job: ${conflicts.join(", ")}`);
      return;
    }

    if (unscheduledJob) {
      setJobs(jobs.filter((j) => j.workorderID !== jobId));
    } else if (scheduledJob) {
      setScheduledJobs(scheduledJobs.filter((j) => j.workorderID !== jobId));
    }

    const newScheduledJob: ScheduledJob = {
      ...job,
      mechanicIndex,
      timeSlot,
    };
    setScheduledJobs([...otherScheduledJobs, newScheduledJob]);
  };

  const removeScheduledJob = (jobId: string) => {
    const scheduledJob = scheduledJobs.find((j) => j.workorderID === jobId);
    if (!scheduledJob) return;

    setScheduledJobs(scheduledJobs.filter((j) => j.workorderID !== jobId));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { mechanicIndex, timeSlot, ...job } = scheduledJob;
    setJobs([...jobs, job]);
  };

  const getSchedulingConflicts = (
    job: Job,
    mechanicIndex: number,
    timeSlot: number,
    existingJobs: ScheduledJob[]
  ): string[] => {
    const conflicts: string[] = [];
    const jobEndTime = timeSlot + (job.duration || 1) * 4;

    if (jobEndTime > 32) {
      conflicts.push("Job extends beyond work hours (6 PM)");
    }

    const overlappingJobs = existingJobs.filter((existingJob) => {
      if (existingJob.mechanicIndex !== mechanicIndex) return false;

      const existingStart = existingJob.timeSlot;
      const existingEnd = existingJob.timeSlot + (existingJob.duration || 1) * 4;

      return timeSlot < existingEnd && jobEndTime > existingStart;
    });

    if (overlappingJobs.length > 0) {
      conflicts.push(`Time slot conflicts with ${overlappingJobs[0].hookIn}`);
    }

    return conflicts;
  };

  const getMechanicWorkload = (
    mechanicIndex: number
  ): { hours: number; jobs: number } => {
    const mechanicJobs = scheduledJobs.filter(
      (job) => job.mechanicIndex === mechanicIndex
    );
    const totalHours = mechanicJobs.reduce((sum, job) => sum + (job.duration || 1), 0);
    return { hours: totalHours, jobs: mechanicJobs.length };
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    // Sort by workorderID for consistent ordering
    return a.workorderID.localeCompare(b.workorderID);
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setShowDatePicker(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scrollMechanics = (direction: 'left' | 'right') => {
    const scrollContainer = document.querySelector('.mechanics-scroll-container') as HTMLElement;
    if (scrollContainer) {
      const scrollAmount = 200; // pixels to scroll
      scrollContainer.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Main Content */}
        <div className="flex-1">
          {/* Main Content */}
          <main className="p-6">
            {/* Date and Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {currentDate.toDateString() === new Date().toDateString() ? 'TODAY' : 'SCHEDULE'}
                </h1>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigateDate('prev')}
                    className="hover:bg-gray-100"
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="min-w-[200px] justify-start text-left hover:bg-gray-50"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {formatDate(currentDate)}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigateDate('next')}
                    className="hover:bg-gray-100"
                  >
                    →
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={goToToday}
                    className="ml-2 text-xs hover:bg-blue-50 hover:text-blue-700"
                  >
                    Today
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 bg-transparent"
                >
                  <span>FILTERS</span>
                </Button>
                <div className="flex bg-white border rounded-lg">
                  <Button
                    variant="default"
                    className="bg-slate-800 text-white hover:bg-slate-700"
                  >
                    DAY
                  </Button>
                  <Button variant="ghost" className="text-gray-600">
                    WEEK
                  </Button>
                </div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-4">
              {mechanics.map((mechanic, index) => {
                const workload = getMechanicWorkload(index);
                return (
                  <div key={index} className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {mechanic.name.split(" ")[0]}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {workload.hours}h
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {workload.jobs} jobs
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scheduler Grid */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden relative">
              {/* Scroll Indicators */}
              {canScrollLeft && (
                <button
                  onClick={() => scrollMechanics('left')}
                  className="absolute left-20 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
              )}
              {canScrollRight && (
                <button
                  onClick={() => scrollMechanics('right')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              )}

              {/* Header Row */}
              <div className="flex border-b">
                {/* Time column header - fixed width */}
                <div className="w-20 p-4 bg-gray-50 border-r flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">
                    TIME
                  </span>
                </div>

                {/* Mechanic columns - scrollable */}
                <div 
                  className="flex overflow-x-auto scrollbar-hide mechanics-scroll-container"
                  onScroll={handleScroll}
                >
                  {mechanics.map((mechanic, index) => (
                    <div
                      key={index}
                      className="w-48 p-4 bg-gray-50 border-r last:border-r-0 flex-shrink-0"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          {/* <AvatarImage src={`/mechanic-${index + 1}.jpg`} /> */}
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                            {mechanic.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {mechanic.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {mechanic.specialty}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Row */}
              <div className="flex">
                {/* Time slots column - fixed width */}
                <div className="w-20 border-r bg-gray-50/50 flex-shrink-0">
                  {Array.from({ length: 32 }, (_, index) => {
                    const totalMinutes = 10 * 60 + index * 15; // Start at 10 AM, add 15 minutes per slot
                    const hour = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;

                    const showLabel = minutes === 0 || minutes === 30;

                    let timeLabel = "";
                    if (showLabel) {
                      const displayHour =
                        hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                      const period = hour >= 12 ? "PM" : "AM";
                      timeLabel = `${displayHour}${
                        minutes === 30 ? ":30" : ""
                      } ${period}`;
                    }

                    return (
                      <div
                        key={index}
                        className="h-5 border-b border-gray-100 flex items-center justify-center"
                      >
                        {showLabel && (
                          <span className="text-xs font-medium text-gray-600">
                            {timeLabel}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Mechanic schedule columns - scrollable */}
                <div 
                  className="flex overflow-x-auto scrollbar-hide mechanics-scroll-container"
                  onScroll={handleScroll}
                >
                  {mechanics.map((_, mechanicIndex) => (
                    <div
                      key={mechanicIndex}
                      className="w-48 border-r last:border-r-0 relative flex-shrink-0"
                    >
                      {Array.from({ length: 32 }, (_, timeIndex) => (
                        <DropZone
                          key={timeIndex}
                          id={`slot-${mechanicIndex}-${timeIndex}`}
                          className="h-5 border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors relative"
                        />
                      ))}

                      {scheduledJobs
                        .filter((job) => job.mechanicIndex === mechanicIndex)
                        .map((job) => (
                          <ScheduledJobBlock
                            key={job.workorderID}
                            job={job}
                            onRemove={() => removeScheduledJob(job.workorderID)}
                          />
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>

        <div className="w-80 bg-white border-l shadow-lg flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
              <Button
                onClick={() => setShowJobForm(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </Button>
            </div>
          </div>

          {/* Unscheduled Jobs */}
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
                    <DraggableJob key={job.workorderID} job={job} />
                  ))}
                </div>
              )}
            </DropZone>
          </div>
        </div>

        {showJobForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Add New Job
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowJobForm(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <JobEntryForm onSubmit={addJob} />
              </div>
            </div>
          </div>
        )}

        <DragOverlay>
          {activeJob ? (
            <div className="p-3 bg-blue-100 border-2 border-blue-300 rounded-lg shadow-lg">
              <div className="font-medium text-sm text-blue-900">
                {activeJob.hookIn}
              </div>
              <div className="text-xs text-blue-700">
                Customer {activeJob.customerID} • {activeJob.duration || 1}h
              </div>
            </div>
          ) : null}
        </DragOverlay>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-80">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Select Date</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDatePicker(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <DatePicker
                selectedDate={currentDate}
                onDateSelect={handleDateSelect}
              />
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}

function DraggableJob({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: job.workorderID,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const getJobColor = () => {
    return "border-l-blue-400 bg-blue-50";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg border border-l-4 cursor-move hover:shadow-md transition-all ${getJobColor()} ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">{job.hookIn}</div>
          <div className="text-xs text-gray-500">
            Customer {job.customerID} • {job.duration || 1}h
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          WO-{job.workorderID}
        </Badge>
      </div>
    </div>
  );
}

function DropZone({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  const isUnscheduledDropZone = id === "unscheduled-jobs";

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${
        isOver 
          ? isUnscheduledDropZone 
            ? "bg-green-50 border-green-400 border-solid" 
            : "bg-blue-50 border-blue-200"
          : ""
      }`}
    >
      {children}
    </div>
  );
}

function ScheduledJobBlock({
  job,
  onRemove,
}: {
  job: ScheduledJob;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: job.workorderID,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const getJobColor = () => {
    return "bg-blue-100 border-blue-300 text-blue-800";
  };

  const topPosition = job.timeSlot * 20; // 20px per time slot (h-5 = 20px)
  const height = (job.duration || 1) * 4 * 20; // duration * 4 slots per hour * 20px per slot

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        top: `${topPosition}px`,
        height: `${height}px`,
      }}
      {...listeners}
      {...attributes}
      className={`absolute left-1 right-1 rounded-md border-2 p-2 cursor-move hover:shadow-md transition-shadow ${getJobColor()} ${isDragging ? "opacity-50 z-50" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      <div className="text-xs font-medium truncate">{job.hookIn}</div>
      <div className="text-xs opacity-75 truncate">Customer {job.customerID}</div>
      <div className="text-xs opacity-75">{job.duration || 1}h</div>
      <Badge variant="secondary" className="text-xs mt-1">
        WO-{job.workorderID}
      </Badge>
      <div className="absolute top-1 right-1 text-xs opacity-50">⋮⋮</div>
    </div>
  );
}

function JobEntryForm({ onSubmit }: { onSubmit: (data: Omit<Job, 'workorderID'>) => void }) {
  const [formData, setFormData] = useState({
    timeIn: new Date().toISOString(),
    etaOut: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    customerID: "",
    hookIn: "",
    shopID: "1",
    workorderStatusID: "5",
    saleID: "0",
    saleLineID: "",
    duration: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      timeIn: new Date().toISOString(),
      etaOut: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      customerID: "",
      hookIn: "",
      shopID: "1",
      workorderStatusID: "5",
      saleID: "0",
      saleLineID: "",
      duration: 1,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="hookIn">Job Description</Label>
        <Input
          id="hookIn"
          value={formData.hookIn}
          onChange={(e) => setFormData({ ...formData, hookIn: e.target.value })}
          placeholder="e.g., Oil Change, Brake Repair"
          required
        />
      </div>

      <div>
        <Label htmlFor="customerID">Customer ID</Label>
        <Input
          id="customerID"
          value={formData.customerID}
          onChange={(e) =>
            setFormData({ ...formData, customerID: e.target.value })
          }
          placeholder="Customer ID"
          required
        />
      </div>

      <div>
        <Label htmlFor="saleLineID">Sale Line ID</Label>
        <Input
          id="saleLineID"
          value={formData.saleLineID}
          onChange={(e) =>
            setFormData({ ...formData, saleLineID: e.target.value })
          }
          placeholder="Sale Line ID"
          required
        />
      </div>

      <div>
        <Label htmlFor="timeIn">Time In</Label>
        <Input
          id="timeIn"
          type="datetime-local"
          value={formData.timeIn.slice(0, 16)}
          onChange={(e) =>
            setFormData({ ...formData, timeIn: new Date(e.target.value).toISOString() })
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="etaOut">ETA Out</Label>
        <Input
          id="etaOut"
          type="datetime-local"
          value={formData.etaOut.slice(0, 16)}
          onChange={(e) =>
            setFormData({ ...formData, etaOut: new Date(e.target.value).toISOString() })
          }
          required
        />
      </div>

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
        Add Work Order
      </Button>
    </form>
  );
}

function DatePicker({ 
  selectedDate, 
  onDateSelect 
}: { 
  selectedDate: Date; 
  onDateSelect: (date: Date) => void; 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="w-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('prev')}
        >
          ←
        </Button>
        <h3 className="text-lg font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('next')}
        >
          →
        </Button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="p-2" />;
          }

          return (
            <Button
              key={date.toISOString()}
              variant={isSelected(date) ? "default" : "ghost"}
              size="sm"
              onClick={() => onDateSelect(date)}
              className={`h-8 w-8 p-0 text-sm ${
                isToday(date) && !isSelected(date)
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : ""
              }`}
            >
              {date.getDate()}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
