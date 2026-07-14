/**
 * Idempotent first-admin bootstrap for production. Runs during the Vercel build
 * (after `prisma migrate deploy`). Reads credentials from env so no secrets live
 * in the repo:
 *   INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, INITIAL_ADMIN_PASSWORD
 * If those aren't set, it no-ops (build continues). If the user already exists,
 * it leaves the account untouched (never overwrites a password on redeploy).
 */
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.INITIAL_ADMIN_NAME?.trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !name || !password) {
    console.log("[create-admin] INITIAL_ADMIN_* env not set — skipping.");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[create-admin] ${email} already exists — leaving unchanged.`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role: "PRINCIPAL_ADMIN",
      isActive: true,
    },
  });
  console.log(`[create-admin] Created principal admin ${email}.`);
}

main()
  .catch((err) => {
    console.error("[create-admin] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
