import { prisma } from "@/lib/db";
import { recordAudit } from "./audit";
import {
  SETTING_SCHEMAS,
  type SettingKey,
} from "@/lib/validation/admin";

/** Defaults returned when a setting row is missing, so callers always get a shape. */
export const SETTING_DEFAULTS: Record<SettingKey, unknown> = {
  company_profile: {
    name: "DCS Construction",
    phone: "",
    email: "",
    address: "",
    serviceArea: "",
  },
  response_message: {
    text: "Our team will review your request and contact you within 48 business hours.",
  },
  intake_notify_emails: { emails: [] },
  upload_limits: { maxFiles: 10, maxMb: 10 },
  workflow_defaults: {
    defaultStatus: "NEW",
    defaultPriority: "NORMAL",
    responseTargetHours: 48,
    autoAssign: false,
    notifyOnNewRequest: true,
  },
};

/** Read a single setting, falling back to its default shape when unset. */
export async function getSetting<K extends SettingKey>(key: K): Promise<unknown> {
  const row = await prisma.companySetting.findUnique({ where: { key } });
  return row ? row.value : SETTING_DEFAULTS[key];
}

/** Read every known setting keyed by name (used by the settings admin page). */
export async function getAllSettings(): Promise<Record<SettingKey, unknown>> {
  const rows = await prisma.companySetting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<SettingKey, unknown>;
  for (const key of Object.keys(SETTING_SCHEMAS) as SettingKey[]) {
    out[key] = byKey.has(key) ? byKey.get(key)! : SETTING_DEFAULTS[key];
  }
  return out;
}

export interface MutationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validate and upsert one setting, recording an audit entry atomically. The
 * caller passes the already-parsed key; `value` is validated here against the
 * matching schema so the persisted JSON is always well-formed.
 */
export async function updateSetting(
  actorId: string,
  key: SettingKey,
  value: unknown,
): Promise<MutationResult> {
  const schema = SETTING_SCHEMAS[key];
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.companySetting.upsert({
      where: { key },
      update: { value: parsed.data as object },
      create: { key, value: parsed.data as object },
    });
    await recordAudit(
      {
        actorId,
        action: "settings.update",
        entityType: "CompanySetting",
        entityId: key,
        metadata: { key },
      },
      tx,
    );
  });

  return { ok: true };
}
