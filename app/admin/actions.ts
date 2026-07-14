"use server";

import { revalidatePath } from "next/cache";
import { requireCan } from "@/lib/auth/session";
import {
  inviteUser,
  updateUser,
  setUserActive,
  resendInvite,
} from "@/lib/services/userAdmin";
import {
  createCategory,
  updateCategory,
  setCategoryActive,
  reorderCategory,
  deleteCategory,
} from "@/lib/services/categoryAdmin";
import { updateSetting } from "@/lib/services/settings";
import type { SettingKey } from "@/lib/validation/admin";

// ----- Users -----
export async function inviteUserAction(form: unknown) {
  const user = await requireCan("admin:users");
  const res = await inviteUser(user.id, form as never);
  revalidatePath("/admin/users");
  return res;
}

export async function updateUserAction(userId: string, form: unknown) {
  const user = await requireCan("admin:users");
  const res = await updateUser(user.id, userId, form as never);
  revalidatePath("/admin/users");
  return res;
}

export async function setUserActiveAction(userId: string, isActive: boolean) {
  const user = await requireCan("admin:users");
  const res = await setUserActive(user.id, userId, isActive);
  revalidatePath("/admin/users");
  return res;
}

export async function resendInviteAction(userId: string) {
  const user = await requireCan("admin:users");
  const res = await resendInvite(user.id, userId);
  revalidatePath("/admin/users");
  return res;
}

// ----- Categories -----
export async function createCategoryAction(form: unknown) {
  const user = await requireCan("admin:categories");
  const res = await createCategory(user.id, form as never);
  revalidatePath("/admin/categories");
  return res;
}

export async function updateCategoryAction(categoryId: string, form: unknown) {
  const user = await requireCan("admin:categories");
  const res = await updateCategory(user.id, categoryId, form as never);
  revalidatePath("/admin/categories");
  return res;
}

export async function setCategoryActiveAction(categoryId: string, isActive: boolean) {
  const user = await requireCan("admin:categories");
  const res = await setCategoryActive(user.id, categoryId, isActive);
  revalidatePath("/admin/categories");
  return res;
}

export async function reorderCategoryAction(categoryId: string, direction: "up" | "down") {
  const user = await requireCan("admin:categories");
  const res = await reorderCategory(user.id, categoryId, direction);
  revalidatePath("/admin/categories");
  return res;
}

export async function deleteCategoryAction(categoryId: string) {
  const user = await requireCan("admin:categories");
  const res = await deleteCategory(user.id, categoryId);
  revalidatePath("/admin/categories");
  return res;
}

// ----- Settings -----
export async function updateSettingAction(key: SettingKey, value: unknown) {
  const user = await requireCan("admin:settings");
  const res = await updateSetting(user.id, key, value);
  revalidatePath("/admin/settings");
  return res;
}
