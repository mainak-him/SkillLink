# SkillLink — Personal Summary

Overview
--------
SkillLink is a small artisan marketplace built with Node.js + Express and MySQL. Clients post local jobs (urgent or normal), artisans accept and quote, clients confirm and record payment (M‑Pesa reference), and admins moderate users and jobs. The project purpose is a simple, framework-free demo suitable for a 2nd-year project: readable code, minimal dependencies, and end-to-end flows.

Tech
----
- Backend: Node.js, Express (CommonJS)
- Database: MySQL (mysql2)
- Auth: JWT (`jsonwebtoken`) + `bcrypt` for password hashing
- File uploads: `multer` (stored under `/uploads`)
- Frontend: Vanilla HTML/CSS/JS (no frameworks). Chart.js via CDN for charts.
- Dev: `nodemon` (devDependency)

Main features (implemented)
---------------------------
- User accounts: register/login for `client`, `artisan`, `admin`.
- Artisan verification: credentials upload and verification against a simulated registry.
- Job posting: clients create jobs with location, skill, budget and emergency flag.
- Job lifecycle: open → assigned → completed → confirmed → quoted → paid/closed → disputed.
- Quotes: artisans submit quotes (must be within client budget).
- Payment recording: clients record payment with `payment_reference` (e.g., M‑Pesa code). Platform fee (commission) computed and stored as `platform_fee`.
- Notifications: site-level notifications (job accepted, completed, quoted, payment, etc.). Admin-facing audit log.
- Admin panel: user management (verify/suspend/delete), job browsing, financial stats, audit log.
- Pagination: client-side pagination in admin tables (10 items/page) — keeps things simple.
- UX: global inline loader to avoid flashing overlays; delayed full-screen loader for long requests.
- Seed script: `seed.js` populates realistic users, jobs, notifications, ratings; adds `payment_reference` for paid seeded jobs.

Site map (important pages)
--------------------------
- `index.html` — Login
- `register.html` — Registration
- `/client/dashboard.html` — Client dashboard (post/manage jobs)
- `/client/jobs.html` — Client job listings
- `/client/artisans.html` — Find artisans
- `/client/profile.html` — Client profile
- `/artisan/dashboard.html` — Artisan dashboard (earnings, availability)
- `/artisan/jobs.html` — Browse & manage assigned jobs
- `/artisan/profile.html` — Artisan profile & credentials
- `/admin/dashboard.html` — Admin control center (users, jobs, stats, audit)

Key API endpoints (selected)
---------------------------
- `POST /api/auth/register` — register user
- `POST /api/auth/login` — login
- `GET /api/users/me` — current user
- `POST /api/jobs` — post job (client)
- `PUT /api/jobs/:id/accept` — artisan accepts
- `PUT /api/jobs/:id/complete` — artisan marks complete
- `PUT /api/jobs/:id/confirm` — client confirms completion
- `PUT /api/jobs/:id/quote` — artisan quotes price
- `PUT /api/jobs/:id/payment` — record payment & reference
- `GET /api/admin/dashboard` — admin overview
- `GET /api/admin/users` — list users

Two scenarios (examples)
------------------------
1) Emergency plumbing job (happy path)
   - Client posts emergency job with location and budget.
   - Admin verifies artisan (if needed).
   - Artisan accepts, marks job complete, client confirms, artisan quotes, client records payment with M‑Pesa ref, job closes; platform fee recorded.

2) Dispute resolution (admin path)
   - Client marks a job disputed after completion.
   - Admin reviews audit entries and dispute responses, resolves dispute in favor of client or artisan using `PUT /api/admin/jobs/:id/resolve`.

Two user flows (step-by-step)
----------------------------
1) Client posts a job and confirms payment
   - Register/login as client.
   - Go to `client/dashboard.html` → Post Job (title, description, location, trade, budget, emergency flag).
   - After artisan completes work, artisan marks complete → client receives notification → client visits job page and clicks Confirm.
   - Client opens payment modal and records `payment_reference` (e.g., M‑Pesa code); backend computes and stores `platform_fee` and marks job `paid` + `closed`.

2) Artisan accepts and quotes
   - Register/login as artisan and upload credentials to be verified.
   - Browse open jobs at `artisan/jobs.html` (map/list), accept jobs that match trade and verified status.
   - After client confirms completion, artisan submits a quote using `PUT /api/jobs/:id/quote`.

Personas (5+)
-------------
- Client (e.g., Alice) — posts jobs, confirms completion, records payment.
- Artisan (e.g., Bob) — lists skills, accepts jobs, submits quotes, marks complete.
- Admin (e.g., Sam) — verifies artisans, suspends users, reviews audit log and disputes.
- Guest (visitor) — can view landing pages, but must register to interact.
- Tester/Maintainer (e.g., you) — runs `seed.js`, runs smoke/e2e tests, maintains the server.

Notes on code & simplicity
-------------------------
- Code is intentionally simple and commented in key sections (`server.js`, `public/js/api.js`), using plain Express route handlers and small helper functions.
- Files of interest:
  - `server.js` — backend routes, auth, jobs, admin
  - `db.js` — MySQL pool
  - `seed.js` — realistic seed data (run after importing `skilllink.sql`)
  - `public/js/api.js` — frontend fetch helper, nav rendering, notifications
  - `public/*` — HTML pages and small JS per page

Placeholders & images to fill
----------------------------
- Favicon: add `/public/img/favicon.ico` (missing). Pages link to it but file is absent; add a 32×32 or 48×48 ico file.
- Profile pictures: `public/img/default.png` exists as a placeholder; you may replace with project avatar images.

DB changes & seed
-----------------
- `skilllink.sql` already includes `payment_reference VARCHAR(255)` on `jobs` (no schema edit required).
- Run:
  ```bash
  mysql -u root -p skilllink_db < skilllink.sql
  node seed.js
  ```
  (Adjust DB credentials in `.env` as necessary.)

Next steps & recommended cleanup
--------------------------------
1. Add favicon (`/public/img/favicon.ico`).
2. Sweep the repository for stray `console.log` messages and remove any non-essential debug output. Leave `console.error` in server error handlers.
3. Double-check `uploads/` and make sure no sensitive files are staged.
4. Add CI (GitHub Actions) to run smoke & e2e tests automatically on PRs.
5. Optional: integrate real payment provider (M‑Pesa API) and OTP-based password reset.

What the site does not have (nice-to-have ideas)
-----------------------------------------------
- Integrated payment gateway (automatic verification via provider callback).
- More robust pagination and server-side filtering for large datasets.
- Role-based UI improvements (admin-only notification composer).
- Password reset via real SMS/OTP service (currently simulated OTP '1234').
- Test coverage in CI and smaller unit tests.

Status & housekeeping performed now
----------------------------------
- Smoke tests and E2E tests were executed locally and passed (server running at `http://localhost:3000`).
- I simplified the admin UI (removed flagged jobs card and warning summary), clarified platform commission label, hardened the payment endpoint, and added payment refs to seeded paid jobs.
- I will remove extra markdown files and keep only this `personal_summary.md` before committing (per your request). I will also untrack the `tests/` folder so tests remain locally but are not pushed.

Are we done?
------------
For a student project demo, yes — core flows work and tests pass. Remaining items to finalize before public push:
- Add favicon and any final images you want visible publicly.
- Remove any non-essential console logs.
- Confirm you want the tests folder untracked and the many docs removed (I will proceed if you confirm). 

If you'd like, I will now delete the extra markdown files, update `.gitignore` to keep `personal_summary.md`, untrack `tests/`, commit the cleaned state, and present a short changelog. Reply "yes, proceed" to continue.
