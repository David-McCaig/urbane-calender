"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Users, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  Mechanic,
  MechanicDaySelection,
  MechanicDayStatus,
} from "@/lib/database/calendar";
import { getWorkingMechanics } from "@/lib/calendar/mechanic-availability";

interface MechanicDayFilterProps {
  mechanics: Mechanic[];
  statuses: MechanicDayStatus[];
  currentDate: Date;
  onSave: (selections: MechanicDaySelection[]) => Promise<void>;
}

export function MechanicDayFilter({
  mechanics,
  statuses,
  currentDate,
  onSave,
}: MechanicDayFilterProps) {
  const workingIds = useMemo(
    () => new Set(getWorkingMechanics(mechanics, statuses).map((mechanic) => mechanic.id)),
    [mechanics, statuses],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [baselineIds, setBaselineIds] = useState<Set<string>>(workingIds);
  const [draftIds, setDraftIds] = useState<Set<string>>(workingIds);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openEditor = () => {
    setBaselineIds(new Set(workingIds));
    setDraftIds(new Set(workingIds));
    setDirtyIds(new Set());
    setError(null);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    setBaselineIds(new Set(workingIds));
    setDraftIds((currentDraft) => {
      const mergedDraft = new Set(workingIds);
      for (const mechanicId of dirtyIds) {
        if (currentDraft.has(mechanicId)) mergedDraft.add(mechanicId);
        else mergedDraft.delete(mechanicId);
      }
      return mergedDraft;
    });
  }, [dirtyIds, isOpen, workingIds]);

  const toggleMechanic = (mechanicId: string, checked: boolean) => {
    setDraftIds((current) => {
      const next = new Set(current);
      if (checked) next.add(mechanicId);
      else next.delete(mechanicId);
      return next;
    });
    setDirtyIds((current) => {
      const next = new Set(current);
      if (checked === baselineIds.has(mechanicId)) next.delete(mechanicId);
      else next.add(mechanicId);
      return next;
    });
    setError(null);
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(
        mechanics
          .filter((mechanic) => dirtyIds.has(mechanic.id))
          .map((mechanic) => ({
            mechanic_id: mechanic.id,
            is_working: draftIds.has(mechanic.id),
          })),
      );
      setIsOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update working mechanics.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={openEditor} className="bg-transparent">
        <Users />
        Mechanics · {workingIds.size} working
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="working-mechanics-title"
        >
          <div className="w-full max-w-md rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h2 id="working-mechanics-title" className="text-lg font-semibold">
                  Working mechanics
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
                aria-label="Close"
              >
                <X />
              </Button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-3">
              {mechanics.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No active mechanics are available.
                </p>
              ) : (
                mechanics.map((mechanic) => {
                  const checkboxId = `working-${mechanic.id}`;
                  return (
                    <label
                      key={mechanic.id}
                      htmlFor={checkboxId}
                      className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted"
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={draftIds.has(mechanic.id)}
                        onCheckedChange={(checked) =>
                          toggleMechanic(mechanic.id, checked === true)
                        }
                      />
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{mechanic.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {mechanic.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {mechanic.specialty}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {error ? (
              <p className="mx-5 mb-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 border-t p-4">
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={isSaving || mechanics.length === 0 || dirtyIds.size === 0}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
