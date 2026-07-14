"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RequestStatus, Priority } from "@/lib/generated/prisma/enums";
import { changeStatusAction, assignAction, priorityAction } from "@/app/requests/[id]/actions";

const PRIORITIES: Priority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

interface Props {
  requestId: string;
  currentStatus: RequestStatus;
  currentPriority: Priority;
  currentAssigneeId: string | null;
  allowedStatuses: RequestStatus[];
  users: { id: string; name: string; role: string }[];
  canAssign: boolean;
}

export function ManagePanel(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("");
  const [reason, setReason] = useState("");
  const [priority, setPriorityVal] = useState<string>(props.currentPriority);
  const [assignee, setAssignee] = useState<string>(props.currentAssigneeId ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Action failed" });
      }
    });
  }

  return (
    <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Manage</h3>

      {msg && (
        <p
          className={`rounded-md px-2 py-1 text-xs ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          role="status"
          data-testid="manage-msg"
        >
          {msg.text}
        </p>
      )}

      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-slate-600">Change status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          data-testid="status-select"
          className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        >
          <option value="">Select new status…</option>
          {props.allowedStatuses.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="mt-2 h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
        <button
          type="button"
          disabled={pending || !status}
          onClick={() => run(() => changeStatusAction(props.requestId, status, reason), "Status updated")}
          data-testid="status-submit"
          className="mt-2 w-full rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Update status
        </button>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-xs font-medium text-slate-600">Priority</label>
        <div className="mt-1 flex gap-2">
          <select
            value={priority}
            onChange={(e) => setPriorityVal(e.target.value)}
            className="h-9 flex-1 rounded-md border border-slate-300 px-2 text-sm"
          >
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button
            type="button"
            disabled={pending || priority === props.currentPriority}
            onClick={() => run(() => priorityAction(props.requestId, priority), "Priority updated")}
            className="rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Set
          </button>
        </div>
      </div>

      {/* Assignment */}
      {props.canAssign && (
        <div>
          <label className="block text-xs font-medium text-slate-600">Assigned to</label>
          <div className="mt-1 flex gap-2">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              data-testid="assign-select"
              className="h-9 flex-1 rounded-md border border-slate-300 px-2 text-sm"
            >
              <option value="">Unassigned</option>
              {props.users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending || assignee === (props.currentAssigneeId ?? "")}
              onClick={() => run(() => assignAction(props.requestId, assignee), "Assignment updated")}
              data-testid="assign-submit"
              className="rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
