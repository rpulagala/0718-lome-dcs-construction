"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSettingAction } from "@/app/admin/actions";
import {
  RequestStatusValues,
  PriorityValues,
  type CompanyProfileInput,
  type ResponseMessageInput,
  type IntakeRecipientsInput,
  type UploadLimitsInput,
  type WorkflowDefaultsInput,
  type SettingKey,
} from "@/lib/validation/admin";

type Msg = { ok: boolean; text: string } | null;

const inputCls = "mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm";
const labelCls = "block text-xs font-medium text-slate-600";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function SettingsManager(props: {
  companyProfile: CompanyProfileInput;
  responseMessage: ResponseMessageInput;
  intakeRecipients: IntakeRecipientsInput;
  uploadLimits: UploadLimitsInput;
  workflowDefaults: WorkflowDefaultsInput;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeKey, setActiveKey] = useState<SettingKey | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  // Section state
  const [profile, setProfile] = useState(props.companyProfile);
  const [response, setResponse] = useState(props.responseMessage.text);
  const [recipients, setRecipients] = useState(props.intakeRecipients.emails.join(", "));
  const [upload, setUpload] = useState(props.uploadLimits);
  const [workflow, setWorkflow] = useState(props.workflowDefaults);

  function save(key: SettingKey, value: unknown, okText: string) {
    setMsg(null);
    setActiveKey(key);
    startTransition(async () => {
      const res = await updateSettingAction(key, value);
      setActiveKey(null);
      if (res.ok) {
        setMsg({ ok: true, text: okText });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Save failed" });
      }
    });
  }

  const busy = (k: SettingKey) => pending && activeKey === k;

  return (
    <div className="mt-6 space-y-6">
      {msg && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          role="status"
          data-testid="settings-msg"
        >
          {msg.text}
        </p>
      )}

      {/* Company profile */}
      <Section title="Company profile">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Name</label>
            <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Address</label>
            <input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Service area</label>
            <input value={profile.serviceArea} onChange={(e) => setProfile({ ...profile, serviceArea: e.target.value })} className={inputCls} />
          </div>
        </div>
        <button type="button" disabled={busy("company_profile")}
          onClick={() => save("company_profile", profile, "Company profile saved")}
          data-testid="save-company_profile"
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          Save profile
        </button>
      </Section>

      {/* Response message */}
      <Section title="Customer response message">
        <label className={labelCls}>Shown on the confirmation page & email</label>
        <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        <button type="button" disabled={busy("response_message")}
          onClick={() => save("response_message", { text: response }, "Response message saved")}
          data-testid="save-response_message"
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          Save message
        </button>
      </Section>

      {/* Intake recipients */}
      <Section title="Intake notification recipients">
        <label className={labelCls}>Email addresses (comma or newline separated)</label>
        <textarea value={recipients} onChange={(e) => setRecipients(e.target.value)} rows={2}
          data-testid="intake-recipients"
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
        <button type="button" disabled={busy("intake_notify_emails")}
          onClick={() =>
            save(
              "intake_notify_emails",
              { emails: recipients.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) },
              "Recipients saved",
            )
          }
          data-testid="save-intake_notify_emails"
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          Save recipients
        </button>
      </Section>

      {/* Upload limits */}
      <Section title="Upload limits">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Max files per request</label>
            <input type="number" min={1} max={50} value={upload.maxFiles}
              onChange={(e) => setUpload({ ...upload, maxFiles: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Max size per file (MB)</label>
            <input type="number" min={1} max={100} value={upload.maxMb}
              onChange={(e) => setUpload({ ...upload, maxMb: Number(e.target.value) })} className={inputCls} />
          </div>
        </div>
        <button type="button" disabled={busy("upload_limits")}
          onClick={() => save("upload_limits", upload, "Upload limits saved")}
          data-testid="save-upload_limits"
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          Save limits
        </button>
      </Section>

      {/* Workflow defaults */}
      <Section title="Workflow defaults">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Default status</label>
            <select value={workflow.defaultStatus} onChange={(e) => setWorkflow({ ...workflow, defaultStatus: e.target.value as WorkflowDefaultsInput["defaultStatus"] })} className={inputCls}>
              {RequestStatusValues.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Default priority</label>
            <select value={workflow.defaultPriority} onChange={(e) => setWorkflow({ ...workflow, defaultPriority: e.target.value as WorkflowDefaultsInput["defaultPriority"] })} className={inputCls}>
              {PriorityValues.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Response target (hours)</label>
            <input type="number" min={1} max={240} value={workflow.responseTargetHours}
              onChange={(e) => setWorkflow({ ...workflow, responseTargetHours: Number(e.target.value) })} className={inputCls} />
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={workflow.autoAssign}
              onChange={(e) => setWorkflow({ ...workflow, autoAssign: e.target.checked })} />
            Auto-assign new requests
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={workflow.notifyOnNewRequest}
              onChange={(e) => setWorkflow({ ...workflow, notifyOnNewRequest: e.target.checked })} />
            Notify staff on new request
          </label>
        </div>
        <button type="button" disabled={busy("workflow_defaults")}
          onClick={() => save("workflow_defaults", workflow, "Workflow defaults saved")}
          data-testid="save-workflow_defaults"
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          Save workflow
        </button>
      </Section>
    </div>
  );
}
