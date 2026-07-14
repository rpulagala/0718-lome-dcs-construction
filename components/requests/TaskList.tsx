"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sectionTone } from "@/lib/ui/tone";
import { createTaskAction, toggleTaskAction } from "@/app/requests/[id]/actions";

export interface TaskItem {
  id: string;
  title: string;
  isComplete: boolean;
  dueLabel: string | null;
  assigneeName: string | null;
}

interface Props {
  requestId: string;
  tasks: TaskItem[];
  users: { id: string; name: string; role: string }[];
}

export function TaskList({ requestId, tasks, users }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await createTaskAction(requestId, { title, dueAt, assigneeId });
      if (res.ok) {
        setTitle("");
        setDueAt("");
        setAssigneeId("");
        router.refresh();
      } else {
        setError(res.error ?? "Could not add task");
      }
    });
  }

  function toggle(id: string, complete: boolean) {
    startTransition(async () => {
      await toggleTaskAction(requestId, id, complete);
      router.refresh();
    });
  }

  const input = "h-9 rounded-md border border-slate-300 px-2 text-sm";

  return (
    <div className={`rounded-lg border p-4 ${sectionTone.green}`}>
      <h3 className="text-sm font-semibold text-slate-900">Follow-up tasks</h3>

      {tasks.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No tasks yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start gap-2 text-sm" data-testid="task-item">
              <input
                type="checkbox"
                checked={t.isComplete}
                onChange={(e) => toggle(t.id, e.target.checked)}
                disabled={pending}
                className="mt-1"
                aria-label={`Mark "${t.title}" complete`}
              />
              <div>
                <div className={t.isComplete ? "text-slate-400 line-through" : "text-slate-800"}>
                  {t.title}
                </div>
                <div className="text-xs text-slate-400">
                  {t.assigneeName ?? "Unassigned"}
                  {t.dueLabel ? ` · due ${t.dueLabel}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a follow-up task…"
          data-testid="task-title"
          className={`${input} w-full`}
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className={`${input} flex-1`}
            aria-label="Due date"
          />
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className={`${input} flex-1`}
            aria-label="Assignee"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || title.trim().length === 0}
            onClick={add}
            data-testid="task-add"
            className="rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      </div>
    </div>
  );
}
