import { createClient } from '@/lib/supabase/client';

export interface Job {
  id: string;
  shop_id: string;
  workorder_id: string;
  time_in: string;
  eta_out: string;
  customer_id: string;
  hook_in: string;
  workorder_status_id: string;
  sale_id: string;
  sale_line_id: string;
  duration: number;
  created_at: string;
  updated_at: string;
}

export interface Mechanic {
  id: string;
  shop_id: string;
  name: string;
  avatar: string;
  specialty: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduledJob {
  id: string;
  job_id: string;
  shop_id: string;
  mechanic_id: string;
  time_slot: number;
  date: string;
  created_at: string;
  updated_at: string;
  job: Job;
  mechanic: Mechanic;
}

export interface WorkOrderStatus {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
}

const supabase = createClient();

// Jobs CRUD operations
export async function getJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }

  return data || [];
}

export async function createJob(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .insert([jobData])
    .select()
    .single();

  if (error) {
    console.error('Error creating job:', error);
    throw error;
  }

  return data;
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating job:', error);
    throw error;
  }

  return data;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
}

// Mechanics CRUD operations
export async function getMechanics(): Promise<Mechanic[]> {
  const { data, error } = await supabase
    .from('mechanics')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching mechanics:', error);
    throw error;
  }

  return data || [];
}

export async function createMechanic(mechanicData: Omit<Mechanic, 'id' | 'created_at' | 'updated_at'>): Promise<Mechanic> {
  const { data, error } = await supabase
    .from('mechanics')
    .insert([mechanicData])
    .select()
    .single();

  if (error) {
    console.error('Error creating mechanic:', error);
    throw error;
  }

  return data;
}

// Scheduled Jobs CRUD operations
export async function getScheduledJobs(date: string): Promise<ScheduledJob[]> {
  const { data, error } = await supabase
    .from('scheduled_jobs')
    .select(`
      *,
      job:jobs(*),
      mechanic:mechanics(*)
    `)
    .eq('date', date)
    .order('time_slot');

  if (error) {
    console.error('Error fetching scheduled jobs:', error);
    throw error;
  }

  return data || [];
}

export async function createScheduledJob(scheduledJobData: Omit<ScheduledJob, 'id' | 'created_at' | 'updated_at' | 'job' | 'mechanic'>): Promise<ScheduledJob> {
  const { data, error } = await supabase
    .from('scheduled_jobs')
    .insert([scheduledJobData])
    .select(`
      *,
      job:jobs(*),
      mechanic:mechanics(*)
    `)
    .single();

  if (error) {
    console.error('Error creating scheduled job:', error);
    throw error;
  }

  return data;
}

export async function updateScheduledJob(id: string, updates: Partial<ScheduledJob>): Promise<ScheduledJob> {
  const { data, error } = await supabase
    .from('scheduled_jobs')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      job:jobs(*),
      mechanic:mechanics(*)
    `)
    .single();

  if (error) {
    console.error('Error updating scheduled job:', error);
    throw error;
  }

  return data;
}

export async function deleteScheduledJob(id: string): Promise<void> {
  const { error } = await supabase
    .from('scheduled_jobs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting scheduled job:', error);
    throw error;
  }
}

// Work Order Status operations
export async function getWorkOrderStatuses(): Promise<WorkOrderStatus[]> {
  const { data, error } = await supabase
    .from('work_order_statuses')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching work order statuses:', error);
    throw error;
  }

  return data || [];
}

// Real-time subscriptions
export function subscribeToJobs(callback: (payload: any) => void) {
  return supabase
    .channel('jobs_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, callback)
    .subscribe();
}

export function subscribeToScheduledJobs(callback: (payload: any) => void) {
  return supabase
    .channel('scheduled_jobs_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_jobs' }, callback)
    .subscribe();
}

export function subscribeToMechanics(callback: (payload: any) => void) {
  return supabase
    .channel('mechanics_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mechanics' }, callback)
    .subscribe();
}

// Utility functions
export function getSchedulingConflicts(
  job: Job,
  mechanicIndex: number,
  timeSlot: number,
  existingJobs: ScheduledJob[]
): string[] {
  const conflicts: string[] = [];
  const jobEndTime = timeSlot + job.duration * 4; // 4 slots per hour

  if (jobEndTime > 32) {
    conflicts.push("Job extends beyond work hours (6 PM)");
  }

  const overlappingJobs = existingJobs.filter((existingJob) => {
    if (existingJob.mechanic_id !== existingJobs[mechanicIndex]?.mechanic_id) return false;

    const existingStart = existingJob.time_slot;
    const existingEnd = existingJob.time_slot + existingJob.job.duration * 4;

    return timeSlot < existingEnd && jobEndTime > existingStart;
  });

  if (overlappingJobs.length > 0) {
    conflicts.push(`Time slot conflicts with ${overlappingJobs[0].job.hook_in}`);
  }

  return conflicts;
}

export function getMechanicWorkload(
  mechanicId: string,
  scheduledJobs: ScheduledJob[]
): { hours: number; jobs: number } {
  const mechanicJobs = scheduledJobs.filter(
    (job) => job.mechanic_id === mechanicId
  );
  const totalHours = mechanicJobs.reduce((sum, job) => sum + job.job.duration, 0);
  return { hours: totalHours, jobs: mechanicJobs.length };
}
