# DCS Construction — Pages & Logins

**🟢 Live in production:** **https://0718-lome-dcs-construction.vercel.app** (Vercel + Neon + Blob).
Local dev runs at **http://localhost:3000** (`npm run dev` from the project root; DB via Docker on port 5433). Page paths below are the same on both — prefix with the production URL or `http://localhost:3000`.

**Production admin login:** `rpulagala@gmail.com` (password set at deploy via `INITIAL_ADMIN_PASSWORD`; change/rotate as needed). The seeded demo accounts below **also exist in production** with password `Password123!` — deactivate them via Admin → Users before real-world use.

## Public pages (no login — centered, client-branded)
| Page | URL |
|---|---|
| Landing | http://localhost:3000/ |
| Services | http://localhost:3000/services |
| **Request a Site Visit** (branded intake form) | http://localhost:3000/request |
| Confirmation (after submitting) | `/request/confirmation/<request-number>` |
| Privacy | http://localhost:3000/privacy |
| Terms | http://localhost:3000/terms |

> The public nav's **Home / Construction Services / Contact / DCS** links point to the live client site (dcsconstructs.com); **Staff** goes to the sign-in below.

## Internal console (login required — navy menu bar, left-aligned)
| Page | URL | Min role |
|---|---|---|
| Sign in | http://localhost:3000/signin | — |
| Dashboard (overview cards) | http://localhost:3000/dashboard | Employee |
| Requests (list + filters) | http://localhost:3000/requests | Employee |
| Request detail | `/requests/<id>` | Employee |
| Calendar (week grid) | http://localhost:3000/calendar | Employee |
| Projects | http://localhost:3000/projects | Manager |
| Admin (Users / Categories / Settings / Audit) | http://localhost:3000/admin | Principal Admin |

## Logins — password is `Password123!` for every account
| Role | Email | Name |
|---|---|---|
| **Principal Admin** | `admin@dcs.example` | Dana Chen |
| Manager | `manager1@dcs.example` | Marcus Reed |
| Manager | `manager2@dcs.example` | Priya Nair |
| Employee | `emp1@dcs.example` | Raul Diaz |
| Employee | `emp2@dcs.example` | Kim Johnson |
| Employee | `emp3@dcs.example` | Arthur Thompson |
| Employee | `emp4@dcs.example` | Jessica Wong |

Sign in as **admin@dcs.example** to see everything (including Admin). Use an `emp#` account for the employee-only view (no Projects/Admin).

> These are local development seed accounts (see `prisma/seed.ts`). No real credentials — do not use in production.
