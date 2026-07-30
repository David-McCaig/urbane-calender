"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Loader2,
  Package,
  Check,
  X,
} from "lucide-react";
import { getWorkOrderDetails } from "@/lib/actions/light-speed";
import type {
  LightspeedWorkOrder,
  LightspeedWorkOrderDetails,
} from "@/lib/lightspeed/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WorkOrderDetailsSelection {
  workOrderId: string;
  initialWorkOrder?: LightspeedWorkOrder;
  statusName: string;
  assignedEmployee?: string;
}

function formatDateTime(value?: string): string {
  if (!value) return "Not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function valueOrFallback(value?: string): string {
  return value?.trim() || "Not provided";
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

function ReadOnlyField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-1 text-xs font-semibold text-slate-700">{label}</div>
      <p className="min-h-9 break-words border border-slate-300 bg-white px-2.5 py-2 text-sm font-medium leading-[18px] text-slate-900 shadow-inner shadow-slate-100">
        {value}
      </p>
    </div>
  );
}

function NoteField({
  title,
  value,
}: {
  title: string;
  value?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <FileText className="h-3.5 w-3.5 text-slate-500" />
        {title}
      </div>
      <p className="min-h-32 max-h-48 overflow-y-auto whitespace-pre-wrap border border-slate-300 bg-white p-3 text-sm leading-5 text-slate-700 shadow-inner shadow-slate-100">
        {valueOrFallback(value)}
      </p>
    </div>
  );
}

export function WorkOrderDetailsDialog({
  shopId,
  selection,
  onClose,
}: {
  shopId: string;
  selection: WorkOrderDetailsSelection | null;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<LightspeedWorkOrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selection) {
      setDetails(null);
      setUnavailable(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setUnavailable(false);
    getWorkOrderDetails(shopId, selection.workOrderId)
      .then((result) => {
        if (cancelled) return;
        if (result.status === "ok") setDetails(result.workOrder);
        else setUnavailable(true);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selection, shopId]);

  useEffect(() => {
    if (!selection) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selection, onClose]);

  const workOrder = details || selection?.initialWorkOrder;
  const customerName = workOrder?.Customer
    ? [workOrder.Customer.firstName, workOrder.Customer.lastName]
        .filter(Boolean)
        .join(" ")
    : workOrder?.customerID
      ? `Customer #${workOrder.customerID}`
      : "Customer unavailable";
  const employeeName = workOrder?.Employee
    ? [workOrder.Employee.firstName, workOrder.Employee.lastName]
        .filter(Boolean)
        .join(" ")
    : selection?.assignedEmployee || "Not assigned";
  const totals = details?.totals;
  const lineCountLabel = useMemo(() => {
    const count = details?.lines.length || 0;
    return `${count} ${count === 1 ? "item" : "items"}`;
  }, [details]);
  const groupedLines = useMemo(() => {
    if (!details) return [];
    return [
      {
        kind: "labour" as const,
        label: "Labour",
        lines: details.lines.filter((line) => line.kind === "labour"),
      },
      {
        kind: "part" as const,
        label: "Parts",
        lines: details.lines.filter((line) => line.kind === "part"),
      },
      {
        kind: "fee" as const,
        label: "Fees",
        lines: details.lines.filter((line) => line.kind === "fee"),
      },
    ].filter((group) => group.lines.length > 0);
  }, [details]);

  if (!selection || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-order-dialog-title"
        className="flex max-h-[94vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border border-white/20 bg-white shadow-2xl shadow-slate-950/30"
      >
        <header className="border-b border-slate-300 bg-white px-5 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-6">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Customer
                </p>
                <h2
                  id="work-order-dialog-title"
                  className="truncate text-2xl font-semibold leading-none tracking-tight text-slate-900"
                >
                  {customerName}
                </h2>
              </div>
              <span className="hidden text-sm text-slate-500 sm:block">
                Work order <strong className="font-semibold text-slate-800">#{selection.workOrderId}</strong>
              </span>
              {loading && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 rounded-full p-0"
                onClick={onClose}
                aria-label="Close work order details"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="overflow-y-auto bg-white">
          {unavailable && (
            <div className="mx-5 mt-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-6">
              Live Lightspeed details could not be loaded. Showing the information already available on the calendar.
            </div>
          )}

          <div className="grid border-b border-slate-300 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="min-w-0 p-4 sm:p-5">
              <div className="grid gap-3 border-b border-slate-200 pb-4 sm:grid-cols-2 xl:grid-cols-[180px_minmax(220px,1.2fr)_minmax(220px,1fr)]">
                <ReadOnlyField label="Status" value={selection.statusName} />
                <ReadOnlyField
                  label="Customer Item"
                  value={valueOrFallback(workOrder?.Serialized?.description)}
                />
                <ReadOnlyField
                  label="Description"
                  value={valueOrFallback(workOrder?.description || workOrder?.hookIn)}
                />
              </div>

              <div className="grid gap-3 border-b border-slate-200 py-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(130px,.65fr))]">
                <ReadOnlyField label="Employee" value={employeeName} />
                <ReadOnlyField label="Date In" value={formatDateTime(workOrder?.timeIn)} />
                <ReadOnlyField label="Due" value={formatDateTime(workOrder?.etaOut)} />
                <ReadOnlyField label="Hook In" value={valueOrFallback(workOrder?.hookIn)} />
                <ReadOnlyField label="Hook Out" value={valueOrFallback(workOrder?.hookOut)} />
              </div>

              <div className="grid gap-3 pt-4 md:grid-cols-2">
                <NoteField title="Receipt Note" value={workOrder?.receiptNote || workOrder?.note} />
                <NoteField title="Internal Note" value={workOrder?.internalNote} />
              </div>
            </div>

            <aside className="border-t border-slate-300 bg-slate-50 p-5 lg:border-l lg:border-t-0">
              <div className="space-y-0 text-sm">
                {[
                  ["Labour", totals?.labour],
                  ["Parts", totals?.parts],
                  ["Fees", totals?.fees],
                  ["Discounts", totals ? -totals.discounts : undefined],
                  ["Tax", totals?.tax],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-4 border-b border-slate-300 py-2.5 text-slate-600">
                    <span>{label}</span>
                    <span className="font-medium tabular-nums text-slate-800">
                      {typeof value === "number" ? `$${formatMoney(value)}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-end justify-between gap-4 pt-3">
                <span className="text-lg font-bold text-slate-950">Total</span>
                <span className="text-xl font-bold tabular-nums text-slate-950">
                  {totals ? `$${formatMoney(totals.total)}` : "—"}
                </span>
              </div>
            </aside>
          </div>

          <section>
            <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-[#e8f0df] px-4 py-3 sm:px-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Package className="h-4 w-4 text-slate-600" />
                Work order items
              </h3>
              <span className="text-xs font-medium text-slate-600">{lineCountLabel}</span>
            </div>
            <div className="bg-white">
              {loading && !details ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-16 animate-pulse bg-slate-100" />
                  ))}
                </div>
              ) : details?.lines.length ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[1000px]">
                    <div className="grid grid-cols-[minmax(320px,2.4fr)_minmax(150px,1fr)_minmax(130px,.9fr)_120px_75px_90px_120px] gap-4 border-b border-slate-300 bg-slate-50 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-600">
                      <span>Description</span>
                      <span>Employee</span>
                      <span>Status</span>
                      <span className="text-right">Price / time</span>
                      <span className="text-right">Qty.</span>
                      <span className="text-right">Reserved</span>
                      <span className="text-right">Subtotal</span>
                    </div>
                    <div>
                      {groupedLines.map((group) => (
                        <div key={group.kind}>
                          <div className="border-b border-slate-300 bg-slate-100 px-5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600">
                            {group.label} · {group.lines.length}
                          </div>
                          <div className="divide-y divide-slate-300 border-b border-slate-300">
                            {group.lines.map((line) => (
                              <div
                                key={line.id}
                                className="grid grid-cols-[minmax(320px,2.4fr)_minmax(150px,1fr)_minmax(130px,.9fr)_120px_75px_90px_120px] gap-4 px-5 py-3.5 text-sm hover:bg-blue-50/30"
                              >
                          <div className="min-w-0">
                            <div className="flex items-start gap-2">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "mt-0.5 shrink-0 rounded px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide",
                                  line.kind === "labour" && "bg-slate-600 text-white hover:bg-slate-600",
                                  line.kind === "part" && "bg-slate-400 text-white hover:bg-slate-400",
                                  line.kind === "fee" && "bg-violet-100 text-violet-800 hover:bg-violet-100",
                                )}
                              >
                                {line.kind === "part" ? "Item" : line.kind}
                              </Badge>
                              <div className="min-w-0">
                                <p className="font-semibold leading-5 text-[#1670b7]">
                                  {line.description}
                                </p>
                                {line.note && (
                                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                                    {line.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="self-center text-slate-800">
                            {line.employeeName || "Unassigned"}
                          </p>
                          <div className="self-center">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-800">
                              <span
                                className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded-sm border",
                                  line.isComplete
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-400 bg-white",
                                )}
                              >
                                {line.isComplete && <Check className="h-3 w-3" />}
                              </span>
                              {line.status}
                            </span>
                          </div>
                          <p className="self-center text-right font-medium tabular-nums text-slate-900">
                            {line.kind === "labour" && line.unitPrice === 0 && line.durationMinutes > 0
                              ? formatDuration(line.durationMinutes)
                              : `$${formatMoney(line.unitPrice)}`}
                          </p>
                          <p className="self-center text-right tabular-nums text-slate-700">
                            {line.kind === "labour" ? "—" : line.quantity}
                          </p>
                          <p className="self-center text-right tabular-nums text-slate-700">
                            {line.kind === "labour" ? "—" : line.reservedQuantity}
                          </p>
                          <p className="self-center text-right font-semibold tabular-nums text-slate-950">
                            ${formatMoney(line.subtotal)}
                          </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="p-8 text-center text-sm text-slate-500">
                  No line items are attached to this work order.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>,
    document.body,
  );
}
