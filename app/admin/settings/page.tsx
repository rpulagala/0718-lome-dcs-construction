import { requireCan } from "@/lib/auth/session";
import { AppHeader } from "@/components/app/AppHeader";
import { AdminNav } from "@/components/admin/AdminNav";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { getAllSettings } from "@/lib/services/settings";
import type {
  CompanyProfileInput,
  ResponseMessageInput,
  IntakeRecipientsInput,
  UploadLimitsInput,
  WorkflowDefaultsInput,
} from "@/lib/validation/admin";

export default async function AdminSettingsPage() {
  const user = await requireCan("admin:settings");
  const settings = await getAllSettings();

  return (
    <>
      <AppHeader user={user} />
      <main className="max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
        <AdminNav />
        <SettingsManager
          companyProfile={settings.company_profile as CompanyProfileInput}
          responseMessage={settings.response_message as ResponseMessageInput}
          intakeRecipients={settings.intake_notify_emails as IntakeRecipientsInput}
          uploadLimits={settings.upload_limits as UploadLimitsInput}
          workflowDefaults={settings.workflow_defaults as WorkflowDefaultsInput}
        />
      </main>
    </>
  );
}
