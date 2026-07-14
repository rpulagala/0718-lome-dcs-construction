"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createProjectAction,
  updateProjectAction,
  changeProjectStatusAction,
  addMilestoneAction,
  toggleMilestoneAction,
  deleteMilestoneAction,
} from "@/app/requests/[id]/actions";

type ProjectStatus = "PLANNED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export interface MilestoneItem {
  id: string;
  title: string;
  description: string | null;
  dueLabel: string | null;
  isComplete: boolean;
}

export interface ProjectView {
  id: string;
  name: string;
  status: ProjectStatus;
  contractRaw: string;
  contractLabel: string;
  plannedStart: string;
  plannedEnd: string;
  pmId: string;
  pmName: string | null;
  internalNotes: string;
  progressPct: number;
  allowedTransitions: ProjectStatus[];
  milestones: MilestoneItem[];
}

interface Props {
  requestId: string;
  project: ProjectView | null;
  acceptedEstimates: { id: string; estimateNumber: string; amountRaw: string }[];
  managers: { id: string; name: string }[];
  canManage: boolean;
}

const BADGE: Record<ProjectStatus, string> = {
  PLANNED: "bg-slate-200 text-slate-700",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  ON_HOLD: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const input = "h-9 w-full rounded-md border border-slate-300 px-2 text-sm";

export function ProjectPanel({ requestId, project, acceptedEstimates, managers, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4" data-testid="project-panel">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Project</h2>
        {project && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[project.status]}`}>
            {STATUS_LABEL[project.status]}
          </span>
        )}
      </div>

      {msg && (
        <p
          className={`mb-2 rounded-md px-2 py-1 text-xs ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          role="status"
          data-testid="project-msg"
        >
          {msg.text}
        </p>
      )}

      {project ? (
        <ProjectDetail requestId={requestId} project={project} managers={managers} canManage={canManage} run={run} pending={pending} />
      ) : acceptedEstimates.length > 0 ? (
        canManage ? (
          <ConvertForm requestId={requestId} acceptedEstimates={acceptedEstimates} managers={managers} run={run} pending={pending} />
        ) : (
          <p className="text-sm text-slate-400">An accepted estimate is ready to convert to a project.</p>
        )
      ) : (
        <p className="text-sm text-slate-400">
          No project yet. Accept an estimate to convert it into a tracked project.
        </p>
      )}
    </section>
  );
}

type Run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, onOk?: () => void) => void;

function ConvertForm({
  requestId,
  acceptedEstimates,
  managers,
  run,
  pending,
}: {
  requestId: string;
  acceptedEstimates: { id: string; estimateNumber: string; amountRaw: string }[];
  managers: { id: string; name: string }[];
  run: Run;
  pending: boolean;
}) {
  const [estimateId, setEstimateId] = useState(acceptedEstimates[0]?.id ?? "");
  const [name, setName] = useState("");
  const [pm, setPm] = useState("");
  const [contract, setContract] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <div className="space-y-2" data-testid="project-convert">
      <p className="text-xs font-medium text-slate-600">Convert accepted estimate to project</p>
      <label className="text-xs text-slate-500">
        From estimate
        <select
          value={estimateId}
          onChange={(e) => setEstimateId(e.target.value)}
          data-testid="project-estimate"
          className={input}
        >
          {acceptedEstimates.map((e) => (
            <option key={e.id} value={e.id}>{e.estimateNumber}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-500">
        Project name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kitchen Remodel — 123 Main St"
          data-testid="project-name"
          className={input}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-500">
          Project manager
          <select value={pm} onChange={(e) => setPm(e.target.value)} className={input}>
            <option value="">Unassigned</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Contract amount
          <input
            type="text"
            inputMode="decimal"
            value={contract}
            onChange={(e) => setContract(e.target.value)}
            placeholder="from estimate"
            className={input}
          />
        </label>
        <label className="text-xs text-slate-500">
          Planned start
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
        </label>
        <label className="text-xs text-slate-500">
          Planned end
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
        </label>
      </div>
      <button
        type="button"
        disabled={pending || !name || !estimateId}
        onClick={() =>
          run(
            () =>
              createProjectAction(requestId, estimateId, {
                name,
                projectManagerId: pm,
                contractAmount: contract,
                plannedStartDate: start,
                plannedEndDate: end,
                internalNotes: "",
              }),
            "Project created",
          )
        }
        data-testid="project-create"
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create project"}
      </button>
    </div>
  );
}

function ProjectDetail({
  requestId,
  project,
  managers,
  canManage,
  run,
  pending,
}: {
  requestId: string;
  project: ProjectView;
  managers: { id: string; name: string }[];
  canManage: boolean;
  run: Run;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [pm, setPm] = useState(project.pmId);
  const [contract, setContract] = useState(project.contractRaw);
  const [start, setStart] = useState(project.plannedStart);
  const [end, setEnd] = useState(project.plannedEnd);
  const [notes, setNotes] = useState(project.internalNotes);
  const [newMilestone, setNewMilestone] = useState("");
  const [milestoneDue, setMilestoneDue] = useState("");

  const doneCount = project.milestones.filter((m) => m.isComplete).length;

  return (
    <div className="space-y-3">
      {!editing ? (
        <>
          <p className="text-sm font-medium text-slate-900" data-testid="project-name-display">{project.name}</p>
          <dl className="text-sm">
            <div className="flex justify-between py-0.5">
              <dt className="text-slate-500">Manager</dt>
              <dd className="text-slate-800">{project.pmName ?? "Unassigned"}</dd>
            </div>
            <div className="flex justify-between py-0.5">
              <dt className="text-slate-500">Contract</dt>
              <dd className="text-slate-800">{project.contractLabel}</dd>
            </div>
            <div className="flex justify-between py-0.5">
              <dt className="text-slate-500">Planned</dt>
              <dd className="text-slate-800">
                {project.plannedStart || "—"} → {project.plannedEnd || "—"}
              </dd>
            </div>
          </dl>
          {project.internalNotes && (
            <p className="whitespace-pre-wrap border-t border-slate-100 pt-2 text-xs text-slate-600">
              {project.internalNotes}
            </p>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
            >
              Edit details
            </button>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <label className="text-xs text-slate-500">
            Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-500">
              Manager
              <select value={pm} onChange={(e) => setPm(e.target.value)} className={input}>
                <option value="">Unassigned</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500">
              Contract
              <input type="text" inputMode="decimal" value={contract} onChange={(e) => setContract(e.target.value)} className={input} />
            </label>
            <label className="text-xs text-slate-500">
              Planned start
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
            </label>
            <label className="text-xs text-slate-500">
              Planned end
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
            </label>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Internal notes"
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    updateProjectAction(requestId, project.id, {
                      name,
                      projectManagerId: pm,
                      contractAmount: contract,
                      plannedStartDate: start,
                      plannedEndDate: end,
                      internalNotes: notes,
                    }),
                  "Project updated",
                  () => setEditing(false),
                )
              }
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Status controls */}
      {canManage && project.allowedTransitions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-2">
          {project.allowedTransitions.map((t) => (
            <button
              key={t}
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => changeProjectStatusAction(requestId, project.id, t),
                  `Project ${STATUS_LABEL[t].toLowerCase()}`,
                )
              }
              data-testid={`project-to-${t}`}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
            >
              Mark {STATUS_LABEL[t].toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {/* Milestones */}
      <div className="border-t border-slate-100 pt-2">
        <p className="mb-1 text-xs font-medium text-slate-600">
          Milestones ({doneCount}/{project.milestones.length})
        </p>
        <ul className="space-y-1" data-testid="milestone-list">
          {project.milestones.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 text-sm" data-testid="milestone-item">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={m.isComplete}
                  disabled={pending || !canManage}
                  onChange={(e) =>
                    run(
                      () => toggleMilestoneAction(requestId, m.id, e.target.checked),
                      "Milestone updated",
                    )
                  }
                />
                <span className={m.isComplete ? "text-slate-400 line-through" : "text-slate-800"}>
                  {m.title}
                  {m.dueLabel && <span className="ml-1 text-xs text-slate-400">· {m.dueLabel}</span>}
                </span>
              </label>
              {canManage && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteMilestoneAction(requestId, m.id), "Milestone removed")}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  aria-label={`Remove milestone ${m.title}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
          {project.milestones.length === 0 && (
            <li className="text-sm text-slate-400">No milestones yet.</li>
          )}
        </ul>
        {canManage && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              placeholder="New milestone"
              data-testid="milestone-title"
              className="h-8 flex-1 rounded-md border border-slate-300 px-2 text-sm"
            />
            <input
              type="date"
              value={milestoneDue}
              onChange={(e) => setMilestoneDue(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 text-sm"
            />
            <button
              type="button"
              disabled={pending || !newMilestone}
              onClick={() =>
                run(
                  () =>
                    addMilestoneAction(requestId, project.id, {
                      title: newMilestone,
                      description: "",
                      dueAt: milestoneDue,
                    }),
                  "Milestone added",
                  () => {
                    setNewMilestone("");
                    setMilestoneDue("");
                  },
                )
              }
              data-testid="milestone-add"
              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
