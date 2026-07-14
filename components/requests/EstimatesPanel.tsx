"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createEstimateAction,
  updateEstimateAction,
  changeEstimateStatusAction,
  reviseEstimateAction,
} from "@/app/requests/[id]/actions";

type EstimateStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "SENT"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "REVISED";

export interface EstimateItem {
  id: string;
  estimateNumber: string;
  status: EstimateStatus;
  amountLabel: string;
  amountRaw: string;
  description: string;
  customerNotes: string;
  internalNotes: string;
  expiresAt: string; // YYYY-MM-DD or ""
  sentLabel: string | null;
  createdByName: string | null;
  createdAtLabel: string;
  editable: boolean;
  allowedTransitions: EstimateStatus[];
}

interface Props {
  requestId: string;
  estimates: EstimateItem[];
  canManage: boolean;
}

const BADGE: Record<EstimateStatus, string> = {
  DRAFT: "bg-slate-200 text-slate-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  SENT: "bg-sky-100 text-sky-800",
  ACCEPTED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-orange-100 text-orange-800",
  REVISED: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<EstimateStatus, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under Review",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  REVISED: "Revised",
};

interface FormState {
  amount: string;
  description: string;
  expiresAt: string;
  customerNotes: string;
  internalNotes: string;
}

function blankForm(): FormState {
  return { amount: "", description: "", expiresAt: "", customerNotes: "", internalNotes: "" };
}

export function EstimatesPanel({ requestId, estimates, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());

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

  function submitForm() {
    if (editId) {
      run(() => updateEstimateAction(requestId, editId, form), "Estimate updated", () => {
        setEditId(null);
        setForm(blankForm());
      });
    } else {
      run(() => createEstimateAction(requestId, form), "Estimate created", () => {
        setShowCreate(false);
        setForm(blankForm());
      });
    }
  }

  function startEdit(e: EstimateItem) {
    setEditId(e.id);
    setShowCreate(false);
    setForm({
      amount: e.amountRaw,
      description: e.description,
      expiresAt: e.expiresAt,
      customerNotes: e.customerNotes,
      internalNotes: e.internalNotes,
    });
  }

  const input = "h-9 w-full rounded-md border border-slate-300 px-2 text-sm";
  const formOpen = showCreate || editId !== null;

  return (
    <section
      className="rounded-lg border border-slate-200 bg-white p-4"
      data-testid="estimates-panel"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Estimates ({estimates.length})</h2>
        {canManage && !formOpen && (
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setEditId(null);
              setForm(blankForm());
            }}
            data-testid="estimate-new"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
          >
            + New estimate
          </button>
        )}
      </div>

      {msg && (
        <p
          className={`mb-2 rounded-md px-2 py-1 text-xs ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          role="status"
          data-testid="estimate-msg"
        >
          {msg.text}
        </p>
      )}

      {estimates.length === 0 && !formOpen && (
        <p className="text-sm text-slate-400">No estimates yet.</p>
      )}

      <ul className="space-y-3">
        {estimates.map((e) => (
          <li key={e.id} className="rounded-md border border-slate-100 p-3" data-testid="estimate-item">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-800">{e.estimateNumber}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[e.status]}`}>
                {STATUS_LABEL[e.status]}
              </span>
            </div>
            <div className="mt-1 flex justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-900">{e.amountLabel}</span>
              <span className="text-xs text-slate-400">
                {e.createdByName ? `${e.createdByName} · ` : ""}
                {e.sentLabel ? `Sent ${e.sentLabel}` : e.createdAtLabel}
              </span>
            </div>
            {e.description && <p className="mt-1 text-xs text-slate-600">{e.description}</p>}

            {canManage && (
              <div className="mt-2 flex flex-wrap gap-2">
                {e.editable && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startEdit(e)}
                    data-testid="estimate-edit"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                  >
                    Edit
                  </button>
                )}
                {e.allowedTransitions
                  .filter((t) => t !== "REVISED")
                  .map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => changeEstimateStatusAction(requestId, e.id, t),
                          `Estimate marked ${STATUS_LABEL[t].toLowerCase()}`,
                        )
                      }
                      data-testid={`estimate-to-${t}`}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                    >
                      {t === "SENT" ? "Send to customer" : `Mark ${STATUS_LABEL[t].toLowerCase()}`}
                    </button>
                  ))}
                {e.allowedTransitions.includes("REVISED") && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => reviseEstimateAction(requestId, e.id), "Revision drafted")}
                    data-testid="estimate-revise"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                  >
                    Revise
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {formOpen && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-slate-600">
            {editId ? "Edit estimate" : "New estimate"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-500">
              Amount (USD)
              <input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="12500.00"
                data-testid="estimate-amount"
                className={input}
              />
            </label>
            <label className="text-xs text-slate-500">
              Valid until
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className={input}
              />
            </label>
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Scope description (optional)"
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
          />
          <textarea
            value={form.customerNotes}
            onChange={(e) => setForm({ ...form, customerNotes: e.target.value })}
            rows={2}
            placeholder="Notes for the customer (optional)"
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
          />
          <textarea
            value={form.internalNotes}
            onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
            rows={2}
            placeholder="Internal notes (optional)"
            className="w-full rounded-md border border-slate-300 p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={submitForm}
              data-testid="estimate-submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? "Saving…" : editId ? "Save" : "Create draft"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setEditId(null);
                setForm(blankForm());
              }}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
