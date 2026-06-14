# SkillLink

A simple web platform connecting Kenya's informal artisans with local job requests. Built with Node.js and vanilla frontend JavaScript.

## What is SkillLink?

SkillLink solves a real problem: trust and visibility in the informal labor market. Clients need reliable artisans, and artisans need better access to work beyond roadside waiting. This system brings them together using geolocation matching, credential verification, and a simple rating system.

## Key Features

- **User Roles**: Three distinct experiences for clients, artisans, and administrators
- **Geolocation Matching**: Clients post jobs with location; artisans see nearby work using distance calculations
- **Verification**: Artisans upload trade certificates, verified against a simulated national registry
- **Job Lifecycle**: Clean workflow from job posting through acceptance, completion, quoting, payment, and ratings
- **Dispute Resolution**: Admin panel handles customer complaints with a structured review process
- **Notifications**: Real-time feedback for job events, quotes, and completion
- **Admin Dashboard**: Financial overview, user management, audit logs

## Tech Stack

- **Backend**: Node.js + Express (minimal, readable code)
- **Database**: MySQL
- **Authentication**: JWT + bcrypt
- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)
- **Charts**: Chart.js via CDN
- **Maps**: Leaflet.js for geolocation visualization

## Getting Started

### Prerequisites

- Node.js (v14+)
- MySQL
- npm

### Installation

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a MySQL database and import the schema:
   ```bash
   mysql -u root < skilllink.sql
   ```

4. Create a `.env` file:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=
   DB_NAME=skilllink
   JWT_SECRET=your_secret_key_here
   PORT=3000
   ```

5. Seed sample data (optional):
   ```bash
   npm run seed
   ```

6. Start the server:
   ```bash
   npm start
   ```

   For development with auto-reload:
   ```bash
   npm run dev
   ```

7. Open http://localhost:3000 in your browser

## How to Use

### For Clients

1. Register with your phone number
2. Post a job with location, skill needed, and budget
3. View matched artisans on a map
4. Accept quotes and confirm completion
5. Record payment with M-Pesa reference (or any payment method)
6. Rate the artisan

### For Artisans

1. Register and upload your trade certificate
2. Wait for admin verification
3. Browse nearby open jobs filtered by your skill
4. Accept jobs that interest you
5. Mark work complete when finished
6. Submit a price quote
7. Record when payment is received

### For Admins

1. Login with admin credentials
2. Verify pending artisan registrations
3. Browse all jobs and users
4. Resolve disputes between clients and artisans
5. View financial reports and activity trends
6. Manage user accounts (suspend/delete if needed)

## Project Structure

```
.
├── server.js           # Express backend, all API routes
├── db.js              # MySQL connection pool
├── seed.js            # Sample data generator
├── skilllink.sql      # Database schema
├── package.json       # Dependencies
├── public/            # Frontend files
│   ├── index.html     # Login page
│   ├── register.html  # Registration
│   ├── client/        # Client pages
│   ├── artisan/       # Artisan pages
│   ├── admin/         # Admin pages
│   ├── css/style.css  # All frontend styles
│   └── js/api.js      # Shared fetch wrapper, helpers
└── tests/             # Test scripts
```

## API Endpoints (Selected)

### Authentication
- `POST /api/auth/register` — Create new account
- `POST /api/auth/login` — Login
- `POST /api/auth/reset-password` — Reset password

### Users
- `GET /api/users/me` — Current user profile
- `PUT /api/users/me` — Update profile
- `POST /api/users/me/avatar` — Upload avatar
- `DELETE /api/users/me` — Delete account
- `GET /api/users/stats` — User statistics

### Jobs
- `POST /api/jobs` — Create job (client)
- `GET /api/jobs` — List jobs with filters
- `PUT /api/jobs/:id/accept` — Accept job (artisan)
- `PUT /api/jobs/:id/complete` — Mark complete (artisan)
- `PUT /api/jobs/:id/confirm` — Confirm completion (client)
- `PUT /api/jobs/:id/quote` — Submit quote (artisan)
- `PUT /api/jobs/:id/payment` — Record payment (client)
- `PUT /api/jobs/:id/dispute` — Raise dispute (client)

### Admin
- `GET /api/admin/dashboard` — Overview stats
- `GET /api/admin/users` — List all users
- `PUT /api/admin/users/:id/verify` — Verify artisan
- `PUT /api/admin/users/:id/suspend` — Suspend user
- `GET /api/admin/audit` — View audit log

## Testing

Run smoke tests to validate the core workflows:

```bash
npm run test:smoke
```

This checks that all major API endpoints are working and the database queries are correct.

## Design Approach

The code is intentionally simple and readable—suitable for a student project. Key decisions:

- **No frameworks**: Vanilla JS makes the code transparent and easier to understand
- **Single-file backend**: All routes in `server.js` keeps context clear
- **Minimal comments**: Code should be self-explanatory where possible
- **Client-side pagination**: Keeps the server stateless and lightweight
- **Simulated registry**: Certificate verification is hardcoded to demonstrate the flow without external API dependencies

## Common Issues

**Cannot connect to database?**
- Check MySQL is running
- Verify `.env` has correct credentials
- Import `skilllink.sql` first

**Port 3000 already in use?**
- Change the `PORT` in `.env`
- Or kill the process: `lsof -ti:3000 | xargs kill -9`

**Artisan not showing up in job matches?**
- Make sure artisan is verified by admin
- Check their location is set on their profile
- Verify the job skill matches their trade

## Future Enhancements

- Real payment gateway integration (M-Pesa API)
- Real-time notifications and chat
- Mobile app version
- Multi-county support
- Integration with actual national certification databases
- Push notifications
- Advanced analytics for admins

## License

This is a student project. Feel free to use it for learning or as a reference for building similar platforms.

## Author

Built by Maina Kamau, for my 2nd year project at the University of Nairobi.
