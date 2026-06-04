# SkillLink — Personal Summary

Overview
--------
SkillLink is a complete web application connecting Kenya's informal artisans (Jua Kali workers) with clients who need local jobs done. Built with Node.js, Express, and MySQL with a vanilla frontend (no frameworks). The system handles user registration, geolocation-based job matching, credential verification against a simulated national registry, dispute resolution, and financial tracking. Designed as a student project that demonstrates end-to-end full-stack development with readable, maintainable code.

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
- User accounts: register/login for client, artisan, and admin roles
- Artisan verification: credential upload and validation against simulated national registry (NITA, KNEC, NCA, EPRA, TVET CDACC)
- Job posting: clients create jobs with title, description, location (map or predefined neighborhood), required skill, budget (min/max), and emergency flag
- Job lifecycle: open → assigned (when artisan accepts) → completed (artisan marks done) → confirmed (client confirms) → quoted (artisan submits price) → paid/closed (payment recorded) or disputed
- Dispute handling: clients can raise disputes on completed jobs; artisans submit concerns; admins review and resolve in favor of either party
- Geolocation matching: jobs matched to nearby verified artisans using Haversine distance formula; both list and map views
- Quotes: artisans submit price quotes for confirmed jobs (must be within client budget if budget was set)
- Payment recording: clients record payment with payment reference (e.g., M-Pesa code); platform fee (commission) computed automatically
- Ratings: after job closure, both client and artisan can rate each other (1-5 stars with optional comment)
- Notifications: real-time feedback for all job events (accepted, completed, quoted, payment recorded, dispute actions)
- Admin dashboard: verify/suspend artisans, browse all users and jobs, view financial statistics, resolve disputes, access audit log
- Availability toggle: artisans can toggle their availability status on dashboard
- Pagination: admin tables use client-side pagination (10 items per page)
- Animations & UX: global API loader (subtle inline spinner for quick requests, full-screen overlay for long requests), smooth transitions, toast notifications for all actions
- Seed data: script generates realistic test users, jobs, credentials, notifications, ratings, and paid job records

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

Personas (detailed)
-------------------
1. Alice (Client) — A homeowner in Nairobi needing home repairs. She wants to find trustworthy artisans quickly without waiting on roadsides. Posts jobs (plumbing, electrical, painting), reviews matched artisans on a map, hires based on ratings and distance, and tracks work progress. Values speed, transparency, and verification.

2. Bob (Artisan) — A skilled plumber with a national certification. Currently makes money waiting on street corners. He registers on SkillLink, uploads credentials for verification, sets his availability, and browses nearby jobs. He accepts jobs that match his skills and location, marks work complete, quotes a price, and builds up his rating over time.

3. Sam (Admin) — Oversees the platform. Verifies new artisan registrations, suspends users who misbehave or get bad ratings, reviews disputes between clients and artisans, and monitors system statistics (total jobs, revenue, user growth). Uses the admin dashboard to make decisions.

4. Guest (Visitor) — Can view the login and registration pages but cannot post jobs or browse the marketplace without creating an account.

5. Tester/Developer (You) — Runs smoke tests, seeds test data, develops new features, and maintains the codebase.

User flows (step-by-step)
-------------------------
Flow 1: Client posts emergency job and hires artisan
   1. Alice registers as a client with her name, phone, and password
   2. After login, she goes to dashboard and clicks "Post Job"
   3. She fills in: job title ("Burst pipe in kitchen"), description, location (she selects "Kilimani" or marks on map), required skill ("Plumbing"), budget (KES 5000-10000), and checks "Emergency"
   4. She clicks Post; job is created as "open"
   5. Backend calculates distances to all verified plumbers in the area and returns matches
   6. Alice sees a list of plumbing jobs she posted; she can also view matched artisans on a map
   7. Meanwhile, Bob (verified artisan) logs in and goes to "Browse Jobs"
   8. He sees Alice's emergency plumbing job in the list (1.2 km away, KES 5000-10000 budget)
   9. He clicks "Accept Job"; system changes job status to "assigned" and sends Alice a notification
   10. Alice gets a notification that Bob has accepted her job
   11. Bob marks the job complete after fixing the pipe
   12. System changes job to "completed"; Alice is notified
   13. Alice confirms the work is done on her "Manage Jobs" page
   14. System changes job to "confirmed"; Bob is notified
   15. Bob goes to his "My Jobs" page and clicks "Quote Price"
   16. He enters KES 7500 (within Alice's budget); system confirms and notifies Alice
   17. Alice sees the quote and clicks "Mark Payment Received", entering M-Pesa reference "123456789"
   18. System marks job as "paid/closed", calculates platform fee (e.g., 10% = KES 750), and records both
   19. Both Alice and Bob see a "Rate" button; they rate each other 5 stars with comments
   20. Job is closed; both can see the rating on each other's profiles

Flow 2: Dispute resolution between artisan and client
   1. Client hires artisan for electrical work
   2. Artisan completes work and marks "complete"; client confirms
   3. Artisan quotes KES 8000; client records payment
   4. Job is "closed" but client is unhappy with the work
   5. Client (on Manage Jobs page) clicks "Raise Dispute" and writes a complaint
   6. System flags job as "disputed"; artisan is notified
   7. Artisan submits a "Concern" message explaining why the work is correct
   8. Admin receives a notification and goes to admin dashboard
   9. Admin reviews both sides: client complaint and artisan concern
   10. Admin resolves the dispute in favor of the client (or artisan)
   11. Job is closed with the dispute resolution recorded in the audit log
   12. Both parties are notified of the outcome

Flow 3: Artisan registration and verification
   1. Bob registers with phone (07XXXX), password, trade ("Plumbing")
   2. He goes to his profile page and uploads a PDF of his NITA certification
   3. System stores the file and sets his status to "pending verification"
   4. Admin reviews his profile on admin dashboard and sees his pending registration
   5. Admin verifies his credential details against simulated registry; it matches
   6. Admin clicks "Verify Artisan"; system updates his status to "verified"
   7. Bob receives a notification and can now accept jobs
   8. Bob logs back in, sees "Verified Artisan" badge on his profile
   9. He updates his availability toggle to "Available for work"
   10. His profile is now searchable and he appears in job matches

Design & Architecture
---------------------
- Three-tier architecture: Presentation (HTML/CSS/JS) → Application (Node.js/Express) → Data (MySQL)
- Minimalist UI inspired by Airbnb/Tesla: clean cards, ample whitespace, smooth transitions, intuitive buttons
- Mobile-responsive CSS grid layouts; works well on phones, tablets, desktops
- No external UI framework; vanilla CSS with CSS variables for theming (primary color, borders, shadows)
- Role-based access: different pages and API endpoints for client, artisan, admin
- Geolocation: Leaflet.js maps showing jobs and artisans; Haversine formula for distance calculation
- API design: RESTful endpoints, JSON responses, consistent error handling with human-readable messages
- Frontend state: minimal state management using localStorage for auth; reload-safe page logic

Tech Stack (detailed)
---------------------
- Backend: Node.js (v14+) with Express (CommonJS, no transpilation needed)
- Database: MySQL 5.7+ with mysql2 driver
- Authentication: JWT (jsonwebtoken) for stateless auth; bcrypt for password hashing
- File handling: multer for avatar and credential uploads; stored under /uploads/
- Frontend libraries: Chart.js (analytics charts), Leaflet.js (maps)
- Frontend: Plain HTML, CSS, Vanilla JavaScript (no React, Vue, Angular, etc.)
- Dev tools: nodemon for auto-reload, no build step required
- Testing: Custom Node.js scripts (smoke, E2E, bulk workflows, admin audit)

Code Quality & Readability
---------------------------
- Code is written to be readable and maintainable, suitable for a 2nd-year CS project
- Variable names are clear and meaningful (not abbreviated unnecessarily)
- Comments are kept minimal but placed at key sections (see server.js, api.js)
- No overly complex logic; helper functions kept small and focused
- All API responses follow consistent structure: { error: "..." } for errors, { data: ... } or { message: "..." } for success
- Frontend uses a shared api.js wrapper so all fetch calls have consistent loader and error handling
- Pagination, sorting, and filtering logic is client-side to keep the server stateless

Files of Interest
------------------
- `server.js` — All backend routes, API endpoints, auth logic, job workflow, admin functions
- `db.js` — MySQL connection pool initialization
- `seed.js` — Generates test users, jobs, and realistic data for demo/testing
- `skilllink.sql` — Database schema with all tables, indexes, and initial data
- `public/js/api.js` — Shared fetch wrapper, global loader control, notification system, helper utilities (Haversine, avatar handling, etc.)
- `public/css/style.css` — All frontend styles: colors, typography, grid, cards, buttons, animations, responsive breakpoints
- `public/*.html` — Separate pages for login, registration, client/artisan/admin sections
- `tests/` — Custom test scripts for smoke testing, E2E workflows, bulk testing, audit log validation
- `package.json` — Dependencies and scripts (npm start, npm run dev, npm run seed, npm run test:*)
- `.gitignore` — Excludes node_modules, uploads (user-generated files), .env (secrets), tests/ (local only)
- `README.md` — Public documentation for GitHub

Running the Project
-------------------
Setup:
  1. npm install
  2. Create .env with DB credentials
  3. mysql -u root < skilllink.sql
  4. npm run seed (optional, to populate test data)

Development:
  5. npm run dev (runs with nodemon, auto-reloads on code changes)
  6. Open http://localhost:3000

Testing:
  7. npm run test:smoke (validates API and core workflows)

Production (simplified):
  - npm start (runs server.js)
  - Ensure .env PORT is set correctly
  - Use a process manager like PM2 in production

Cleanup & Repository State
---------------------------
- Removed temporary markdown documentation files (kept only personal_summary.md)
- All test scripts are in tests/ folder, excluded from git push (for local testing only)
- Uploads/ folder is in .gitignore to prevent pushing user-generated files
- .env is in .gitignore to keep secrets safe
- node_modules/ is in .gitignore (restored via npm install)
- All HTML pages, JS, and CSS are tracked and pushed
- Database schema (skilllink.sql) is pushed; users create their own database locally

Current State (as of June 2026)
-------------------------------
- All core features implemented and working
- Smoke tests passing (confirmed API endpoints and job workflows)
- UI polished: smooth animations, nice toast notifications, responsive layouts
- Trade filter moved to artisan "Browse Jobs" page (not dashboard)
- Refresh buttons have inline loading spinners
- Admin dashboard is functional and shows real stats
- Dispute resolution workflow complete
- Payment recording with platform fee calculation working
- Audit log capturing all important actions
- No critical bugs; ready for submission as 2nd-year project

Known Limitations (not bugs, just scope)
---------------------------------------
- Certificate verification is simulated (hardcoded array); real integration would need government API
- Payment gateway is simulated; real implementation would integrate M-Pesa or Stripe
- No real SMS/OTP service; password reset OTP is hardcoded '1234'
- No push notifications; all notifications shown in-app
- No real-time chat; users cannot message each other directly
- Geolocation is limited to hardcoded Nairobi neighborhoods; real app would use full GPS
- No mobile app; only responsive web
- Admin cannot send bulk messages or automated reminders

Future Enhancement Ideas
------------------------
- Integrate actual M-Pesa API for real payments
- Add real SMS/OTP service for password reset
- Implement real-time chat using Socket.io
- Add push notifications
- Mobile app versions (React Native, Flutter)
- Multi-location support across Kenya
- Artisan skill certification with renewal reminders
- Advanced analytics and trend reports
- Recommendation algorithm for artisan-job matching
- Insurance/escrow for high-value jobs
