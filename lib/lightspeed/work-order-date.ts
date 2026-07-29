const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getLightspeedWorkOrderDateRange(date: string): {
  startISO: string;
  endISO: string;
} {
  if (!ISO_DATE_PATTERN.test(date)) {
    throw new Error(`Invalid work-order date: ${date}`);
  }

  const selectedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(selectedDate.getTime())) {
    throw new Error(`Invalid work-order date: ${date}`);
  }

  const startDate = new Date(selectedDate);
  startDate.setUTCDate(startDate.getUTCDate() - 1);

  const endDate = new Date(selectedDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  endDate.setUTCHours(23, 59, 59, 999);

  return {
    startISO: startDate.toISOString(),
    endISO: endDate.toISOString(),
  };
}

export function isWorkOrderOnDate(
  etaOut: string | null | undefined,
  date: string,
): boolean {
  return etaOut?.slice(0, 10) === date;
}
