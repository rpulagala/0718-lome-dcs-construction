"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminCategoryRow } from "@/lib/services/categoryAdmin";
import {
  createCategoryAction,
  updateCategoryAction,
  setCategoryActiveAction,
  reorderCategoryAction,
  deleteCategoryAction,
} from "@/app/admin/actions";

type Msg = { ok: boolean; text: string } | null;

export function CategoriesManager({ categories }: { categories: AdminCategoryRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

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

  function submitCreate() {
    run(() => createCategoryAction({ name, description }), "Category added");
    setName("");
    setDescription("");
  }

  return (
    <div className="mt-6 space-y-8">
      {msg && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          role="status"
          data-testid="categories-msg"
        >
          {msg.text}
        </p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Add a category</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="cat-name">Name</label>
            <input id="cat-name" value={name} onChange={(e) => setName(e.target.value)}
              data-testid="category-name"
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600" htmlFor="cat-desc">Description (optional)</label>
            <input id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
          </div>
        </div>
        <button
          type="button"
          disabled={pending || !name.trim()}
          onClick={submitCreate}
          data-testid="category-submit"
          className="mt-3 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Add category
        </button>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Requests</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((c, i) => (
              <CategoryRow
                key={c.id}
                category={c}
                isFirst={i === 0}
                isLast={i === categories.length - 1}
                editing={editingId === c.id}
                onEdit={() => setEditingId(editingId === c.id ? null : c.id)}
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

function CategoryRow({
  category,
  isFirst,
  isLast,
  editing,
  onEdit,
  run,
  pending,
}: {
  category: AdminCategoryRow;
  isFirst: boolean;
  isLast: boolean;
  editing: boolean;
  onEdit: () => void;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? "");
  const referenced = category.requestCount > 0;

  return (
    <>
      <tr data-testid={`category-row-${category.id}`}>
        <td className="px-4 py-2">
          <div className="flex gap-1">
            <button type="button" disabled={pending || isFirst}
              onClick={() => run(() => reorderCategoryAction(category.id, "up"), "Reordered")}
              aria-label="Move up"
              className="rounded border border-slate-300 px-1.5 text-xs hover:bg-slate-50 disabled:opacity-30">↑</button>
            <button type="button" disabled={pending || isLast}
              onClick={() => run(() => reorderCategoryAction(category.id, "down"), "Reordered")}
              aria-label="Move down"
              className="rounded border border-slate-300 px-1.5 text-xs hover:bg-slate-50 disabled:opacity-30">↓</button>
          </div>
        </td>
        <td className="px-4 py-2">
          <div className="font-medium text-slate-900">{category.name}</div>
          {category.description && <div className="text-xs text-slate-500">{category.description}</div>}
        </td>
        <td className="px-4 py-2 text-slate-700">{category.requestCount}</td>
        <td className="px-4 py-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${category.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {category.isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td className="px-4 py-2">
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onEdit}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
              {editing ? "Close" : "Edit"}
            </button>
            <button type="button" disabled={pending}
              onClick={() => run(() => setCategoryActiveAction(category.id, !category.isActive), category.isActive ? "Deactivated" : "Activated")}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50">
              {category.isActive ? "Deactivate" : "Activate"}
            </button>
            <button type="button" disabled={pending || referenced}
              title={referenced ? "Used by existing requests — deactivate instead" : undefined}
              onClick={() => run(() => deleteCategoryAction(category.id), "Category deleted")}
              data-testid={`category-delete-${category.id}`}
              className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30">
              Delete
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <tr className="bg-slate-50">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Description</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 px-2 text-sm" />
              </div>
              <div className="flex items-end">
                <button type="button" disabled={pending}
                  onClick={() => run(() => updateCategoryAction(category.id, { name, description }), "Category updated")}
                  className="h-9 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
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
