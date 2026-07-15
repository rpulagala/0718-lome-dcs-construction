import { env } from "@/lib/env";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;color:#b45309;margin:0 0 16px">DCS Construction</h1>
    <h2 style="font-size:16px;margin:0 0 12px">${title}</h2>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:12px;color:#64748b">DCS Construction · This is a transactional message regarding your request.</p>
  </div></body></html>`;
}

export interface ConfirmationData {
  customerName: string;
  requestNumber: string;
  categoryName: string;
  serviceLocation: string;
  projectSummary: string;
  statusUrl?: string;
}

export function renderConfirmation(d: ConfirmationData): RenderedEmail {
  const subject = `We received your request — ${d.requestNumber}`;
  const statusLine = d.statusUrl
    ? `<p>Track your request: <a href="${d.statusUrl}">${d.statusUrl}</a></p>`
    : "";
  const html = shell(
    "Thank you for your interest in DCS Construction",
    `<p>Hi ${d.customerName},</p>
     <p>Your request has been received. Our team will review it and contact you within 48 business hours.</p>
     <table style="font-size:14px;margin:12px 0">
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Request number</td><td><strong>${d.requestNumber}</strong></td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Project category</td><td>${d.categoryName}</td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Service location</td><td>${d.serviceLocation}</td></tr>
     </table>
     <p style="color:#475569">${d.projectSummary}</p>
     ${statusLine}
     <p style="font-size:13px;color:#64748b">Questions? Reply to this email or call our office.</p>`,
  );
  const text = `Hi ${d.customerName},

Your request has been received. Our team will review it and contact you within 48 business hours.

Request number: ${d.requestNumber}
Project category: ${d.categoryName}
Service location: ${d.serviceLocation}

${d.projectSummary}
${d.statusUrl ? `\nTrack your request: ${d.statusUrl}\n` : ""}
— DCS Construction`;
  return { subject, html, text };
}

export interface StatusUpdateData {
  customerName: string;
  requestNumber: string;
  customerStatus: string;
}

export function renderStatusUpdate(d: StatusUpdateData): RenderedEmail {
  const subject = `Update on your request ${d.requestNumber}`;
  const html = shell(
    "Your request has an update",
    `<p>Hi ${d.customerName},</p>
     <p>The status of your request <strong>${d.requestNumber}</strong> is now:
       <strong>${d.customerStatus}</strong>.</p>
     <p>We&rsquo;ll be in touch with next steps. Thank you for choosing DCS Construction.</p>`,
  );
  const text = `Hi ${d.customerName},

The status of your request ${d.requestNumber} is now: ${d.customerStatus}.

We'll be in touch with next steps.
— DCS Construction`;
  return { subject, html, text };
}

export interface SiteVisitData {
  customerName: string;
  requestNumber: string;
  when: string; // pre-formatted, company-tz date/time
  serviceLocation: string;
  customerInstructions?: string | null;
}

export function renderSiteVisitScheduled(d: SiteVisitData): RenderedEmail {
  const subject = `Site visit scheduled for request ${d.requestNumber}`;
  const instructions = d.customerInstructions
    ? `<p style="color:#475569">${d.customerInstructions}</p>`
    : "";
  const html = shell(
    "Your site visit is scheduled",
    `<p>Hi ${d.customerName},</p>
     <p>We&rsquo;ve scheduled a site visit for your request <strong>${d.requestNumber}</strong>.</p>
     <table style="font-size:14px;margin:12px 0">
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">When</td><td><strong>${d.when}</strong></td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Where</td><td>${d.serviceLocation}</td></tr>
     </table>
     ${instructions}
     <p style="font-size:13px;color:#64748b">Need to change the time? Reply to this email or call our office.</p>`,
  );
  const text = `Hi ${d.customerName},

We've scheduled a site visit for your request ${d.requestNumber}.

When: ${d.when}
Where: ${d.serviceLocation}
${d.customerInstructions ? `\n${d.customerInstructions}\n` : ""}
Need to change the time? Reply to this email or call our office.
— DCS Construction`;
  return { subject, html, text };
}

export function renderSiteVisitRescheduled(d: SiteVisitData): RenderedEmail {
  const subject = `Site visit rescheduled for request ${d.requestNumber}`;
  const html = shell(
    "Your site visit has been rescheduled",
    `<p>Hi ${d.customerName},</p>
     <p>The site visit for your request <strong>${d.requestNumber}</strong> has been moved to a new time.</p>
     <table style="font-size:14px;margin:12px 0">
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">New time</td><td><strong>${d.when}</strong></td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Where</td><td>${d.serviceLocation}</td></tr>
     </table>
     <p style="font-size:13px;color:#64748b">If this time doesn&rsquo;t work, reply to this email or call our office.</p>`,
  );
  const text = `Hi ${d.customerName},

The site visit for your request ${d.requestNumber} has been rescheduled.

New time: ${d.when}
Where: ${d.serviceLocation}

If this time doesn't work, reply to this email or call our office.
— DCS Construction`;
  return { subject, html, text };
}

export interface SiteVisitCancelData {
  customerName: string;
  requestNumber: string;
  reason?: string | null;
}

export function renderSiteVisitCancelled(d: SiteVisitCancelData): RenderedEmail {
  const subject = `Site visit cancelled for request ${d.requestNumber}`;
  const reason = d.reason ? `<p style="color:#475569">Reason: ${d.reason}</p>` : "";
  const html = shell(
    "Your site visit has been cancelled",
    `<p>Hi ${d.customerName},</p>
     <p>The site visit for your request <strong>${d.requestNumber}</strong> has been cancelled.</p>
     ${reason}
     <p>We&rsquo;ll be in touch to arrange a new time. Thank you for your patience.</p>`,
  );
  const text = `Hi ${d.customerName},

The site visit for your request ${d.requestNumber} has been cancelled.
${d.reason ? `Reason: ${d.reason}\n` : ""}
We'll be in touch to arrange a new time.
— DCS Construction`;
  return { subject, html, text };
}

export interface EmployeeVisitData {
  requestNumber: string;
  when: string;
  serviceLocation: string;
  customerName: string;
  action: "scheduled" | "rescheduled" | "cancelled";
  internalInstructions?: string | null;
}

export function renderEmployeeVisitAssignment(d: EmployeeVisitData): RenderedEmail {
  const verb =
    d.action === "cancelled" ? "cancelled" : d.action === "rescheduled" ? "rescheduled" : "scheduled";
  const subject = `Site visit ${verb} — ${d.requestNumber}`;
  const link = `${env.APP_BASE_URL}/dashboard`;
  const instructions = d.internalInstructions
    ? `<p style="color:#475569">Instructions: ${d.internalInstructions}</p>`
    : "";
  const html = shell(
    `Site visit ${verb}`,
    `<table style="font-size:14px;margin:12px 0">
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Request</td><td><strong>${d.requestNumber}</strong></td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Customer</td><td>${d.customerName}</td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">When</td><td>${d.when}</td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Where</td><td>${d.serviceLocation}</td></tr>
     </table>
     ${instructions}
     <p><a href="${link}">Open the console</a></p>`,
  );
  const text = `Site visit ${verb} — ${d.requestNumber}
Customer: ${d.customerName}
When: ${d.when}
Where: ${d.serviceLocation}
${d.internalInstructions ? `Instructions: ${d.internalInstructions}\n` : ""}
Open the console: ${link}`;
  return { subject, html, text };
}

export interface EstimateSentData {
  customerName: string;
  requestNumber: string;
  estimateNumber: string;
  amount?: string | null; // pre-formatted, e.g. "$12,500.00"
  expires?: string | null; // pre-formatted date
  customerNotes?: string | null;
}

export function renderEstimateSent(d: EstimateSentData): RenderedEmail {
  const subject = `Your estimate ${d.estimateNumber} for request ${d.requestNumber}`;
  const rows = [
    `<tr><td style="color:#64748b;padding:2px 12px 2px 0">Estimate</td><td><strong>${d.estimateNumber}</strong></td></tr>`,
    d.amount
      ? `<tr><td style="color:#64748b;padding:2px 12px 2px 0">Amount</td><td><strong>${d.amount}</strong></td></tr>`
      : "",
    d.expires
      ? `<tr><td style="color:#64748b;padding:2px 12px 2px 0">Valid until</td><td>${d.expires}</td></tr>`
      : "",
  ].join("");
  const notes = d.customerNotes ? `<p style="color:#475569">${d.customerNotes}</p>` : "";
  const html = shell(
    "Your estimate is ready",
    `<p>Hi ${d.customerName},</p>
     <p>We&rsquo;ve prepared an estimate for your request <strong>${d.requestNumber}</strong>.</p>
     <table style="font-size:14px;margin:12px 0">${rows}</table>
     ${notes}
     <p style="font-size:13px;color:#64748b">Questions or ready to proceed? Reply to this email or call our office.</p>`,
  );
  const text = `Hi ${d.customerName},

We've prepared an estimate for your request ${d.requestNumber}.

Estimate: ${d.estimateNumber}
${d.amount ? `Amount: ${d.amount}\n` : ""}${d.expires ? `Valid until: ${d.expires}\n` : ""}${d.customerNotes ? `\n${d.customerNotes}\n` : ""}
Questions or ready to proceed? Reply to this email or call our office.
— DCS Construction`;
  return { subject, html, text };
}

export interface UserInviteData {
  name: string;
  email: string;
  roleLabel: string;
  temporaryPassword: string;
}

export function renderUserInvite(d: UserInviteData): RenderedEmail {
  const subject = "Your DCS Construction console account";
  const link = `${env.APP_BASE_URL}/signin`;
  const html = shell(
    "You've been invited to the DCS Construction console",
    `<p>Hi ${d.name},</p>
     <p>An account has been created for you as <strong>${d.roleLabel}</strong>. Sign in with the temporary credentials below and change your password once you're in.</p>
     <table style="font-size:14px;margin:12px 0">
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Email</td><td><strong>${d.email}</strong></td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Temporary password</td><td><strong>${d.temporaryPassword}</strong></td></tr>
     </table>
     <p><a href="${link}">Sign in to the console</a></p>
     <p style="font-size:13px;color:#64748b">If you weren't expecting this, please contact your administrator.</p>`,
  );
  const text = `Hi ${d.name},

An account has been created for you as ${d.roleLabel}. Sign in with the temporary credentials below and change your password once you're in.

Email: ${d.email}
Temporary password: ${d.temporaryPassword}

Sign in: ${link}

If you weren't expecting this, please contact your administrator.
— DCS Construction`;
  return { subject, html, text };
}

export interface PortalLoginCodeData {
  code: string;
}

export function renderPortalLoginCode(d: PortalLoginCodeData): RenderedEmail {
  const subject = `Your DCS Construction sign-in code: ${d.code}`;
  const html = shell(
    "Your sign-in code",
    `<p>Use this code to sign in to the DCS Construction app:</p>
     <p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#024988;margin:16px 0">${d.code}</p>
     <p style="font-size:13px;color:#64748b">This code expires in 10 minutes. If you didn&rsquo;t request it, you can ignore this email.</p>`,
  );
  const text = `Your DCS Construction sign-in code is: ${d.code}

This code expires in 10 minutes. If you didn't request it, you can ignore this email.
— DCS Construction`;
  return { subject, html, text };
}

export interface InternalAlertData {
  requestNumber: string;
  categoryName: string;
  customerName: string;
  city: string;
  description: string;
}

export function renderInternalNewRequest(d: InternalAlertData): RenderedEmail {
  const subject = `New work request ${d.requestNumber} — ${d.categoryName}`;
  const link = `${env.APP_BASE_URL}/dashboard`;
  const html = shell(
    "New work request received",
    `<table style="font-size:14px;margin:12px 0">
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Request</td><td><strong>${d.requestNumber}</strong></td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Category</td><td>${d.categoryName}</td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">Customer</td><td>${d.customerName}</td></tr>
       <tr><td style="color:#64748b;padding:2px 12px 2px 0">City</td><td>${d.city}</td></tr>
     </table>
     <p style="color:#475569">${d.description}</p>
     <p><a href="${link}">Open the dashboard</a></p>`,
  );
  const text = `New work request ${d.requestNumber}
Category: ${d.categoryName}
Customer: ${d.customerName}
City: ${d.city}

${d.description}

Open the dashboard: ${link}`;
  return { subject, html, text };
}
