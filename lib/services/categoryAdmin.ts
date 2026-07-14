import { prisma } from "@/lib/db";
import { recordAudit } from "./audit";
import {
  categoryCreateSchema,
  categoryEditSchema,
  type CategoryCreateInput,
  type CategoryEditInput,
} from "@/lib/validation/admin";

export interface MutationResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface AdminCategoryRow {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  requestCount: number;
}

/** All categories (active and inactive) with how many requests reference each. */
export async function listCategories(): Promise<AdminCategoryRow[]> {
  const cats = await prisma.projectCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { workRequests: true } } },
  });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    requestCount: c._count.workRequests,
  }));
}

export async function createCategory(
  actorId: string,
  input: CategoryCreateInput,
): Promise<MutationResult> {
  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, description } = parsed.data;

  const existing = await prisma.projectCategory.findUnique({ where: { name }, select: { id: true } });
  if (existing) return { ok: false, error: "A category with that name already exists" };

  // Append to the end of the current ordering.
  const max = await prisma.projectCategory.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (max._max.sortOrder ?? -1) + 1;

  const cat = await prisma.$transaction(async (tx) => {
    const c = await tx.projectCategory.create({
      data: { name, description: description || null, sortOrder, isActive: true },
    });
    await recordAudit(
      { actorId, action: "category.create", entityType: "ProjectCategory", entityId: c.id, metadata: { name } },
      tx,
    );
    return c;
  });

  return { ok: true, id: cat.id };
}

export async function updateCategory(
  actorId: string,
  categoryId: string,
  input: CategoryEditInput,
): Promise<MutationResult> {
  const parsed = categoryEditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, description } = parsed.data;

  const current = await prisma.projectCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!current) return { ok: false, error: "Category not found" };

  const clash = await prisma.projectCategory.findUnique({ where: { name }, select: { id: true } });
  if (clash && clash.id !== categoryId) {
    return { ok: false, error: "A category with that name already exists" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectCategory.update({
      where: { id: categoryId },
      data: { name, description: description || null },
    });
    await recordAudit(
      { actorId, action: "category.update", entityType: "ProjectCategory", entityId: categoryId, metadata: { name } },
      tx,
    );
  });

  return { ok: true, id: categoryId };
}

export async function setCategoryActive(
  actorId: string,
  categoryId: string,
  isActive: boolean,
): Promise<MutationResult> {
  const current = await prisma.projectCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, isActive: true },
  });
  if (!current) return { ok: false, error: "Category not found" };
  if (current.isActive === isActive) return { ok: true, id: categoryId };

  await prisma.$transaction(async (tx) => {
    await tx.projectCategory.update({ where: { id: categoryId }, data: { isActive } });
    await recordAudit(
      {
        actorId,
        action: isActive ? "category.activate" : "category.deactivate",
        entityType: "ProjectCategory",
        entityId: categoryId,
      },
      tx,
    );
  });

  return { ok: true, id: categoryId };
}

/**
 * Reorder a category one step up or down by swapping `sortOrder` with its
 * neighbor in the current ordering. Returns ok even at the boundary (no-op).
 */
export async function reorderCategory(
  actorId: string,
  categoryId: string,
  direction: "up" | "down",
): Promise<MutationResult> {
  const ordered = await prisma.projectCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });
  const index = ordered.findIndex((c) => c.id === categoryId);
  if (index === -1) return { ok: false, error: "Category not found" };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= ordered.length) return { ok: true, id: categoryId }; // boundary no-op

  const a = ordered[index];
  const b = ordered[swapIndex];

  await prisma.$transaction(async (tx) => {
    await tx.projectCategory.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } });
    await tx.projectCategory.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } });
    await recordAudit(
      { actorId, action: "category.reorder", entityType: "ProjectCategory", entityId: categoryId, metadata: { direction } },
      tx,
    );
  });

  return { ok: true, id: categoryId };
}

/**
 * Delete a category only when no work request references it — history must be
 * preserved. Referenced categories should be deactivated instead.
 */
export async function deleteCategory(
  actorId: string,
  categoryId: string,
): Promise<MutationResult> {
  const cat = await prisma.projectCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, _count: { select: { workRequests: true } } },
  });
  if (!cat) return { ok: false, error: "Category not found" };
  if (cat._count.workRequests > 0) {
    return {
      ok: false,
      error: "This category is used by existing requests. Deactivate it instead to preserve history.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectCategory.delete({ where: { id: categoryId } });
    await recordAudit(
      { actorId, action: "category.delete", entityType: "ProjectCategory", entityId: categoryId, metadata: { name: cat.name } },
      tx,
    );
  });

  return { ok: true, id: categoryId };
}
