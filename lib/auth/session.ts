import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can, type Action } from "@/lib/auth/roles";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Require an authenticated user or redirect to sign-in. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  return user;
}

/** Require a user permitted to perform `action`, else throw (server-enforced). */
export async function requireCan(action: Action) {
  const user = await requireUser();
  if (!can(user.role, action)) {
    throw new Error(`Forbidden: ${action}`);
  }
  return user;
}
