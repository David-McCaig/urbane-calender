"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Plus,
  X,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  getJobs,
  createJob,
  deleteJob,
  getMechanics,
  getScheduledJobs,
  createScheduledJob,
  updateScheduledJob,
  deleteScheduledJob,
  subscribeToJobs,
  subscribeToScheduledJobs,
  subscribeToMechanics,
  getSchedulingConflicts,
  getMechanicWorkload,
  type Job,
  type Mechanic,
  type ScheduledJob,
} from "@/lib/database/calendar";

export default function Calendar() {
  const [showJobForm, setShowJobForm] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  
  // State for data from Supabase
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [jobsData, mechanicsData, scheduledJobsData] = await Promise.all([
          getJobs(),
          getMechanics(),
          getScheduledJobs(currentDate.toISOString().split('T')[0])
        ]);
        
        setJobs(jobsData);
        setMechanics(mechanicsData);
        setScheduledJobs(scheduledJobsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentDate]);

  // Set up real-time subscriptions
  useEffect(() => {
    const jobsSubscription = subscribeToJobs((payload) => {
      console.log('Jobs changed:', payload);
      // Reload jobs when changes occur
      getJobs().then(setJobs).catch(console.error);
    });

    const scheduledJobsSubscription = subscribeToScheduledJobs((payload) => {
      console.log('Scheduled jobs changed:', payload);
      // Reload scheduled jobs when changes occur
      getScheduledJobs(currentDate.toISOString().split('T')[0])
        .then(setScheduledJobs)
        .catch(console.error);
    });

    const mechanicsSubscription = subscribeToMechanics((payload) => {
      console.log('Mechanics changed:', payload);
      // Reload mechanics when changes occur
      getMechanics().then(setMechanics).catch(console.error);
    });

    return () => {
      jobsSubscription.unsubscribe();
      scheduledJobsSubscription.unsubscribe();
      mechanicsSubscription.unsubscribe();
    };
  }, [currentDate]);

  const addJob = async (jobData: Omit<Job, 'id' | 'shop_id' | 'created_at' | 'updated_at'>) => {
    try {
      // For now, we'll use a default shop_id. In a real app, this would come from user context
      const jobWithShop = {
        ...jobData,
        shop_id: '43f783d1-15b4-4ec5-ada0-3f25ac8e5445', // Your shop ID
      };
      
      const newJob = await createJob(jobWithShop);
      setJobs(prev => [newJob, ...prev]);
      setShowJobForm(false);
    } catch (error) {
      console.error('Error adding job:', error);
      alert('Failed to add job. Please try again.');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const unscheduledJob = jobs.find((j) => j.id === event.active.id);
    const scheduledJob = scheduledJobs.find((j) => j.id === event.active.id);
    setActiveJob(unscheduledJob || scheduledJob?.job || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) return;

    const jobId = active.id as string;
    const unscheduledJob = jobs.find((j) => j.id === jobId);
    const scheduledJob = scheduledJobs.find((j) => j.id === jobId);
    const job = unscheduledJob || scheduledJob?.job;

    if (!job) return;

    const dropZoneId = over.id as string;
    
    // Handle dropping back to unscheduled jobs
    if (dropZoneId === "unscheduled-jobs") {
      if (scheduledJob) {
        try {
          await deleteScheduledJob(scheduledJob.id);
          // The real-time subscription will update the UI
        } catch (error) {
          console.error('Error unscheduling job:', error);
          alert('Failed to unschedule job. Please try again.');
        }
      }
      return;
    }

    // Handle dropping to schedule slots
    if (!dropZoneId.startsWith("slot-")) return;

    const [, mechanicIndex, timeSlot] = dropZoneId.split("-").map(Number);

    if (mechanicIndex >= mechanics.length) {
      alert('Invalid mechanic selection');
      return;
    }

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

    try {
      // If it was an unscheduled job, schedule it
      if (unscheduledJob) {
        await createScheduledJob({
          job_id: job.id,
          shop_id: job.shop_id,
          mechanic_id: mechanics[mechanicIndex].id,
          time_slot: timeSlot,
          date: currentDate.toISOString().split('T')[0],
        });
      } else if (scheduledJob) {
        // If it was already scheduled, update the schedule
        await updateScheduledJob(scheduledJob.id, {
          mechanic_id: mechanics[mechanicIndex].id,
          time_slot: timeSlot,
        });
      }
      // The real-time subscription will update the UI
    } catch (error) {
      console.error('Error scheduling job:', error);
      alert('Failed to schedule job. Please try again.');
    }
  };

  const removeScheduledJob = async (scheduledJobId: string) => {
    try {
      await deleteScheduledJob(scheduledJobId);
      // The real-time subscription will update the UI
    } catch (error) {
      console.error('Error removing scheduled job:', error);
      alert('Failed to remove scheduled job. Please try again.');
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    return a.workorder_id.localeCompare(b.workorder_id);
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
      const scrollAmount = 200;
      scrollContainer.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

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

            {/* Mechanics Summary */}
            <div className="mb-4 grid grid-cols-4 gap-4">
              {mechanics.map((mechanic, index) => {
                const workload = getMechanicWorkload(mechanic.id, scheduledJobs);
                return (
                  <div key={mechanic.id} className="bg-white p-3 rounded-lg border">
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
                <div className="w-20 p-4 bg-gray-50 border-r flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">
                    TIME
                  </span>
                </div>

                <div 
                  className="flex overflow-x-auto scrollbar-hide mechanics-scroll-container"
                  onScroll={handleScroll}
                >
                  {mechanics.map((mechanic, index) => (
                    <div
                      key={mechanic.id}
                      className="w-48 p-4 bg-gray-50 border-r last:border-r-0 flex-shrink-0"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
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
                {/* Time slots column */}
                <div className="w-20 border-r bg-gray-50/50 flex-shrink-0">
                  {Array.from({ length: 32 }, (_, index) => {
                    const totalMinutes = 10 * 60 + index * 15;
                    const hour = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    const showLabel = minutes === 0 || minutes === 30;

                    let timeLabel = "";
                    if (showLabel) {
                      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                      const period = hour >= 12 ? "PM" : "AM";
                      timeLabel = `${displayHour}${minutes === 30 ? ":30" : ""} ${period}`;
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
                <div 
                  className="flex overflow-x-auto scrollbar-hide mechanics-scroll-container"
                  onScroll={handleScroll}
                >
                  {mechanics.map((mechanic, mechanicIndex) => (
                    <div
                      key={mechanic.id}
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
                        .filter((scheduledJob) => scheduledJob.mechanic_id === mechanic.id)
                        .map((scheduledJob) => (
                          <ScheduledJobBlock
                            key={scheduledJob.id}
                            scheduledJob={scheduledJob}
                            onRemove={() => removeScheduledJob(scheduledJob.id)}
                          />
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Jobs Sidebar */}
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
                    Click "Add" to create a new job
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

        {/* Job Form Modal */}
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
                {activeJob.hook_in}
              </div>
              <div className="text-xs text-blue-700">
                Customer {activeJob.customer_id} • {activeJob.duration}h
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3 rounded-lg border border-l-4 cursor-move hover:shadow-md transition-all border-l-blue-400 bg-blue-50 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">{job.hook_in}</div>
          <div className="text-xs text-gray-500">
            Customer {job.customer_id} • {job.duration}h
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {job.workorder_id}
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
  scheduledJob,
  onRemove,
}: {
  scheduledJob: ScheduledJob;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: scheduledJob.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const topPosition = scheduledJob.time_slot * 20;
  const height = scheduledJob.job.duration * 4 * 20;

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
      className={`absolute left-1 right-1 rounded-md border-2 p-2 cursor-move hover:shadow-md transition-shadow bg-blue-100 border-blue-300 text-blue-800 ${isDragging ? "opacity-50 z-50" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        onRemove();
      }}
    >
      <div className="text-xs font-medium truncate">{scheduledJob.job.hook_in}</div>
      <div className="text-xs opacity-75 truncate">Customer {scheduledJob.job.customer_id}</div>
      <div className="text-xs opacity-75">{scheduledJob.job.duration}h</div>
      <Badge variant="secondary" className="text-xs mt-1">
        {scheduledJob.job.workorder_id}
      </Badge>
      <div className="absolute top-1 right-1 text-xs opacity-50">⋮⋮</div>
    </div>
  );
}

function JobEntryForm({ onSubmit }: { onSubmit: (data: Omit<Job, 'id' | 'shop_id' | 'created_at' | 'updated_at'>) => void }) {
  const [formData, setFormData] = useState({
    workorder_id: "",
    time_in: new Date().toISOString(),
    eta_out: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    customer_id: "",
    hook_in: "",
    workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
    sale_id: "0",
    sale_line_id: "",
    duration: 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      workorder_id: "",
      time_in: new Date().toISOString(),
      eta_out: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      customer_id: "",
      hook_in: "",
      workorder_status_id: "550e8400-e29b-41d4-a716-446655440001",
      sale_id: "0",
      sale_line_id: "",
      duration: 1,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="workorder_id">Work Order ID</Label>
        <Input
          id="workorder_id"
          value={formData.workorder_id}
          onChange={(e) => setFormData({ ...formData, workorder_id: e.target.value })}
          placeholder="e.g., WO-001"
          required
        />
      </div>

      <div>
        <Label htmlFor="hook_in">Job Description</Label>
        <Input
          id="hook_in"
          value={formData.hook_in}
          onChange={(e) => setFormData({ ...formData, hook_in: e.target.value })}
          placeholder="e.g., Oil Change, Brake Repair"
          required
        />
      </div>

      <div>
        <Label htmlFor="customer_id">Customer ID</Label>
        <Input
          id="customer_id"
          value={formData.customer_id}
          onChange={(e) =>
            setFormData({ ...formData, customer_id: e.target.value })
          }
          placeholder="Customer ID"
          required
        />
      </div>

      <div>
        <Label htmlFor="sale_line_id">Sale Line ID</Label>
        <Input
          id="sale_line_id"
          value={formData.sale_line_id}
          onChange={(e) =>
            setFormData({ ...formData, sale_line_id: e.target.value })
          }
          placeholder="Sale Line ID"
          required
        />
      </div>

      <div>
        <Label htmlFor="time_in">Time In</Label>
        <Input
          id="time_in"
          type="datetime-local"
          value={formData.time_in.slice(0, 16)}
          onChange={(e) =>
            setFormData({ ...formData, time_in: new Date(e.target.value).toISOString() })
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="eta_out">ETA Out</Label>
        <Input
          id="eta_out"
          type="datetime-local"
          value={formData.eta_out.slice(0, 16)}
          onChange={(e) =>
            setFormData({ ...formData, eta_out: new Date(e.target.value).toISOString() })
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="duration">Duration (hours)</Label>
        <Input
          id="duration"
          type="number"
          min="1"
          max="8"
          value={formData.duration}
          onChange={(e) =>
            setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })
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
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
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

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
      </div>

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
