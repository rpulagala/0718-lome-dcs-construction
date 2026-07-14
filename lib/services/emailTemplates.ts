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
