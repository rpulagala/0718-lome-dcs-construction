"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sectionTone } from "@/lib/ui/tone";
import {
  scheduleVisitAction,
  rescheduleVisitAction,
  cancelVisitAction,
  completeVisitAction,
} from "@/app/requests/[id]/actions";

type AppointmentStatus =
  | "PROPOSED"
  | "CONFIRMED"
  | "COMPLETED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "NO_SHOW";

export interface VisitItem {
  id: string;
  whenLabel: string;
  status: AppointmentStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  customerInstructions: string | null;
  internalInstructions: string | null;
  cancellationReason: string | null;
}

interface Props {
  requestId: string;
  visits: VisitItem[];
  users: { id: string; name: string; role: string }[];
  defaultAssigneeId: string | null;
}

const VISIT_BADGE: Record<AppointmentStatus, string> = {
  PROPOSED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  RESCHEDULED: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-red-100 text-red-700",
};

function isActive(s: AppointmentStatus) {
  return s === "PROPOSED" || s === "CONFIRMED" || s === "RESCHEDULED";
}

interface FormState {
  date: string;
  startTime: string;
  endTime: string;
  assignedToId: string;
  confirmed: boolean;
  notifyCustomer: boolean;
  customerInstructions: string;
  internalInstructions: string;
}

function blankForm(defaultAssigneeId: string | null): FormState {
  return {
    date: "",
    startTime: "",
    endTime: "",
    assignedToId: defaultAssigneeId ?? "",
    confirmed: false,
    notifyCustomer: true,
    customerInstructions: "",
    internalInstructions: "",
  };
}

export function SchedulePanel({ requestId, visits, users, defaultAssigneeId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showForm, setShowForm] = useState(visits.length === 0);
  const [form, setForm] = useState<FormState>(blankForm(defaultAssigneeId));
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, onOk?: () => void) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        onOk?.();
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Action failed" });
      }
    });
  }

  function submitSchedule() {
    const payload = { ...form };
    if (rescheduleId) {
      run(
        () => rescheduleVisitAction(requestId, rescheduleId, payload),
        "Visit rescheduled",
        () => {
          setRescheduleId(null);
          setForm(blankForm(defaultAssigneeId));
          setShowForm(false);
        },
      );
    } else {
      run(() => scheduleVisitAction(requestId, payload), "Visit scheduled", () => {
        setForm(blankForm(defaultAssigneeId));
        setShowForm(false);
      });
    }
  }

  function startReschedule(v: VisitItem) {
    setRescheduleId(v.id);
    setForm({
      ...blankForm(v.assignedToId ?? defaultAssigneeId),
      customerInstructions: v.customerInstructions ?? "",
      internalInstructions: v.internalInstructions ?? "",
    });
    setShowForm(true);
  }

  const input = "h-9 w-full rounded-md border border-slate-300 px-2 text-sm";

  return (
    <div className={`space-y-4 rounded-lg border p-4 ${sectionTone.blue}`} data-testid="schedule-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Site visits</h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setRescheduleId(null);
              setForm(blankForm(defaultAssigneeId));
              setShowForm(true);
            }}
            data-testid="schedule-new"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
          >
            + Schedule
          </button>
        )}
      </div>

      {msg && (
        <p
          className={`rounded-md px-2 py-1 text-xs ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          role="status"
          data-testid="schedule-msg"
        >
          {msg.text}
        </p>
      )}

      {visits.length === 0 && !showForm && (
        <p className="text-sm text-slate-400">No site visits yet.</p>
      )}

      <ul className="space-y-3">
        {visits.map((v) => (
          <li key={v.id} className="rounded-md border border-slate-100 p-3" data-testid="visit-item">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-800">{v.whenLabel}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${VISIT_BADGE[v.status]}`}>
                {v.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {v.assignedToName ? `Assigned to ${v.assignedToName}` : "Unassigned"}
            </div>
            {v.cancellationReason && (
              <div className="mt-1 text-xs text-red-500">Reason: {v.cancellationReason}</div>
            )}
            {isActive(v.status) && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => completeVisitAction(requestId, v.id), "Visit completed")}
                  data-testid="visit-complete"
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                >
                  Mark complete
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startReschedule(v)}
                  data-testid="visit-reschedule"
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                >
                  Reschedule
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const reason = window.prompt("Reason for cancelling (optional)") ?? "";
                    run(() => cancelVisitAction(requestId, v.id, reason), "Visit cancelled");
                  }}
                  data-testid="visit-cancel"
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {showForm && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-600">
            {rescheduleId ? "Reschedule visit" : "Schedule a visit"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-3 text-xs text-slate-500">
              Date
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                data-testid="visit-date"
                className={input}
              />
            </label>
            <label className="text-xs text-slate-500">
              Start
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                data-testid="visit-start"
                className={input}
              />
            </label>
            <label className="text-xs text-slate-500">
              End
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className={input}
              />
            </label>
            <label className="text-xs text-slate-500">
              &nbsp;
              <select
                value={form.assignedToId}
                onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                data-testid="visit-assignee"
                className={input}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            value={form.customerInstructions}
            onChange={(e) => setForm({ ...form, customerInstructions: e.target.value })}
            rows={2}
            placeholder="Instructions for the customer (optional)"
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
          />
          <textarea
            value={form.internalInstructions}
            onChange={(e) => setForm({ ...form, internalInstructions: e.target.value })}
            rows={2}
            placeholder="Internal instructions (optional)"
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
          />
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.confirmed}
              onChange={(e) => setForm({ ...form, confirmed: e.target.checked })}
            />
            Mark as confirmed
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={form.notifyCustomer}
              onChange={(e) => setForm({ ...form, notifyCustomer: e.target.checked })}
            />
            Email the customer
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !form.date}
              onClick={submitSchedule}
              data-testid="visit-submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : rescheduleId ? "Reschedule" : "Schedule"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setRescheduleId(null);
                setForm(blankForm(defaultAssigneeId));
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
