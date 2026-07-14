import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { formatRequestNumber, formatEstimateNumber } from "@/lib/domain/requestNumber";
import { addBusinessHours } from "@/lib/domain/businessHours";
import type { RequestStatus, Priority } from "@/lib/generated/prisma/enums";

/**
 * Dev seed: company settings, categories, staff users, and a realistic set of
 * work requests (with photos, site visits, estimates, and projects). Transactional
 * data is wiped and rebuilt each run so the seed is deterministic.
 * Dev-only credentials — never use in production.
 */

const DEV_PASSWORD = "Password123!";
const YEAR = new Date().getFullYear();

const CATEGORIES = [
  "Home Remodel", "Kitchen Remodel", "Bathroom Remodel", "Interior Construction",
  "Interior Painting", "Exterior Painting", "Deck Construction", "Construction Consulting",
  "Interior Repairs", "Exterior Repairs", "Electrical Upgrades", "Plumbing Upgrades",
  "Minor Repairs (Handyman)", "Other",
];

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
  { key: "company_profile", value: { name: "DCS Construction", phone: "415-555-0100", email: "hello@dcsconstruction.example", address: "100 Builder Way, Sun City, CA 94569", serviceArea: "San Francisco Bay Area" } },
  { key: "response_message", value: { text: "Our team will review your request and contact you within 48 business hours." } },
  { key: "intake_notify_emails", value: { emails: ["intake@dcsconstruction.example"] } },
  { key: "upload_limits", value: { maxFiles: 10, maxMb: 10 } },
  { key: "workflow_defaults", value: { defaultStatus: "NEW", defaultPriority: "NORMAL", responseTargetHours: 48 } },
];

const CUSTOMERS = [
  ["Raul Diaz", "raul.diaz@example.com", "415-682-9822", "12 Oak St", "San Francisco", "CA", "94110"],
  ["Kim Zimmerman", "kim.z@example.com", "650-385-9876", "88 Maple Ave", "Daly City", "CA", "94014"],
  ["Lome Aseron", "lome@example.com", "415-425-8876", "1545 Easy Street", "Sun City", "CA", "94569"],
  ["Mary Smith", "mary.smith@example.com", "415-890-7642", "9 Pine Rd", "Oakland", "CA", "94607"],
  ["Arthur Thompson", "arthur.t@example.com", "650-432-9871", "300 Cedar Ln", "San Mateo", "CA", "94401"],
  ["Jessica Ward", "jess.ward@example.com", "510-986-1256", "77 Birch Blvd", "Berkeley", "CA", "94704"],
  ["Daniel Osei", "d.osei@example.com", "415-555-0142", "22 Elm Ct", "San Francisco", "CA", "94103"],
  ["Sofia Martinez", "sofia.m@example.com", "408-555-0199", "5 Spruce Way", "San Jose", "CA", "95112"],
  ["Henry Park", "h.park@example.com", "650-555-0177", "410 Walnut St", "Palo Alto", "CA", "94301"],
  ["Aisha Khan", "aisha.k@example.com", "510-555-0133", "18 Chestnut Ave", "Fremont", "CA", "94536"],
  ["Tom Nguyen", "tom.n@example.com", "415-555-0166", "63 Willow Dr", "San Francisco", "CA", "94112"],
  ["Grace Lee", "grace.lee@example.com", "650-555-0121", "204 Aspen Pl", "Redwood City", "CA", "94061"],
  ["Victor Alvarez", "v.alvarez@example.com", "408-555-0188", "91 Poplar St", "Santa Clara", "CA", "95050"],
  ["Nina Petrova", "nina.p@example.com", "510-555-0155", "34 Sycamore Rd", "Hayward", "CA", "94541"],
  ["Omar Haddad", "omar.h@example.com", "415-555-0111", "150 Redwood Ave", "San Francisco", "CA", "94124"],
];

const DESCRIPTIONS = [
  "Full kitchen remodel including cabinets, counters, and new appliances.",
  "Repaint the exterior of a two-story home; some trim repair needed.",
  "Master bathroom renovation with walk-in shower and double vanity.",
  "Build a new composite deck off the back of the house, about 300 sq ft.",
  "Finish the basement into a family room with recessed lighting.",
  "Upgrade the electrical panel and add circuits for a home office.",
  "Fix a leaking pipe under the kitchen sink and replace the faucet.",
  "Interior repaint of living room, hallway, and two bedrooms.",
  "Consultation on a potential garage-to-ADU conversion.",
  "Replace rotted deck boards and reinforce the railing.",
];

const STATUS_SPREAD: RequestStatus[] = [
  "NEW", "NEW", "NEW", "REVIEWING", "CONTACTED", "SITE_VISIT_TO_SCHEDULE",
  "SITE_VISIT_SCHEDULED", "SITE_VISIT_COMPLETED", "ESTIMATE_IN_PROGRESS", "ESTIMATE_SENT",
  "APPROVED", "PROJECT_SCHEDULED", "IN_PROGRESS", "ON_HOLD", "COMPLETED",
  "NEEDS_MORE_INFORMATION", "DECLINED", "CANCELLED", "NEW", "REVIEWING",
  "CONTACTED", "SITE_VISIT_SCHEDULED", "ESTIMATE_SENT", "IN_PROGRESS", "NEW", "SITE_VISIT_COMPLETED",
];

const PRIORITY_SPREAD: Priority[] = ["LOW", "NORMAL", "NORMAL", "HIGH", "URGENT"];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** `base` set to a whole business hour (local time) — for tidy calendar demos. */
function atHour(base: Date, hour: number): Date {
  const d = new Date(base);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** A visible, on-brand placeholder image (remote URL — displays without local storage). */
function photoPlaceholder(label: string, n: number): string {
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  return `https://placehold.co/1024x768/024988/ffffff/png?text=${encodeURIComponent(`DCS ${cap} ${n}`)}`;
}

const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function wipeTransactionalData() {
  await prisma.projectMilestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.estimate.deleteMany();
  await prisma.siteVisitHistory.deleteMany();
  await prisma.siteVisit.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.task.deleteMany();
  await prisma.workRequestActivity.deleteMany();
  await prisma.workRequestNote.deleteMany();
  await prisma.workRequestAssignmentHistory.deleteMany();
  await prisma.workRequestStatusHistory.deleteMany();
  await prisma.workRequestPhoto.deleteMany();
  await prisma.workRequestAttachment.deleteMany();
  await prisma.customerAccessToken.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.workRequest.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.requestCounter.deleteMany();
  await prisma.estimateCounter.deleteMany();
}

async function main() {
  for (const s of COMPANY_SETTINGS) {
    await prisma.companySetting.upsert({
      where: { key: s.key },
      update: { value: s.value as object },
      create: { key: s.key, value: s.value as object },
    });
  }

  for (let i = 0; i < CATEGORIES.length; i++) {
    await prisma.projectCategory.upsert({
      where: { name: CATEGORIES[i] },
      update: { sortOrder: i },
      create: { name: CATEGORIES[i], sortOrder: i, isActive: true },
    });
  }

  const passwordHash = await hashPassword(DEV_PASSWORD);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, isActive: true },
      create: { email: u.email, name: u.name, role: u.role, passwordHash },
    });
  }

  await wipeTransactionalData();

  // Write a placeholder image for seeded photos.
  const storageDir = path.join(process.cwd(), ".storage", "seed");
  await fs.mkdir(storageDir, { recursive: true });
  await fs.writeFile(path.join(storageDir, "placeholder.png"), PLACEHOLDER_PNG);

  const categories = await prisma.projectCategory.findMany();
  const employees = await prisma.user.findMany({ where: { role: "EMPLOYEE" } });
  const managers = await prisma.user.findMany({ where: { role: "MANAGER" } });

  const requestIds: string[] = [];

  for (let i = 0; i < 26; i++) {
    const c = CUSTOMERS[i % CUSTOMERS.length];
    const category = categories[i % categories.length];
    const status = STATUS_SPREAD[i];
    const priority = PRIORITY_SPREAD[i % PRIORITY_SPREAD.length];
    const seq = i + 1;
    const requestNumber = formatRequestNumber(YEAR, seq);
    const createdAt = daysAgo(30 - i);
    const isNew = status === "NEW";
    // Some NEW requests are overdue (created >2 days ago, never contacted).
    const overdue = isNew && i % 3 === 0;
    const createdForOverdue = overdue ? daysAgo(5) : createdAt;
    const responseDueAt = addBusinessHours(createdForOverdue, 48);
    // Assign roughly 70% of non-new requests.
    const assignTo = !isNew && i % 10 !== 0 ? employees[i % employees.length] : null;
    const hasPhotos = i % 2 === 0;

    const customer = await prisma.customer.create({
      data: {
        fullName: c[0], email: c[1], phone: c[2],
        contactMethod: i % 3 === 0 ? "EMAIL" : "PHONE",
        createdAt: createdForOverdue,
      },
    });
    const address = await prisma.address.create({
      data: { street: c[3], city: c[4], state: c[5], zip: c[6], customerId: customer.id },
    });

    const wr = await prisma.workRequest.create({
      data: {
        requestNumber,
        customerId: customer.id,
        addressId: address.id,
        categoryId: category.id,
        categoryNameSnapshot: category.name,
        description: DESCRIPTIONS[i % DESCRIPTIONS.length],
        budgetRange: ["$5k–$15k", "$15k–$50k", "$50k+", ""][i % 4],
        preferredContact: i % 3 === 0 ? "EMAIL" : "PHONE",
        permissionToContact: true,
        consentAccepted: true,
        status,
        priority,
        assignedToId: assignTo?.id ?? null,
        firstContactedAt: isNew ? null : daysAgo(28 - i),
        responseDueAt,
        createdAt: createdForOverdue,
        photos: hasPhotos
          ? {
              create: [1, 2].map((n) => ({
                storageKey: photoPlaceholder(category.name, n),
                fileName: `photo-${n}.png`,
                contentType: "image/png",
                sizeBytes: PLACEHOLDER_PNG.length,
                width: 1, height: 1,
              })),
            }
          : undefined,
        statusHistory: {
          create: [
            { toStatus: "NEW", createdAt: createdForOverdue },
            ...(isNew ? [] : [{ fromStatus: "NEW" as RequestStatus, toStatus: status, changedById: (managers[0]?.id ?? null), createdAt: daysAgo(27 - i) }]),
          ],
        },
        activities: {
          create: [
            { type: "SUBMITTED", summary: "Request submitted by customer", isCustomerVisible: true, createdAt: createdForOverdue },
            ...(assignTo ? [{ type: "ASSIGNED" as const, summary: `Assigned to ${assignTo.name}`, createdAt: daysAgo(26 - i) }] : []),
          ],
        },
        assignmentHistory: assignTo
          ? { create: { assignedToId: assignTo.id, assignedById: managers[0]?.id ?? null, createdAt: daysAgo(26 - i) } }
          : undefined,
        notes: !isNew
          ? { create: { authorId: (assignTo ?? managers[0]).id, body: "Left a voicemail; will follow up.", visibility: "INTERNAL" } }
          : undefined,
      },
    });
    requestIds.push(wr.id);

    // Site visits for scheduled/completed statuses — placed at business hours and
    // spread across days so the week calendar shows a realistic, colored schedule.
    if (status === "SITE_VISIT_SCHEDULED" || status === "SITE_VISIT_COMPLETED") {
      const completed = status === "SITE_VISIT_COMPLETED";
      const dayBase = completed ? daysAgo(2 + (i % 3)) : daysAgo(-(1 + (i % 5)));
      const start = atHour(dayBase, 9 + (i % 4) * 2); // 9, 11, 13, or 15
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      await prisma.siteVisit.create({
        data: {
          workRequestId: wr.id,
          addressId: address.id,
          assignedToId: assignTo?.id ?? employees[0].id,
          scheduledDate: start,
          startTime: start,
          endTime: end,
          status: completed ? "COMPLETED" : "CONFIRMED",
          customerInstructions: "Ring the doorbell; dog is friendly.",
        },
      });
    }

    // Estimates for later-stage statuses.
    if (["ESTIMATE_SENT", "APPROVED", "PROJECT_SCHEDULED", "IN_PROGRESS", "COMPLETED"].includes(status)) {
      await prisma.estimate.create({
        data: {
          estimateNumber: formatEstimateNumber(YEAR, seq),
          workRequestId: wr.id,
          status: status === "ESTIMATE_SENT" ? "SENT" : "ACCEPTED",
          description: "Labor and materials for the described scope.",
          amount: (10000 + i * 1500).toFixed(2),
          sentAt: daysAgo(20 - i),
          createdById: managers[0]?.id ?? null,
        },
      });
    }
  }

  // Advance the request-number counter past the seeded requests so newly
  // submitted requests continue from the next number (avoids collisions).
  await prisma.requestCounter.upsert({
    where: { year: YEAR },
    update: { lastValue: requestIds.length },
    create: { year: YEAR, lastValue: requestIds.length },
  });

  // Seeded estimate numbers reuse the request sequence (max = requestIds.length),
  // so advance the estimate counter past it to avoid collisions with new drafts.
  await prisma.estimateCounter.upsert({
    where: { year: YEAR },
    update: { lastValue: requestIds.length },
    create: { year: YEAR, lastValue: requestIds.length },
  });

  // Two active projects from approved/in-progress requests.
  const inProgress = await prisma.workRequest.findMany({
    where: { status: { in: ["IN_PROGRESS", "PROJECT_SCHEDULED"] } },
    include: { estimates: true },
    take: 2,
  });
  for (const [idx, wr] of inProgress.entries()) {
    await prisma.project.create({
      data: {
        name: `${wr.categoryNameSnapshot} — Project ${idx + 1}`,
        workRequestId: wr.id,
        estimateId: wr.estimates[0]?.id ?? null,
        customerId: wr.customerId,
        addressId: wr.addressId,
        projectManagerId: managers[idx % managers.length]?.id ?? null,
        status: "IN_PROGRESS",
        contractAmount: (25000 + idx * 5000).toFixed(2),
        plannedStartDate: daysAgo(10),
        plannedEndDate: daysAgo(-30),
        actualStartDate: daysAgo(8),
        milestones: {
          create: [
            { title: "Demolition", sortOrder: 0, completedAt: daysAgo(6) },
            { title: "Rough-in", sortOrder: 1 },
            { title: "Finishes", sortOrder: 2 },
          ],
        },
      },
    });
  }

  // ── Rich "showcase" requests: full lifecycle for demo/QA ──────────────────
  // Two IN_PROGRESS projects that exercise every relation: multiple site visits
  // (with history), assign + reassign, several photos, internal + customer notes,
  // follow-up tasks, communication logs, three estimates (declined → revised →
  // accepted), and a set of milestones.
  const showcaseConfigs = [
    {
      seq: 27,
      customer: ["Eleanor Whitfield", "eleanor.w@example.com", "415-555-0301", "742 Alameda Blvd", "San Francisco", "CA", "94107"],
      categoryName: "Kitchen Remodel",
      description: "Gut renovation of a 1920s kitchen: new cabinets, quartz counters, island, and full rewiring.",
      projectName: "Whitfield Kitchen Gut Renovation",
      contract: "48250.00",
      createdDaysAgo: 45,
      photoPrefix: "kitchen",
    },
    {
      seq: 28,
      customer: ["Beckman & Rowe LLP", "facilities@beckmanrowe.example", "415-555-0342", "1200 Market St, Suite 900", "San Francisco", "CA", "94102"],
      categoryName: "Interior Construction",
      description: "Commercial office buildout: demolition, framing, two conference rooms, HVAC coordination, and finishes.",
      projectName: "Beckman & Rowe Office Buildout",
      contract: "128900.00",
      createdDaysAgo: 60,
      photoPrefix: "office",
    },
  ];

  let estSeq = 100; // showcase estimate numbers, clear of the seeded range
  for (const [idx, sc] of showcaseConfigs.entries()) {
    const d = (n: number) => daysAgo(sc.createdDaysAgo - n); // n days after intake
    const category = categories.find((c) => c.name === sc.categoryName) ?? categories[0];
    const pm = managers[idx % managers.length];
    const empA = employees[idx % employees.length];
    const empB = employees[(idx + 1) % employees.length];
    const created = daysAgo(sc.createdDaysAgo);

    const customer = await prisma.customer.create({
      data: { fullName: sc.customer[0], email: sc.customer[1], phone: sc.customer[2], contactMethod: "EMAIL", createdAt: created },
    });
    const address = await prisma.address.create({
      data: { street: sc.customer[3], city: sc.customer[4], state: sc.customer[5], zip: sc.customer[6], customerId: customer.id },
    });

    const wr = await prisma.workRequest.create({
      data: {
        requestNumber: formatRequestNumber(YEAR, sc.seq),
        customerId: customer.id,
        addressId: address.id,
        categoryId: category.id,
        categoryNameSnapshot: category.name,
        description: sc.description,
        budgetRange: "$40k–$150k",
        desiredTimeframe: "Within 3 months",
        referralSource: idx === 0 ? "Google search" : "Referral from a past client",
        preferredContact: "EMAIL",
        permissionToContact: true,
        consentAccepted: true,
        status: "IN_PROGRESS",
        priority: "HIGH",
        assignedToId: empB.id, // final assignee after reassignment
        firstContactedAt: d(1),
        responseDueAt: addBusinessHours(created, 48),
        createdAt: created,
        photos: {
          create: [1, 2, 3, 4].map((n) => ({
            storageKey: photoPlaceholder(sc.photoPrefix, n),
            fileName: `${sc.photoPrefix}-${n}.png`,
            contentType: "image/png",
            sizeBytes: PLACEHOLDER_PNG.length,
            width: 1,
            height: 1,
          })),
        },
        notes: {
          create: [
            { authorId: empA.id, body: "Initial walkthrough done. Existing wiring is undersized; we'll need a subpanel.", visibility: "INTERNAL", createdAt: d(3) },
            { authorId: pm.id, body: "Customer is flexible on timeline but firm on the budget cap. Keep options tight.", visibility: "INTERNAL", createdAt: d(10) },
            { authorId: empB.id, body: "Thanks for having us out! We'll send the revised estimate by Friday.", visibility: "CUSTOMER_VISIBLE", createdAt: d(12) },
            { authorId: pm.id, body: "Materials are ordered; demolition begins next week as discussed.", visibility: "CUSTOMER_VISIBLE", createdAt: d(20) },
          ],
        },
        tasks: {
          create: [
            { title: "Send revised estimate", createdById: pm.id, assigneeId: empB.id, isComplete: true, completedAt: d(12), dueAt: d(13), createdAt: d(15) },
            { title: "Pull permits with the city", createdById: pm.id, assigneeId: empA.id, isComplete: true, completedAt: d(22), createdAt: d(25) },
            { title: "Confirm appliance / materials delivery date", createdById: empB.id, assigneeId: empB.id, isComplete: false, dueAt: daysAgo(-5), createdAt: d(26) },
            { title: "Schedule mid-project inspection", createdById: pm.id, assigneeId: empA.id, isComplete: false, dueAt: daysAgo(-12), createdAt: d(27) },
          ],
        },
        communications: {
          create: [
            { loggedById: empA.id, channel: "PHONE", direction: "OUTBOUND", summary: "Called to schedule the initial site visit.", occurredAt: d(2) },
            { loggedById: empA.id, channel: "EMAIL", direction: "INBOUND", summary: "Customer emailed photos of the existing space.", occurredAt: d(4) },
            { loggedById: empB.id, channel: "EMAIL", direction: "OUTBOUND", summary: "Sent the first estimate for review.", occurredAt: d(14) },
            { loggedById: empB.id, channel: "TEXT", direction: "INBOUND", summary: "Customer texted to accept the revised estimate.", occurredAt: d(21) },
          ],
        },
        statusHistory: {
          create: [
            { toStatus: "NEW", createdAt: created },
            { fromStatus: "NEW", toStatus: "REVIEWING", changedById: pm.id, createdAt: d(1) },
            { fromStatus: "REVIEWING", toStatus: "CONTACTED", changedById: empA.id, createdAt: d(2) },
            { fromStatus: "CONTACTED", toStatus: "SITE_VISIT_TO_SCHEDULE", changedById: empA.id, createdAt: d(3) },
            { fromStatus: "SITE_VISIT_TO_SCHEDULE", toStatus: "SITE_VISIT_SCHEDULED", changedById: empA.id, createdAt: d(5) },
            { fromStatus: "SITE_VISIT_SCHEDULED", toStatus: "SITE_VISIT_COMPLETED", changedById: empB.id, createdAt: d(8) },
            { fromStatus: "SITE_VISIT_COMPLETED", toStatus: "ESTIMATE_IN_PROGRESS", changedById: pm.id, createdAt: d(10) },
            { fromStatus: "ESTIMATE_IN_PROGRESS", toStatus: "ESTIMATE_SENT", changedById: empB.id, createdAt: d(14) },
            { fromStatus: "ESTIMATE_SENT", toStatus: "APPROVED", reason: "Customer accepted the revised estimate", changedById: pm.id, createdAt: d(21) },
            { fromStatus: "APPROVED", toStatus: "PROJECT_SCHEDULED", changedById: pm.id, createdAt: d(22) },
            { fromStatus: "PROJECT_SCHEDULED", toStatus: "IN_PROGRESS", changedById: pm.id, createdAt: d(24) },
          ],
        },
        assignmentHistory: {
          create: [
            { assignedToId: empA.id, assignedById: pm.id, createdAt: d(1) },
            { assignedToId: empB.id, assignedById: pm.id, createdAt: d(16) },
          ],
        },
        activities: {
          create: [
            { type: "SUBMITTED", summary: "Request submitted by customer", isCustomerVisible: true, createdAt: created },
            { type: "ASSIGNED", summary: `Assigned to ${empA.name}`, createdAt: d(1) },
            { type: "NOTE_ADDED", summary: "Internal note added", createdAt: d(3) },
            { type: "SITE_VISIT_SCHEDULED", summary: "Site visit scheduled", isCustomerVisible: true, createdAt: d(5) },
            { type: "SITE_VISIT_UPDATED", summary: "Site visit completed", createdAt: d(8) },
            { type: "ASSIGNED", summary: `Reassigned to ${empB.name}`, createdAt: d(16) },
            { type: "ESTIMATE_SENT", summary: "Estimate sent to customer", isCustomerVisible: true, createdAt: d(14) },
            { type: "STATUS_CHANGED", summary: "Estimate accepted", createdAt: d(21) },
            { type: "PROJECT_CREATED", summary: `Project "${sc.projectName}" created`, isCustomerVisible: true, createdAt: d(22) },
          ],
        },
      },
    });

    // Two site visits with history: one completed (rescheduled once), one upcoming.
    await prisma.siteVisit.create({
      data: {
        workRequestId: wr.id, addressId: address.id, assignedToId: empA.id,
        scheduledDate: atHour(d(8), 10), startTime: atHour(d(8), 10), endTime: atHour(d(8), 11),
        status: "COMPLETED", customerInstructions: "Gate code 4417; park in the driveway.",
        history: {
          create: [
            { changeType: "created", newDate: atHour(d(6), 10) },
            { changeType: "rescheduled", previousDate: atHour(d(6), 10), newDate: atHour(d(8), 10) },
            { changeType: "completed", newDate: atHour(d(8), 10) },
          ],
        },
      },
    });
    await prisma.siteVisit.create({
      data: {
        workRequestId: wr.id, addressId: address.id, assignedToId: empB.id,
        scheduledDate: atHour(daysAgo(-3), 13), startTime: atHour(daysAgo(-3), 13), endTime: atHour(daysAgo(-3), 14),
        status: "CONFIRMED", customerInstructions: "Progress check-in with the customer.",
        history: { create: [{ changeType: "created", newDate: atHour(daysAgo(-3), 13) }] },
      },
    });

    // Three estimates: declined → revised → accepted (the last one is picked).
    await prisma.estimate.create({
      data: { estimateNumber: formatEstimateNumber(YEAR, estSeq++), workRequestId: wr.id, status: "DECLINED", description: "Initial full-scope quote.", amount: (Number(sc.contract) * 1.18).toFixed(2), sentAt: d(14), createdById: pm.id, customerNotes: "First pass — customer felt it was over budget." },
    });
    await prisma.estimate.create({
      data: { estimateNumber: formatEstimateNumber(YEAR, estSeq++), workRequestId: wr.id, status: "REVISED", description: "Value-engineered revision.", amount: (Number(sc.contract) * 1.05).toFixed(2), sentAt: d(18), createdById: pm.id, internalNotes: "Swapped a few finishes to hit the target." },
    });
    const acceptedEstimate = await prisma.estimate.create({
      data: { estimateNumber: formatEstimateNumber(YEAR, estSeq++), workRequestId: wr.id, status: "ACCEPTED", description: "Final accepted scope and pricing.", amount: sc.contract, sentAt: d(20), createdById: pm.id },
    });

    // Project from the accepted estimate, with a milestone set (some complete).
    await prisma.project.create({
      data: {
        name: sc.projectName, workRequestId: wr.id, estimateId: acceptedEstimate.id,
        customerId: customer.id, addressId: address.id, projectManagerId: pm.id,
        status: "IN_PROGRESS", contractAmount: sc.contract,
        plannedStartDate: d(24), plannedEndDate: daysAgo(-40), actualStartDate: d(24),
        internalNotes: "Kickoff complete; on schedule.",
        milestones: {
          create: [
            { title: "Permits approved", sortOrder: 0, completedAt: d(22), dueAt: d(23) },
            { title: "Demolition", sortOrder: 1, completedAt: d(24), dueAt: d(25) },
            { title: "Rough-in (electrical / plumbing)", sortOrder: 2, completedAt: daysAgo(10), dueAt: daysAgo(8) },
            { title: "Mid-project inspection", sortOrder: 3, dueAt: daysAgo(-6) },
            { title: "Finishes & fixtures", sortOrder: 4, dueAt: daysAgo(-30) },
            { title: "Final walkthrough", sortOrder: 5, dueAt: daysAgo(-40) },
          ],
        },
      },
    });
  }

  // Advance counters past the showcase allocations (requests 27–28, estimates 100+).
  await prisma.requestCounter.upsert({
    where: { year: YEAR }, update: { lastValue: 28 }, create: { year: YEAR, lastValue: 28 },
  });
  await prisma.estimateCounter.upsert({
    where: { year: YEAR }, update: { lastValue: estSeq }, create: { year: YEAR, lastValue: estSeq },
  });

  const counts = {
    settings: await prisma.companySetting.count(),
    categories: await prisma.projectCategory.count(),
    users: await prisma.user.count(),
    requests: await prisma.workRequest.count(),
    photos: await prisma.workRequestPhoto.count(),
    siteVisits: await prisma.siteVisit.count(),
    estimates: await prisma.estimate.count(),
    projects: await prisma.project.count(),
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
