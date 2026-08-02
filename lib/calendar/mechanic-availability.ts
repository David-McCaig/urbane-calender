import type { Mechanic, MechanicDayStatus } from "@/lib/database/calendar";

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
