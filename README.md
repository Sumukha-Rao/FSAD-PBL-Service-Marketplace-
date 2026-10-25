# HomeEase

A home-service broker marketplace for Bengaluru. Customers book a service, and the platform
**automatically assigns** an available professional. Built with MongoDB, Express, React and Node.

The full design is in [prd.md](./prd.md).

## Requirements

- Node.js 22.12+ or 24 LTS
- Docker Desktop (for MongoDB), or a local MongoDB install

## Run it

```bash
# 1. Start MongoDB
docker compose up -d

# 2. Backend (http://localhost:5000)
cd backend
npm ci
cp .env.example .env
# Edit .env: set a private random JWT_SECRET and your own ADMIN_PASSWORD.
npm run seed        # creates the admin account and 6 services
npm run dev

# 3. Frontend (http://localhost:5173), in a second terminal
cd frontend
npm ci
npm run dev
```

The home page shows "API ok, database connected" when everything is running.

Admin login (after seeding): the `ADMIN_EMAIL` / `ADMIN_PASSWORD` values in `backend/.env`.

## Project structure

```
backend/
  server.js            Express app, routes, error handler
  seed.js              admin + starter services
  config/db.js         MongoDB connection
  middleware/auth.js   protect, allow(...roles)
  models/              User, Service, Booking
  controllers/         authController, serviceController, bookingController
  routes/              authRoutes, serviceRoutes, bookingRoutes
  utils/assign.js      auto-assignment
frontend/
  src/main.js          entry point
  src/App.js           navbar + routes
  src/api.js           fetch wrapper
  src/AuthContext.js   logged-in user
  src/pages/           one file per page
```

All three member workflows are implemented:

- Customers browse active services by category, book a future date and slot, see the assigned
  professional and price, cancel before the booking day, pay after completion, and review once.
- Professionals select services and prices, PIN codes and working days. Once approved, they can
  view jobs, start and complete them, decline before the booking day, and record cash received.
- Admins approve professionals, create/edit/deactivate services, and view all bookings. The admin
  catalog also shows inactive services through `GET /api/admin/services`.

Assignment filters eligible professionals, ranks them by daily workload, and retries another
candidate when MongoDB's unique reservation index detects a competing booking. Declines use the
same assignment rules and cancel when no replacement is available. Dates and slots use IST.
The backend waits for the reservation index before accepting requests.

To try the workflow, seed the catalog/admin, register a professional, configure their profile,
and approve them from the admin account. Register a customer in a separate browser session
and book a service for a PIN code and weekday covered by that professional.

## Validation

With MongoDB running:

```bash
cd backend
npm test
cd ../frontend
npm run build
```

The API integration tests start the real server in a child process with an isolated, temporary
MongoDB database and delete only that database after the run. Set `TEST_MONGO_URI` if MongoDB is
not at `mongodb://127.0.0.1:27017`. The tests cover catalog/profile validation, authorization,
assignment eligibility and fairness, concurrent reservations, cancellation, decline/reassignment,
status transitions, competing payment methods, and one-time reviews.

## Who owns what

| Member | Area | Files |
|---|---|---|
| 1 | Auth & users | `models/User.js`, `middleware/auth.js`, `authController.js`, `authRoutes.js`, `AuthContext.js`, `Login.js`, `Register.js`, `AdminPros.js` |
| 2 | Services & profiles | `models/Service.js`, `serviceController.js`, `serviceRoutes.js`, `Services.js`, `ProProfile.js`, `AdminServices.js` |
| 3 | Bookings & auto-assign | `models/Booking.js`, `utils/assign.js`, `bookingController.js`, `bookingRoutes.js`, `BookService.js`, `MyBookings.js`, `ProJobs.js`, `AdminBookings.js` |

Auth is done: use `protect` and `allow("role")` on routes, `req.user` in controllers, and
`const { user } = useAuth();` in pages. Approved professionals have `approvalStatus: "approved"`.

## Code style

- ES modules (`import` / `export`), `async/await`.
- React function components and hooks, no JSX: `const e = React.createElement;`.
- MVC: routes call controllers, controllers use models.
- Errors: `res.status(code).json({ message })`.

## Git workflow

```bash
git checkout main
git pull
git checkout -b feat/auth          # feat/services, feat/booking, ...
# work and commit
git push -u origin feat/auth
```

Then open a pull request into `main`. One teammate reviews before merging. Never commit `.env`
or `node_modules/`.

## Configuration notes

Set `JWT_SECRET` and `ADMIN_PASSWORD` before starting/seeding; the example placeholders are
rejected. Production HTTPS deployments should set `NODE_ENV=production` to use Secure cookies.
The Docker database port is bound to localhost. Registration normalizes email addresses and
rejects passwords beyond bcrypt's 72-byte limit rather than silently truncating them.

A professional approved in another session can use **Refresh bookings** on the jobs page;
the API checks the current approval status. Concurrent admin edits return a conflict instead
of overwriting another edit and potentially invalidating the service price range.

Reviews are stored on bookings, while professional rating totals are updated in a separate
write. With the PRD's standalone MongoDB setup, a database interruption between those writes
can leave totals stale; rebuild them from booking reviews before using aggregate ratings for
production decisions. Normal requests and concurrent duplicate reviews are covered by tests.
