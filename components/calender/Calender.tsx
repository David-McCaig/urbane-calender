"use client";

import type React from "react";

import {
  Plus,
  X,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar as CalendarIcon } from "lucide-react";

interface Job {
  id: number;
  title: string;
  customer: string;
  duration: number;
  type: string;
  description: string;
  priority?: "low" | "medium" | "high";
  mechanicIndex?: number;
  timeSlot?: number;
}

interface ScheduledJob extends Job {
  mechanicIndex: number;
  timeSlot: number;
}

const mechanics = [
  { name: "Marcus Johnson", avatar: "MJ", specialty: "Engine Specialist" },
  { name: "Sarah Chen", avatar: "SC", specialty: "Transmission Expert" },
  { name: "Mike Rodriguez", avatar: "MR", specialty: "Brake & Suspension" },
  { name: "Lisa Thompson", avatar: "LT", specialty: "Electrical Systems" },
];

export default function Calender() {
  const [showJobForm, setShowJobForm] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 1,
      title: "Oil Change",
      customer: "John Smith",
      duration: 1,
      type: "maintenance",
      priority: "low",
      description: "Regular oil change and filter replacement",
    },
    {
      id: 2,
      title: "Brake Repair",
      customer: "Sarah Johnson",
      duration: 2,
      type: "repair",
      priority: "high",
      description: "Replace front brake pads and rotors",
    },
    {
      id: 3,
      title: "Engine Diagnostic",
      customer: "Mike Wilson",
      duration: 1.5,
      type: "diagnostic",
      priority: "medium",
      description: "Check engine light diagnosis",
    },
  ]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([
    {
      id: 100,
      title: "Transmission Service",
      customer: "Alice Brown",
      duration: 3,
      type: "maintenance",
      priority: "medium",
      description: "Transmission fluid change",
      mechanicIndex: 1,
      timeSlot: 1,
    },
  ]);

  const addJob = (jobData: Omit<Job, 'id'>) => {
    const newJob = {
      id: Date.now(),
      ...jobData,
    };
    setJobs([...jobs, newJob]);
    setShowJobForm(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const unscheduledJob = jobs.find((j) => j.id === Number(event.active.id));
    const scheduledJob = scheduledJobs.find(
      (j) => j.id === Number(event.active.id)
    );
    setActiveJob(unscheduledJob || scheduledJob || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) return;

    const jobId = Number(active.id);
    const unscheduledJob = jobs.find((j) => j.id === jobId);
    const scheduledJob = scheduledJobs.find((j) => j.id === jobId);
    const job = unscheduledJob || scheduledJob;

    if (!job) return;

    const dropZoneId = over.id as string;
    if (!dropZoneId.startsWith("slot-")) return;

    const [, mechanicIndex, timeSlot] = dropZoneId.split("-").map(Number);

    const otherScheduledJobs = scheduledJobs.filter((j) => j.id !== jobId);
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
      setJobs(jobs.filter((j) => j.id !== jobId));
    } else if (scheduledJob) {
      setScheduledJobs(scheduledJobs.filter((j) => j.id !== jobId));
    }

    const newScheduledJob: ScheduledJob = {
      ...job,
      mechanicIndex,
      timeSlot,
    };
    setScheduledJobs([...otherScheduledJobs, newScheduledJob]);
  };

  const removeScheduledJob = (jobId: number) => {
    const scheduledJob = scheduledJobs.find((j) => j.id === jobId);
    if (!scheduledJob) return;

    setScheduledJobs(scheduledJobs.filter((j) => j.id !== jobId));

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
    const jobEndTime = timeSlot + job.duration * 4;

    if (jobEndTime > 32) {
      conflicts.push("Job extends beyond work hours (6 PM)");
    }

    const overlappingJobs = existingJobs.filter((existingJob) => {
      if (existingJob.mechanicIndex !== mechanicIndex) return false;

      const existingStart = existingJob.timeSlot;
      const existingEnd = existingJob.timeSlot + existingJob.duration * 4;

      return timeSlot < existingEnd && jobEndTime > existingStart;
    });

    if (overlappingJobs.length > 0) {
      conflicts.push(`Time slot conflicts with ${overlappingJobs[0].title}`);
    }

    return conflicts;
  };

  const getMechanicWorkload = (
    mechanicIndex: number
  ): { hours: number; jobs: number } => {
    const mechanicJobs = scheduledJobs.filter(
      (job) => job.mechanicIndex === mechanicIndex
    );
    const totalHours = mechanicJobs.reduce((sum, job) => sum + job.duration, 0);
    return { hours: totalHours, jobs: mechanicJobs.length };
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return (
      (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
      (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
    );
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

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="grid grid-cols-5 border-b">
                {/* Time column header */}
                <div className="p-4 bg-gray-50 border-r">
                  <span className="text-sm font-medium text-gray-600">
                    TIME
                  </span>
                </div>

                {/* Mechanic columns */}
                {mechanics.map((mechanic, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 border-r last:border-r-0"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={`/mechanic-${index + 1}.jpg`} />
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

              <div className="grid grid-cols-5">
                {/* Time slots column */}
                <div className="border-r bg-gray-50/50">
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

                {/* Mechanic schedule columns */}
                {Array.from({ length: 4 }).map((_, mechanicIndex) => (
                  <div
                    key={mechanicIndex}
                    className="border-r last:border-r-0 relative"
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
                          key={job.id}
                          job={job}
                          onRemove={() => removeScheduledJob(job.id)}
                        />
                      ))}
                  </div>
                ))}
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

            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No unscheduled jobs</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click &quot;Add&quot; to create a new job
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedJobs.map((job) => (
                  <DraggableJob key={job.id} job={job} />
                ))}
              </div>
            )}
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
                {activeJob.title}
              </div>
              <div className="text-xs text-blue-700">
                {activeJob.customer} • {activeJob.duration}h
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
      id: job.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-400 bg-red-50";
      case "medium":
        return "border-l-yellow-400 bg-yellow-50";
      case "low":
        return "border-l-green-400 bg-green-50";
      default:
        return "border-l-gray-400 bg-gray-50";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg border border-l-4 cursor-move hover:shadow-md transition-all ${getPriorityColor(
        job.priority
      )} ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">{job.title}</div>
          <div className="text-xs text-gray-500">
            {job.customer} • {job.duration}h
          </div>
        </div>
        {job.priority && (
          <Badge
            variant={
              job.priority === "high"
                ? "destructive"
                : job.priority === "medium"
                ? "default"
                : "secondary"
            }
            className="text-xs"
          >
            {job.priority}
          </Badge>
        )}
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

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? "bg-blue-50 border-blue-200" : ""}`}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-blue-600 font-medium">Drop here</span>
        </div>
      )}
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
      id: job.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const getJobColor = (type: string) => {
    const colors = {
      maintenance: "bg-green-100 border-green-300 text-green-800",
      repair: "bg-red-100 border-red-300 text-red-800",
      inspection: "bg-blue-100 border-blue-300 text-blue-800",
      diagnostic: "bg-yellow-100 border-yellow-300 text-yellow-800",
      bodywork: "bg-purple-100 border-purple-300 text-purple-800",
    };
    return (
      colors[type as keyof typeof colors] ||
      "bg-gray-100 border-gray-300 text-gray-800"
    );
  };

  const topPosition = job.timeSlot * 20; // 20px per time slot (h-5 = 20px)
  const height = job.duration * 4 * 20; // duration * 4 slots per hour * 20px per slot

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
      className={`absolute left-1 right-1 rounded-md border-2 p-2 cursor-move hover:shadow-md transition-shadow ${getJobColor(
        job.type
      )} ${isDragging ? "opacity-50 z-50" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      <div className="text-xs font-medium truncate">{job.title}</div>
      <div className="text-xs opacity-75 truncate">{job.customer}</div>
      <div className="text-xs opacity-75">{job.duration}h</div>
      {job.priority && (
        <Badge
          variant={job.priority === "high" ? "destructive" : "secondary"}
          className="text-xs mt-1"
        >
          {job.priority}
        </Badge>
      )}
      <div className="absolute top-1 right-1 text-xs opacity-50">⋮⋮</div>
    </div>
  );
}

function JobEntryForm({ onSubmit }: { onSubmit: (data: Omit<Job, 'id'>) => void }) {
  const [formData, setFormData] = useState({
    title: "",
    customer: "",
    duration: "1",
    type: "",
    priority: "medium",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      duration: Number.parseFloat(formData.duration),
      priority: formData.priority as "low" | "medium" | "high",
    });
    setFormData({
      title: "",
      customer: "",
      duration: "1",
      type: "",
      priority: "medium",
      description: "",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Job Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Oil Change, Brake Repair"
          required
        />
      </div>

      <div>
        <Label htmlFor="customer">Customer Name</Label>
        <Input
          id="customer"
          value={formData.customer}
          onChange={(e) =>
            setFormData({ ...formData, customer: e.target.value })
          }
          placeholder="Customer name"
          required
        />
      </div>

      <div>
        <Label htmlFor="type">Job Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select job type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="repair">Repair</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
            <SelectItem value="diagnostic">Diagnostic</SelectItem>
            <SelectItem value="bodywork">Body Work</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) =>
            setFormData({ ...formData, priority: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="duration">Duration (hours)</Label>
        <Select
          value={formData.duration}
          onValueChange={(value) =>
            setFormData({ ...formData, duration: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.25">15 minutes</SelectItem>
            <SelectItem value="0.5">30 minutes</SelectItem>
            <SelectItem value="0.75">45 minutes</SelectItem>
            <SelectItem value="1">1 hour</SelectItem>
            <SelectItem value="1.25">1 hour 15 minutes</SelectItem>
            <SelectItem value="1.5">1 hour 30 minutes</SelectItem>
            <SelectItem value="1.75">1 hour 45 minutes</SelectItem>
            <SelectItem value="2">2 hours</SelectItem>
            <SelectItem value="3">3 hours</SelectItem>
            <SelectItem value="4">4 hours</SelectItem>
            <SelectItem value="6">6 hours</SelectItem>
            <SelectItem value="8">Full day</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Job details and notes"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
        Add Job
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
