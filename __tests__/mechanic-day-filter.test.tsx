import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MechanicDayFilter } from "@/components/calender/mechanic-day-filter";
import type { Mechanic, MechanicDayStatus } from "@/lib/database/calendar";

const mechanics = [
  { id: "one", name: "One", avatar: "O", specialty: "Service" },
  { id: "two", name: "Two", avatar: "T", specialty: "Suspension" },
] as Mechanic[];

afterEach(cleanup);

function manualStatus(mechanicId: string, isWorking: boolean): MechanicDayStatus {
  return {
    id: mechanicId,
    shop_id: "shop",
    mechanic_id: mechanicId,
    date: "2026-08-02",
    is_working: isWorking,
    source: "manual",
    created_at: "2026-08-02T00:00:00Z",
    updated_at: "2026-08-02T00:00:00Z",
  };
}

describe("MechanicDayFilter", () => {
  it("submits only mechanics changed in the open editor", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <MechanicDayFilter
        mechanics={mechanics}
        statuses={[]}
        currentDate={new Date(2026, 7, 2)}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: /mechanics/i }));
    await user.click(screen.getByRole("checkbox", { name: /one/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith([
      { mechanic_id: "one", is_working: false },
    ]);
  });

  it("merges realtime changes for untouched mechanics into the open editor", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const view = render(
      <MechanicDayFilter
        mechanics={mechanics}
        statuses={[]}
        currentDate={new Date(2026, 7, 2)}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: /mechanics/i }));
    await user.click(screen.getByRole("checkbox", { name: /one/i }));
    view.rerender(
      <MechanicDayFilter
        mechanics={mechanics}
        statuses={[manualStatus("two", false)]}
        currentDate={new Date(2026, 7, 2)}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole("checkbox", { name: /one/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /two/i })).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith([
      { mechanic_id: "one", is_working: false },
    ]);
  });
});
