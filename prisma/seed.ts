import "dotenv/config";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

/**
 * Phase 1 seed: company settings, project categories, and staff users.
 * Customer requests / estimates / projects are added in later phases.
 * Dev-only credentials — never use in production.
 */

const CATEGORIES = [
  "Home Remodel",
  "Kitchen Remodel",
  "Bathroom Remodel",
  "Interior Construction",
  "Interior Painting",
  "Exterior Painting",
  "Deck Construction",
  "Construction Consulting",
  "Interior Repairs",
  "Exterior Repairs",
  "Electrical Upgrades",
  "Plumbing Upgrades",
  "Minor Repairs (Handyman)",
  "Other",
];

const DEV_PASSWORD = "Password123!";

const USERS: { email: string; name: string; role: "EMPLOYEE" | "MANAGER" | "PRINCIPAL_ADMIN" }[] = [
  { email: "admin@dcs.example", name: "Dana Chen", role: "PRINCIPAL_ADMIN" },
  { email: "manager1@dcs.example", name: "Marcus Reed", role: "MANAGER" },
  { email: "manager2@dcs.example", name: "Priya Nair", role: "MANAGER" },
  { email: "emp1@dcs.example", name: "Raul Diaz", role: "EMPLOYEE" },
  { email: "emp2@dcs.example", name: "Kim Johnson", role: "EMPLOYEE" },
  { email: "emp3@dcs.example", name: "Arthur Thompson", role: "EMPLOYEE" },
  { email: "emp4@dcs.example", name: "Jessica Wong", role: "EMPLOYEE" },
];

const COMPANY_SETTINGS: { key: string; value: unknown }[] = [
  {
    key: "company_profile",
    value: {
      name: "DCS Construction",
      phone: "415-555-0100",
      email: "hello@dcsconstruction.example",
      address: "100 Builder Way, Sun City, CA 94569",
      serviceArea: "San Francisco Bay Area",
    },
  },
  {
    key: "response_message",
    value: {
      text: "Our team will review your request and contact you within 48 business hours.",
    },
  },
  { key: "intake_notify_emails", value: { emails: ["intake@dcsconstruction.example"] } },
  { key: "upload_limits", value: { maxFiles: 10, maxMb: 10 } },
  { key: "workflow_defaults", value: { defaultStatus: "NEW", defaultPriority: "NORMAL", responseTargetHours: 48 } },
];

async function main() {
  // Company settings
  for (const s of COMPANY_SETTINGS) {
    await prisma.companySetting.upsert({
      where: { key: s.key },
      update: { value: s.value as object },
      create: { key: s.key, value: s.value as object },
    });
  }

  // Categories
  for (let i = 0; i < CATEGORIES.length; i++) {
    const name = CATEGORIES[i];
    await prisma.projectCategory.upsert({
      where: { name },
      update: { sortOrder: i },
      create: { name, sortOrder: i, isActive: true },
    });
  }

  // Users
  const passwordHash = await hashPassword(DEV_PASSWORD);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: true },
      create: { email: u.email, name: u.name, role: u.role, passwordHash },
    });
  }

  const counts = {
    settings: await prisma.companySetting.count(),
    categories: await prisma.projectCategory.count(),
    users: await prisma.user.count(),
  };
  console.log("Seed complete:", counts);
  console.log(`Dev login password for all seeded users: ${DEV_PASSWORD}`);
  console.log("Admin: admin@dcs.example");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
