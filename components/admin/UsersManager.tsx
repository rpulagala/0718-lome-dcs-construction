"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminUserRow } from "@/lib/services/userAdmin";
import { ROLE_VALUES } from "@/lib/validation/admin";
import {
  inviteUserAction,
  updateUserAction,
  setUserActiveAction,
  resendInviteAction,
} from "@/app/admin/actions";

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  PRINCIPAL_ADMIN: "Principal Admin",
};

type Msg = { ok: boolean; text: string } | null;

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(d));
}

export function UsersManager({
  currentUserId,
  users,
}: {
  currentUserId: string;
  users: AdminUserRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Invite form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("EMPLOYEE");
  const [phone, setPhone] = useState("");

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

  function submitInvite() {
    run(
      () => inviteUserAction({ name, email, role, phone }),
      "Invitation sent",
    );
    setName("");
    setEmail("");
    setPhone("");
    setRole("EMPLOYEE");
  }

  return (
    <div className="mt-6 space-y-8">
      {msg && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          role="status"
          data-testid="users-msg"
        >
          {msg.text}
        </p>
      )}

      {/* Invite */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Invite a user</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="inv-name">Name</label>
            <input id="inv-name" value={name} onChange={(e) => setName(e.target.value)}
              data-testid="invite-name"
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="inv-email">Email</label>
            <input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              data-testid="invite-email"
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="inv-role">Role</label>
            <select id="inv-role" value={role} onChange={(e) => setRole(e.target.value)}
              data-testid="invite-role"
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
              {ROLE_VALUES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="inv-phone">Phone (optional)</label>
            <input id="inv-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
          </div>
        </div>
        <button
          type="button"
          disabled={pending || !name.trim() || !email.trim()}
          onClick={submitInvite}
          data-testid="invite-submit"
          className="mt-3 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Send invitation
        </button>
      </section>

      {/* List */}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Last login</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === currentUserId}
                editing={editingId === u.id}
                onEdit={() => setEditingId(editingId === u.id ? null : u.id)}
                run={run}
                pending={pending}
              />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  editing,
  onEdit,
  run,
  pending,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  editing: boolean;
  onEdit: () => void;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<string>(user.role);
  const [phone, setPhone] = useState(user.phone ?? "");

  return (
    <>
      <tr data-testid={`user-row-${user.email}`}>
        <td className="px-4 py-2">
          <div className="font-medium text-slate-900">{user.name}</div>
          <div className="text-xs text-slate-500">{user.email}</div>
        </td>
        <td className="px-4 py-2 text-slate-700">{ROLE_LABEL[user.role] ?? user.role}</td>
        <td className="px-4 py-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
          >
            {user.isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td className="px-4 py-2 text-slate-500">{fmtDate(user.lastLoginAt)}</td>
        <td className="px-4 py-2">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onEdit}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
              {editing ? "Close" : "Edit"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => resendInviteAction(user.id), "Invite re-sent")}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
            >
              Resend
            </button>
            <button
              type="button"
              disabled={pending || isSelf}
              title={isSelf ? "You cannot deactivate your own account" : undefined}
              onClick={() =>
                run(
                  () => setUserActiveAction(user.id, !user.isActive),
                  user.isActive ? "User deactivated" : "User activated",
                )
              }
              data-testid={`user-toggle-${user.email}`}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
            >
              {user.isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-600">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}
                  data-testid={`user-role-${user.email}`}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
                  {ROLE_VALUES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => updateUserAction(user.id, { name, role, phone }), "User updated")}
                  data-testid={`user-save-${user.email}`}
                  className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  Save changes
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
