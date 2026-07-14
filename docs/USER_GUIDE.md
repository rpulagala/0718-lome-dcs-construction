# DCS Construction — User Guide

Two audiences: **customers** (public, no account) and **staff** (Employee / Manager / Principal Administrator).

---

## For customers

### Submit a work request
1. Go to the site and open **Request service** (`/request`).
2. Fill in your name, phone, email, and preferred contact method.
3. Enter the service address and choose a **project category**.
4. Describe the work. Optionally add budget/timeframe and **upload photos** (drag-and-drop or use your phone camera; up to 10 images).
5. Accept the contact permission + privacy consent, then **Submit**.
6. You'll see a **confirmation page with your request number** (`DCS-YYYY-NNNNNN`) and receive a confirmation email. DCS aims to respond within **48 business hours**.

Keep your request number — it identifies your job in every follow-up.

---

## For staff

Sign in at `/signin`. What you can do depends on your role:

| Capability | Employee | Manager | Principal Admin |
|---|:--:|:--:|:--:|
| View / search requests, add notes, change status, schedule visits | ✅ | ✅ | ✅ |
| Assign requests, set priority, manage estimates & projects | | ✅ | ✅ |
| Cross-project `/projects` view | | ✅ | ✅ |
| Users, categories, settings, audit log (`/admin`) | | | ✅ |

### Dashboard
The dashboard is the request hub: summary cards (new, awaiting contact, visits to schedule, estimates pending, active projects, overdue, completed this month) and a searchable, filterable, paginated request table. Overdue-for-first-contact requests are flagged.

### Working a request (request detail page)
Open any request for its stable URL (`/requests/<id>`):
- **Customer / Location / Project** cards with a map link and the full description.
- **Photos** — click to enlarge in an accessible lightbox.
- **Notes** — internal or customer-visible; every note lands on the timeline.
- **Manage panel** — change status (only valid transitions are offered), set priority, and (manager+) assign an owner. Customer-facing status is shown alongside the internal one.
- **Site visits** — schedule/reschedule/cancel/complete; double-booking for the same employee is blocked; the customer and assigned employee are emailed.
- **Communication log** and **follow-up tasks**.
- **Timeline** and **status/assignment history** record who did what, when.

### Estimates (manager+)
On the request detail page, the **Estimates** panel:
1. **+ New estimate** — enter amount, optional scope description, validity date, and customer/internal notes. It saves as a **Draft**.
2. **Send to customer** — stamps the send date, moves the request to *Estimate Sent*, and emails the customer.
3. Mark **Accepted**, **Declined**, or **Expired** as the customer responds.
4. **Revise** a sent/declined/expired estimate to supersede it with a fresh draft (the original is kept, marked *Revised*).
Only draft/under-review estimates can be edited.

### Projects & milestones (manager+)
Once an estimate is **Accepted**, the **Project** panel offers **Convert to project**:
1. Choose the accepted estimate, name the project, set the project manager, contract amount (defaults from the estimate), and planned dates.
2. The request advances to *Project Scheduled*.
3. Track **milestones** — add them, check them off, or remove them; progress shows as *done/total*.
4. Move the project through **Planned → In Progress → On Hold → Completed** (or Cancelled). The status mirrors onto the request timeline.

The **Projects** page (top nav, manager+) lists all projects with status, manager, contract, and milestone progress — filterable by status and manager — for cross-job oversight.

### Administration (principal admin)
Under **Admin**:
- **Users** — invite staff (they get a temporary password by email), change roles, activate/deactivate. You can't remove the last active admin or deactivate yourself.
- **Categories** — add, rename, reorder, activate/deactivate. A category referenced by any request can't be deleted (deactivate it instead to preserve history).
- **Settings** — company profile, service area, response message, intake alert recipients, upload limits.
- **Audit log** — an append-only record of logins and every user/category/settings/estimate/project change.

---

## Notifications
Transactional emails (confirmation, status updates, site-visit scheduling, estimate sent, staff invites) are sent via the mail service. In development they're printed to the console and recorded in the `EmailLog`; a failed email never blocks the underlying action.
