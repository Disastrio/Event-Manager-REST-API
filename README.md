# Campus Events API

A production-minded REST API for a college event platform. It handles student
sign-up and login, event CRUD for admins, event registration and cancellation,
role-based access, validation, pagination/search, rate limiting and automated
tests.

Built with **Node.js, Express and MongoDB (Mongoose)**. Backend only — no UI.
Interactive documentation is served with **Swagger UI**.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [API documentation](#api-documentation)
- [Endpoint summary](#endpoint-summary)
- [Roles and permissions](#roles-and-permissions)
- [Usage examples](#usage-examples)
- [Response format](#response-format)
- [Error codes](#error-codes)
- [Testing](#testing)
- [Docker](#docker)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Design decisions](#design-decisions)
- [Scripts](#scripts)
- [License](#license)

---

## Features

### Core requirements

- **Sign up / log in** with email + password.
- **Event CRUD** — create, read, update and delete events.
- **MongoDB** persistence through Mongoose.
- **Swagger UI** documentation generated from a checked-in OpenAPI 3.0 spec.
- **Hashed passwords** with bcrypt; **JWT** access tokens.
- **Register for / cancel** an event.
- **Validation** on every write endpoint with field-level error details.
- **Consistent error responses** with stable machine-readable error codes.

### Bonus features

- **Admin and student roles** with ownership checks (organizers can manage their
  own events; admins can manage everything).
- **No duplicate registrations** — enforced by a unique compound index
  `{ event, user }` and an explicit application check.
- **No overselling** — seats are reserved with an atomic conditional update.
- **Pagination, search, filtering and sorting** on events, users and
  registrations.
- **Rate limiting** — broad API limit plus a stricter limit on login/register.
- **75 automated integration tests** against a real in-memory MongoDB.
- **Seed script** with an admin account and sample events.
- **Docker / Docker Compose** and a **Render blueprint** for deployment.
- **Postman collection** included (`docs/postman_collection.json`).
- Security headers (`helmet`), CORS configuration, request logging (`morgan`),
  graceful shutdown and a health endpoint.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 18+ (tested on Node 24) |
| Web framework | Express 4 |
| Database | MongoDB 7 + Mongoose 8 |
| Auth | JSON Web Tokens (`jsonwebtoken`) |
| Password hashing | `bcryptjs` (cost 12 by default) |
| Validation | `express-validator` |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Documentation | OpenAPI 3.0 + `swagger-ui-express` |
| Logging | `morgan` |
| Tests | Jest + Supertest + `mongodb-memory-server` |
| Container | Docker / Docker Compose |

---

## Quick start

### Prerequisites

- Node.js **18 or newer** and npm
- MongoDB **6/7** — local, Docker, or a free MongoDB Atlas cluster

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at least `MONGODB_URI` and a strong `JWT_SECRET`.
Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

For local development the defaults point at `mongodb://127.0.0.1:27017/campus_events`.

### 3. Start MongoDB

Using Docker (easiest):

```bash
docker run -d --name campus-mongo -p 27017:27017 mongo:7
```

Or use a local MongoDB service, or an Atlas connection string.

### 4. Seed an admin and sample data

```bash
npm run seed
```

This creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` and (when
`SEED_SAMPLE_DATA=true`) five sample events. The script is idempotent.

### 5. Run the server

```bash
npm run dev     # nodemon, reloads on changes
# or
npm start
```

- API base: `http://localhost:5000/api/v1`
- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs.json`
- Health check: `http://localhost:5000/api/v1/health`

Log in with the seeded admin (defaults: `admin@campus.edu` / `Admin@12345` —
change these in `.env`).

---

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `development`, `test` or `production`. |
| `PORT` | no | `5000` | HTTP port. |
| `MONGODB_URI` | yes | local Mongo URI | MongoDB connection string. |
| `JWT_SECRET` | yes in prod | dev fallback | Signing key. **Required, 32+ chars in production.** |
| `JWT_EXPIRES_IN` | no | `7d` | Token lifetime (e.g. `1h`, `7d`). |
| `BCRYPT_ROUNDS` | no | `12` | bcrypt cost factor. |
| `CORS_ORIGIN` | no | `*` | `*` or comma-separated allowed origins. |
| `RATE_LIMIT_WINDOW_MS` | no | `900000` | Global rate-limit window (15 min). |
| `RATE_LIMIT_MAX` | no | `100` | Requests per window per IP. |
| `AUTH_RATE_LIMIT_MAX` | no | `10` | Login/register attempts per window per IP. |
| `ADMIN_NAME` | no | `Platform Admin` | Seed admin display name. |
| `ADMIN_EMAIL` | no | `admin@campus.edu` | Seed admin email. |
| `ADMIN_PASSWORD` | no | `Admin@12345` | Seed admin password. |
| `SEED_SAMPLE_DATA` | no | `true` | Create sample events if the collection is empty. |
| `SEED_RESET_ADMIN_PASSWORD` | no | `false` | Reset the seed admin password on `npm run seed`. |

---

## API documentation

Interactive docs: **`/api-docs`** (Swagger UI). The raw spec is at
**`/api-docs.json`** and lives in [`src/docs/openapi.js`](src/docs/openapi.js).

To try protected endpoints:

1. Call `POST /api/v1/auth/register` or `POST /api/v1/auth/login`.
2. Copy `data.token` from the response.
3. Click **Authorize** in Swagger UI and paste the token (without `Bearer`).
4. The token is persisted across page reloads.

A Postman collection is also included at
[`docs/postman_collection.json`](docs/postman_collection.json). Import it into
Postman; it uses `{{baseUrl}}` and automatically saves the token and event id.

---

## Endpoint summary

Base URL: `/api/v1`

### Auth

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Create a student account, returns a JWT. |
| `POST` | `/auth/login` | Public | Log in, returns a JWT. |
| `GET` | `/auth/me` | Authenticated | Current user profile. |
| `PATCH` | `/auth/me` | Authenticated | Update display name. |

### Events

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/events` | Public | Paginated list with `search`, `category`, `status`, `sort`. |
| `GET` | `/events/categories` | Public | Distinct categories for filter UIs. |
| `GET` | `/events/:id` | Public | Event detail. Adds `isRegistered` when authenticated. |
| `POST` | `/events` | Admin | Create an event. |
| `PATCH` | `/events/:id` | Admin / organizer | Partial update. |
| `DELETE` | `/events/:id` | Admin / organizer | Delete event and its registrations. |

### Registrations

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/events/:id/register` | Authenticated | Register for an event. |
| `DELETE` | `/events/:id/register` | Authenticated | Cancel your registration. |
| `GET` | `/registrations/me` | Authenticated | Your registrations, paginated. |
| `GET` | `/events/:id/registrations` | Admin / organizer | Attendee list, paginated. |

### Users and system

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/users` | Admin | Paginated user list with search and role filter. |
| `PATCH` | `/users/:id/role` | Admin | Promote/demote a user. |
| `GET` | `/health` | Public | Liveness, database state and uptime. |

Query parameters for list endpoints: `page` (default `1`), `limit` (default
`10`, max `100`). Events additionally accept `search`, `category`, `status`,
`sort`; users accept `search`, `role`; registrations accept `status`.

Sorting: `sort=startDate` is ascending, `sort=-startDate` descending. Allowed
fields are `createdAt`, `startDate`, `title`, `capacity`, `registeredCount`.

---

## Roles and permissions

| Action | Student | Admin | Event organizer |
| --- | --- | --- | --- |
| Browse published events | Yes | Yes | Yes |
| See draft/cancelled events | No | Yes | Yes |
| Create events | No | Yes | — |
| Update/delete an event | No | Yes | Yes (own events) |
| View an event’s attendee list | No | Yes | Yes (own events) |
| Register / cancel for an event | Yes | Yes | Yes |
| List users / change roles | No | Yes | No |

Public registration always creates a `student`. To get an admin:

- run `npm run seed` (uses `ADMIN_EMAIL` / `ADMIN_PASSWORD`), or
- let an existing admin promote a user via `PATCH /users/:id/role`.

Admins cannot demote themselves, and the last remaining admin cannot be
demoted.

---

## Usage examples

### Register

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ada Lovelace",
    "email": "ada@campus.edu",
    "password": "Passw0rd123"
  }'
```

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "665f1c2b8f1b2c0012a4d9e1",
      "name": "Ada Lovelace",
      "email": "ada@campus.edu",
      "role": "student",
      "createdAt": "2026-10-25T12:00:00.000Z",
      "updatedAt": "2026-10-25T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Log in

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@campus.edu","password":"Passw0rd123"}'
```

### Create an event (admin)

```bash
curl -X POST http://localhost:5000/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Annual Hackathon 2026",
    "description": "A 24-hour hackathon for students across all departments.",
    "category": "Technology",
    "location": "Main Auditorium, Block A",
    "startDate": "2026-11-20T09:00:00.000Z",
    "endDate": "2026-11-21T09:00:00.000Z",
    "capacity": 200
  }'
```

### Browse with search, filter, pagination and sorting

```bash
curl "http://localhost:5000/api/v1/events?search=hackathon&category=Technology&page=1&limit=10&sort=startDate"
```

### Register for an event

```bash
curl -X POST http://localhost:5000/api/v1/events/$EVENT_ID/register \
  -H "Authorization: Bearer $TOKEN"
```

### Cancel a registration

```bash
curl -X DELETE http://localhost:5000/api/v1/events/$EVENT_ID/register \
  -H "Authorization: Bearer $TOKEN"
```

### List my registrations

```bash
curl "http://localhost:5000/api/v1/registrations/me?status=registered&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Response format

**Success**

```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

`meta` is only present on paginated endpoints. `DELETE /events/:id` returns
`204 No Content`.

**Error**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Please provide a valid email address" },
      { "field": "password", "message": "Password must be between 8 and 72 characters" }
    ]
  }
}
```

---

## Error codes

| HTTP | Code | When |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Malformed request / event not open / already started. |
| 400 | `INVALID_ID` | Invalid MongoDB id in a path parameter. |
| 400 | `INVALID_JSON` | Request body is not valid JSON. |
| 401 | `MISSING_TOKEN` | No `Authorization: Bearer` header. |
| 401 | `INVALID_TOKEN` / `TOKEN_EXPIRED` | Bad or expired JWT. |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password (generic by design). |
| 403 | `INSUFFICIENT_ROLE` | Role is not allowed for the endpoint. |
| 403 | `NOT_EVENT_OWNER` | Not the organizer and not an admin. |
| 404 | `EVENT_NOT_FOUND` | Event does not exist or is hidden. |
| 404 | `REGISTRATION_NOT_FOUND` | No active registration to cancel. |
| 404 | `ROUTE_NOT_FOUND` | Unknown route. |
| 409 | `EMAIL_TAKEN` | Email already registered. |
| 409 | `ALREADY_REGISTERED` | Duplicate registration. |
| 409 | `EVENT_FULL` | No seats remaining. |
| 409 | `CAPACITY_BELOW_REGISTRATIONS` | Capacity update would drop existing attendees. |
| 409 | `CANNOT_DEMOTE_SELF` / `LAST_ADMIN` | Invalid role change. |
| 422 | `VALIDATION_ERROR` | Schema or field validation failed. |
| 429 | `RATE_LIMITED` | Rate limit exceeded. |
| 500 | `INTERNAL_ERROR` | Unexpected server error (details hidden in production). |

---

## Testing

The suite uses Jest, Supertest and `mongodb-memory-server`, so it exercises real
MongoDB queries and indexes — no database mocking. The first run downloads a
MongoDB binary (needs network once; cached afterwards).

```bash
npm test
npm run coverage
```

Coverage areas:

- Registration, login, password hashing, token handling and `/me`.
- Event CRUD, authorization, validation, pagination, search, filtering, sorting.
- Register, duplicate prevention, capacity limits, cancel and re-register.
- `registeredCount` consistency and unique-index behaviour.
- Admin user listing, role changes, self-demotion protection.
- Health endpoint and 404 handling.

Current result: **75 tests passing**. Coverage from `npm run coverage`:
**92% statements / 94% lines**.

---

## Docker

Build and run the API + MongoDB together:

```bash
# Start API and MongoDB
JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" \
  docker compose up --build -d

# Create the admin and sample events
docker compose exec api npm run seed
```

The API is available at `http://localhost:5000` and Swagger at
`/api-docs`. Data is persisted in the `mongo-data` volume.

Build only the image:

```bash
docker build -t campus-events-api .
docker run --rm -p 5000:5000 \
  -e MONGODB_URI="mongodb://host.docker.internal:27017/campus_events" \
  -e JWT_SECRET="replace-with-a-32-char-secret" \
  campus-events-api
```

---

## Deployment

The repo is deployment-ready. A suggested free setup:

### 1. MongoDB Atlas

1. Create a free **M0** cluster at MongoDB Atlas.
2. Add a database user (Atlas → Database Access).
3. Allow network access (Atlas → Network Access). For Render, `0.0.0.0/0` is the
   simplest option; restrict it if you have static egress IPs.
4. Copy the connection string and append a database name, e.g.
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/campus_events?retryWrites=true&w=majority`.

### 2. Render (or Railway / Fly.io)

**Render:** create a new **Web Service** from this repository.

- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/api/v1/health`
- Environment variables:
  - `NODE_ENV=production`
  - `MONGODB_URI=<Atlas URI>`
  - `JWT_SECRET=<random 48-byte hex>`
  - `CORS_ORIGIN=*` (or your front-end origin)
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (used only by the seed script)

A [`render.yaml`](render.yaml) blueprint is included; it generates `JWT_SECRET`
and asks for `MONGODB_URI` on first deploy.

**Railway:** deploy from the repo (it detects Node) or use the included
Dockerfile, add the same environment variables, and generate a public domain.

### 3. Seed production

Run `npm run seed` once from the platform shell (Render Shell / Railway shell),
or set `SEED_SAMPLE_DATA=false` if you do not want demo events.

### 4. Verify public links

After deployment, open these in a private/incognito window:

- `https://<your-service>/api/v1/health`
- `https://<your-service>/api-docs`
- `https://<your-service>/api-docs.json`

> **Submission checklist:** replace the placeholders below with your live URLs
> and confirm they load without authentication.
>
> - Live API: `https://<your-service>.onrender.com`
> - Swagger docs: `https://<your-service>.onrender.com/api-docs`
> - Repository: `https://github.com/<you>/campus-events-api`

**Never commit `.env` or real secrets.** `.gitignore` already excludes them;
only `.env.example` is tracked.

---

## Project structure

```
.
├── src/
│   ├── app.js                 # Express app (middleware, routes, docs, errors)
│   ├── server.js              # HTTP server + graceful shutdown
│   ├── seed.js                # Admin and sample-data seed script
│   ├── config/
│   │   ├── env.js             # Environment parsing and production guards
│   │   └── db.js              # Mongoose connection helpers
│   ├── controllers/           # Request handlers (auth, events, registrations, users)
│   ├── docs/
│   │   └── openapi.js         # OpenAPI 3.0 specification
│   ├── middleware/
│   │   ├── auth.js            # JWT auth, optional auth, role guard
│   │   ├── error.js           # Central error handler
│   │   ├── validate.js        # express-validator result handling
│   │   ├── rateLimit.js       # Global and auth limiters
│   │   └── notFound.js
│   ├── models/
│   │   ├── User.js            # bcrypt hooks, roles, password compare
│   │   ├── Event.js           # Dates, capacity, text index, virtuals
│   │   └── Registration.js    # Unique { event, user } index
│   ├── routes/                # Versioned /api/v1 routers
│   ├── utils/                 # ApiError, JWT, responses, pagination, async wrapper
│   └── validators/            # express-validator schemas per resource
├── tests/                     # Jest integration tests + in-memory MongoDB setup
├── docs/
│   └── postman_collection.json
├── Dockerfile
├── docker-compose.yml
├── render.yaml
├── .env.example
└── README.md
```

---

## Design decisions

- **Stateless JWT auth.** Tokens carry the user id and role, expire in 7 days by
  default, and are signed with an issuer/audience pair. Passwords are hashed
  with bcrypt (cost 12) and `password` is `select: false`, so it cannot leak by
  accident.
- **Duplicate registrations are impossible.** A unique compound index on
  `{ event, user }` backs the application check. Cancelling flips the status to
  `cancelled` rather than deleting the row, which preserves history and lets a
  user re-register by reactivating the same record.
- **No overselling under concurrency.** A seat is reserved with a single
  conditional `findOneAndUpdate` that increments `registeredCount` only when
  `registeredCount < capacity` and the event is published. If the following
  insert fails, the seat is released.
- **Denormalized `registeredCount`.** It makes listing and "is it full?" checks
  cheap. It is updated atomically and kept consistent on cancel/delete.
- **Public reads, protected writes.** Published events are publicly browsable,
  which suits a campus catalogue. Drafts and cancelled events are hidden from
  students (404 rather than 403, to avoid leaking existence).
- **Validation at the edge plus model-level guards.** express-validator returns
  field-level `422` details; Mongoose still enforces invariants (dates, enums,
  unique indexes) as a second line of defence.
- **Stable error contract.** Every failure is
  `{ success: false, error: { code, message, details? } }`, making clients easy
  to write and tests easy to assert.
- **Real database tests.** `mongodb-memory-server` runs the actual MongoDB
  engine, so indexes, atomic updates and Mongoose behaviour are covered.

### Possible next steps

Refresh tokens, email verification and password reset, event images, waitlists,
organizer analytics, audit logs, and idempotency keys for registration.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the API. |
| `npm run dev` | Start with nodemon. |
| `npm run seed` | Create/update the admin and optional sample events. |
| `npm test` | Run all 75 integration tests. |
| `npm run test:watch` | Watch mode. |
| `npm run coverage` | Tests with coverage report. |

---

## License

MIT
