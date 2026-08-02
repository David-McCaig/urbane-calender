import type {
  Mechanic,
  MechanicDayStatus,
  ScheduledJob,
} from "@/lib/database/calendar";

export function getWorkingMechanics(
  mechanics: Mechanic[],
  statuses: MechanicDayStatus[],
): Mechanic[] {
  const byMechanic = new Map<string, MechanicDayStatus>();

  for (const status of statuses) {
    if (status.source === "when_i_work") byMechanic.set(status.mechanic_id, status);
  }
  for (const status of statuses) {
    if (status.source === "manual") byMechanic.set(status.mechanic_id, status);
  }

  return mechanics.filter(
    (mechanic) => byMechanic.get(mechanic.id)?.is_working ?? true,
  );
}

export function getVisibleMechanics(
  mechanics: Mechanic[],
  workingMechanics: Mechanic[],
  scheduledJobs: ScheduledJob[],
): Mechanic[] {
  const visibleIds = new Set(workingMechanics.map((mechanic) => mechanic.id));
  for (const job of scheduledJobs) visibleIds.add(job.mechanic_id);

  return mechanics.filter((mechanic) => visibleIds.has(mechanic.id));
}
