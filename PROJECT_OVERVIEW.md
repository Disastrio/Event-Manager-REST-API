# Campus Events API — Project Overview

> A backend-only REST API for a college event platform. Students sign up, browse
> events, and reserve seats. Admins (and event owners) create and manage events.
> Everything is exposed as JSON over `/api/v1`, with interactive Swagger docs.

- **Repository name:** `Event-Manager-REST-API`
- **Package name:** `campus-events-api`
- **Version:** 1.0.0
- **License:** MIT
- **Entry point:** `src/server.js`
- **Detailed reference:** [README.md](README.md)
- **Deployment guide:** [DEPLOYMENT_AND_OPERATIONS.md](DEPLOYMENT_AND_OPERATIONS.md)

---

## 1. What this project is

This is the **server side only** of a campus/college event manager. There is no
HTML UI, no frontend framework, and no server-rendered pages (apart from Swagger
UI). A separate web or mobile client is expected to consume the JSON API.

It solves a small but complete set of problems:

1. **Account management** — students register and log in with email + password.
2. **Event catalogue** — anyone can browse published events, search them, filter
   by category, and paginate the results.
3. **Event management** — admins create events; the creator of an event (and any
   admin) can edit or delete it.
4. **Registration** — authenticated users reserve a seat, cancel it, and view
   their registrations. Capacity is enforced, and duplicate registrations are
   impossible.
5. **Administration** — admins list users and promote/demote roles safely.
6. **Operability** — health check, structured errors, rate limits, request logs,
   graceful shutdown, Docker, and a Render blueprint.

### What it is not

- Not a full-stack app: there is no frontend, email service, payment flow, file
  upload, or background job worker.
- Not multi-tenant: one deployment serves one campus/organisation.
- Not a replacement for an identity provider: auth is self-contained JWT.
- Not a real-time system: no WebSockets or push notifications.

---

## 2. Who uses it

There are only **two roles** in the database: `student` and `admin`.

| Actor | How they get the role | What they can do |
| --- | --- | --- |
| **Visitor** (no token) | — | Browse published events, view event details, list categories, read health/docs. |
| **Student** | Public `POST /auth/register` always creates a student | Everything a visitor can do, plus register/cancel for events and manage their own profile. |
| **Admin** | Created by the seed script, or promoted by an existing admin | Create events, manage any event, view attendee lists, list users, change roles. |
| **Event organizer** | Not a role — it is the `organizer` field on an event | Can edit/delete **their own** event and see its attendee list, even if they are not an admin. |

> Important nuance: "organizer" is **ownership**, not a third role. In practice
> only admins can create events, but ownership is checked separately so a
> demoted admin still controls events they created.

Role guards are enforced on the server. `authenticate` reloads the user from
MongoDB on every request, so a role change takes effect immediately even if the
user still holds an old JWT. The `role` claim inside the token is informational;
authorization uses the fresh database record.

---

## 3. Feature tour

### Authentication and profile

- Register with name, email, password (password is hashed before storage).
- Log in and receive a signed JWT (default lifetime `7d`).
- `GET /auth/me` returns the current profile.
- `PATCH /auth/me` updates the display name.
- Login errors are deliberately generic to prevent email enumeration.
- Passwords are `select: false` in Mongoose and stripped from JSON output.

### Events

- Public, paginated event list with:
  - `search` across title, description, and location (case-insensitive),
  - exact-but-case-insensitive `category` filter,
  - `status` filter for admins,
  - sorting on `createdAt`, `startDate`, `title`, `capacity`,
    `registeredCount` (`-field` for descending),
  - `page` / `limit` with a hard maximum of 100.
- Distinct category list for filter UIs.
- Event detail includes `isRegistered` when the caller is authenticated.
- Draft/cancelled events are hidden from non-owners with **404**, not 403, so
  their existence is not leaked.
- Full CRUD for admins; update/delete for the event owner.
- Deleting an event also deletes its registrations.

### Registrations

- Register for a published event that has not started yet.
- Capacity is enforced atomically — concurrent requests cannot oversell.
- A unique compound index `{ event, user }` prevents duplicate rows.
- Cancelling flips the record to `cancelled` and releases the seat; registering
  again reactivates the same row rather than creating a duplicate.
- Students see their own registrations, paginated and filterable by status.
- Admins and the event owner see the attendee list.

### Administration

- Paginated user list with `search` (name/email) and `role` filter.
- Promote or demote users.
- Guards: an admin cannot demote themselves, and the last remaining admin
  cannot be demoted.

### Platform concerns

- Consistent success/error envelopes with stable machine-readable codes.
- Request validation with field-level `422` details.
- Global rate limit plus a stricter limit on login/register.
- Helmet security headers, configurable CORS, Morgan request logs.
- `GET /api/v1/health` with DB state and uptime.
- Swagger UI at `/api-docs`, raw OpenAPI at `/api-docs.json`.
- 75 integration tests against a real in-memory MongoDB.
- Seed script for an admin and five sample events.
- Dockerfile, Docker Compose, Render blueprint, Postman collection.
- Graceful shutdown on `SIGINT`/`SIGTERM` with a 10-second force-exit fallback.

---

## 4. What is used, and why

### Runtime and core libraries

| Layer | Choice | Why it is used | Notable alternative |
| --- | --- | --- | --- |
| Runtime | **Node.js 18+** | Non-blocking I/O suits a JSON API; the same language as the tooling; small Docker image. `engines` requires ≥18; Docker uses Node 22. | Deno, Bun |
| Web framework | **Express 4** | Minimal, ubiquitous, huge middleware ecosystem. Routing is easy to read and extend. | Fastify, Koa, NestJS |
| Database | **MongoDB 7** | Documents map naturally to events and registrations; flexible category/location fields; simple local/Atlas setup. | PostgreSQL |
| ODM | **Mongoose 8** | Schemas, validation, indexes, hooks, population, and typed query helpers. Adds structure without a separate migration tool. | Prisma, native driver |
| Auth | **jsonwebtoken** | Stateless access tokens let any number of API instances authenticate without shared session storage. | Sessions + Redis, OAuth/OIDC |
| Password hashing | **bcryptjs** | Pure-JS bcrypt avoids native build issues in Alpine/Docker; automatic per-password salt; tunable cost. | `argon2`, `bcrypt` (native) |
| Validation | **express-validator** | Declarative per-route schemas that run before controllers and produce field-level messages. | Joi, Zod, `joi` |
| Security headers | **helmet** | Sensible defaults (`nosniff`, frame denial, HSTS in production, etc.) with almost no code. | Manual headers |
| CORS | **cors** | Lets a separate frontend origin call the API without ad-hoc headers. | Manual middleware |
| Rate limiting | **express-rate-limit** | In-memory fixed-window limits protect login and the whole API from brute force/abuse. | Redis-backed limiter, gateway limit |
| API docs | **swagger-ui-express + OpenAPI 3.0** | The spec is checked in as JavaScript, so docs are versioned with the code and testable. Swagger UI is interactive. | Redoc, Postman-only |
| Logging | **morgan** | One line per request in dev, combined Apache-style logs in production. | pino, winston |
| Config | **dotenv** | Twelve-factor config from environment variables; `.env.example` documents them. | `convict`, platform config |
| Tests | **Jest + Supertest** | HTTP-level integration tests, no server port required, familiar assertions. | Vitest, Mocha + chai |
| Test DB | **mongodb-memory-server** | Runs the **real MongoDB engine** in-process, so indexes, atomic updates, and Mongoose behavior are actually tested. | Mocked models, Docker Mongo |
| Container | **Docker / Compose** | Reproducible image and a one-command Mongo + API stack for demos and small deployments. | Podman, Nix |
| Deployment | **Render blueprint** | `render.yaml` captures build, start, health check, and env vars as code. Also works on Railway/Fly/VPS. | Heroku, AWS ECS |

### Why these choices together

- **Express + Mongoose + JWT** is the smallest stack that still demonstrates a
  realistic production API: routing, persistence, auth, validation, docs, tests.
- **Stateless JWT** means the API can scale horizontally without sticky sessions.
- **MongoDB** fits the event domain: categories and locations are free-form, and
  a registration is naturally a join document.
- **express-validator + Mongoose validation** is defense in depth: clear client
  errors at the edge and invariants in the model.
- **Real MongoDB in tests** catches the bugs mocks miss — especially unique
  indexes and the conditional seat reservation.
- **OpenAPI checked in** keeps the documented contract versioned with the code;
  tests verify the spec is valid, has no broken `$ref`s, and gives every
  documented operation a summary and responses.

---

## 5. Architecture

### Request lifecycle

```text
Client
  │  HTTP + JSON
  ▼
Express app (src/app.js)
  ├─ trust proxy ────────────── correct client IP behind Render/Railway
  ├─ helmet ─────────────────── security headers
  ├─ cors ───────────────────── allowed origins
  ├─ express.json (1 MB) ────── body parsing
  ├─ morgan ─────────────────── request logging (off in tests)
  ├─ global rate limit
  ├─ "/" service metadata
  ├─ /api/v1 router
  │    ├─ /auth
  │    ├─ /events
  │    ├─ /registrations
  │    ├─ /users
  │    └─ /health
  ├─ /api-docs (Swagger UI)
  ├─ /api-docs.json (raw spec)
  ├─ notFound ───────────────── structured 404
  └─ errorHandler ───────────── normalized error envelope
```

Each resource is split into four layers:

```text
routes/         URL + middleware chain (auth, role, validation)
validators/     express-validator rules for body/params/query
controllers/    business logic, database calls, authorization checks
models/         Mongoose schema, indexes, hooks, virtuals
```

Cross-cutting helpers live in `utils/` (`ApiError`, `asyncHandler`,
`sendSuccess`, JWT signing, pagination/regex escaping) and `middleware/`.

### Startup and shutdown

1. `src/server.js` loads config and connects to MongoDB.
2. If the connection fails, it logs and exits with code 1 (fail fast).
3. It starts Express on `PORT` (default 5000).
4. On `SIGINT`/`SIGTERM`, it stops accepting connections, disconnects from
   MongoDB, and exits 0; a 10-second timer forces exit if something hangs.

Connection setup is in `src/config/db.js`; environment parsing and production
guards are in `src/config/env.js`.

---

## 6. Data model

```text
User (1) ───< Event.organizer
User (1) ───< Registration.user >─── (1) Event
```

### User

| Field | Type | Rules |
| --- | --- | --- |
| `name` | String | required, 2–80 chars, trimmed |
| `email` | String | required, unique, lowercased, trimmed, regex-validated |
| `password` | String | required, min 8, `select: false`, hashed by a `pre('save')` hook |
| `role` | String | `student` or `admin`, default `student`, indexed |
| `createdAt` / `updatedAt` | Date | Mongoose timestamps |

- `toJSON` removes `_id`, `password`, and `__v`.
- `comparePassword()` uses bcrypt; the hash is only loaded when explicitly
  selected.
- `User.ROLES` exposes the allowed roles.

### Event

| Field | Type | Rules |
| --- | --- | --- |
| `title` | String | required, 3–120 chars |
| `description` | String | required, 10–5000 chars |
| `category` | String | required, 2–50 chars, indexed |
| `location` | String | required, 2–200 chars |
| `startDate` | Date | required, indexed, must be in the future on create |
| `endDate` | Date | required, must be after `startDate` |
| `capacity` | Number | required, integer 1–100000 |
| `status` | String | `draft`, `published`, `cancelled`, `completed`; default `published` |
| `organizer` | ObjectId → User | required, indexed |
| `registeredCount` | Number | denormalized counter, default 0, min 0 |
| `createdAt` / `updatedAt` | Date | timestamps |

- Virtuals: `isFull` and `seatsRemaining`.
- Compound index `{ status: 1, startDate: 1 }` for public listing.
- Text index on `title` and `description` exists for potential `$text` search;
  the current search implementation uses escaped regexes to support partial
  matches.
- `pre('validate')` rejects an end date that is not after the start date.

### Registration

| Field | Type | Rules |
| --- | --- | --- |
| `event` | ObjectId → Event | required, indexed |
| `user` | ObjectId → User | required, indexed |
| `status` | String | `registered` or `cancelled`, default `registered` |
| `registeredAt` | Date | default now; refreshed on re-registration |
| `cancelledAt` | Date | default null; unset on re-registration |
| `createdAt` / `updatedAt` | Date | timestamps |

Indexes:

- **Unique** `{ event: 1, user: 1 }` — one row per user per event, ever.
- `{ user: 1, status: 1, createdAt: -1 }` — fast "my registrations" listing.

### Why `registeredCount` is denormalized

Counting registrations on every list request would be expensive. The counter
makes "is it full?" and event listings cheap. Consistency is preserved by:

- an **atomic conditional update** that increments only when
  `registeredCount < capacity` and the event is `published`,
- a compensating decrement if the registration insert fails,
- a decrement on cancellation (guarded so it never goes below zero),
- deleting all registrations when the event is deleted.

This is the most important piece of engineering in the project: seat reservation
is safe under concurrency without transactions.

---

## 7. API surface

Base URL: `/api/v1`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public (strict rate limit) | Create a student, return JWT |
| `POST` | `/auth/login` | Public (strict rate limit) | Log in, return JWT |
| `GET` | `/auth/me` | Authenticated | Current profile |
| `PATCH` | `/auth/me` | Authenticated | Update display name |
| `GET` | `/events` | Public | Paginated/searchable list |
| `GET` | `/events/categories` | Public | Distinct categories |
| `GET` | `/events/:id` | Public (personalized if authed) | Event detail |
| `POST` | `/events` | Admin | Create event |
| `PATCH` | `/events/:id` | Admin or owner | Partial update |
| `DELETE` | `/events/:id` | Admin or owner | Delete event + registrations |
| `POST` | `/events/:id/register` | Authenticated | Reserve a seat |
| `DELETE` | `/events/:id/register` | Authenticated | Cancel registration |
| `GET` | `/events/:id/registrations` | Admin or owner | Attendee list |
| `GET` | `/registrations/me` | Authenticated | My registrations |
| `GET` | `/users` | Admin | User list |
| `PATCH` | `/users/:id/role` | Admin | Change role |
| `GET` | `/health` | Public | Liveness/DB/uptime |

Also served outside `/api/v1`:

- `GET /` — service metadata.
- `GET /api-docs` — Swagger UI.
- `GET /api-docs.json` — OpenAPI 3.0 document.

### Response contract

Success:

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 10 } }
```

Errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "Please provide a valid email address" }]
  }
}
```

`meta` appears only on paginated endpoints. `DELETE /events/:id` returns
`204 No Content`. In non-production, 5xx errors also include `error.stack`.

---

## 8. Security model

| Concern | Implementation |
| --- | --- |
| Password storage | bcrypt with cost 12 by default (`BCRYPT_ROUNDS`), per-password salt, hash hidden from queries and JSON |
| Authentication | Signed JWT with issuer + audience, default 7-day expiry |
| Token transport | `Authorization: Bearer <token>` |
| Authorization | `authenticate`, `optionalAuth`, `authorize(...roles)` middleware; ownership checks in controllers |
| Input validation | express-validator at the edge; Mongoose schema validation and enums as a second layer |
| NoSQL injection | IDs validated as Mongo IDs; query strings cast/validated; search input escaped before regex use |
| Brute force | Stricter limiter on `/auth/login` and `/auth/register` (default 10 per 15 min per IP) |
| Abuse | Global limiter (default 100 per 15 min per IP) |
| Headers | Helmet; `x-powered-by` disabled |
| CORS | `*` or comma-separated allow-list; only the required methods/headers |
| Body size | JSON limit 1 MB, returns `413 PAYLOAD_TOO_LARGE` |
| Secret hygiene | `.env` gitignored; production refuses to boot with a missing/short `JWT_SECRET`; error stacks and internal details hidden in production |
| Account enumeration | Generic `INVALID_CREDENTIALS`; signup `EMAIL_TAKEN` is necessarily specific |
| Privilege safety | Cannot self-demote; cannot demote the last admin |
| Proxy awareness | `trust proxy = 1` so rate limits key on the real client IP behind one proxy |

### Validation highlights

- Password: 8–72 characters (bcrypt's safe input limit), at least one letter and
  one digit.
- Email normalized and validated before lookup.
- Event dates must be ISO 8601; start date must be in the future on create.
- Capacity must be an integer between 1 and 100000.
- Event updates reject an empty body and an unknown sort field.
- `page`/`limit` are bounded; the default is 10 and the maximum is 100.

---

## 9. Error codes

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Generic malformed/unsupported operation |
| 400 | `INVALID_ID` | Invalid ObjectId that reaches Mongoose (route validators normally return a 422 first) |
| 400 | `INVALID_JSON` | Body is not valid JSON |
| 400 | `EVENT_NOT_OPEN` | Event is not published |
| 400 | `EVENT_STARTED` | Registration closed because the event began |
| 401 | `MISSING_TOKEN` | No Bearer header |
| 401 | `INVALID_TOKEN` / `TOKEN_EXPIRED` | Bad/expired/obsolete token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 401 | `UNAUTHORIZED` | Role guard ran without a user |
| 403 | `INSUFFICIENT_ROLE` | Role not allowed |
| 403 | `NOT_EVENT_OWNER` | Not the owner or an admin |
| 404 | `EVENT_NOT_FOUND` | Missing or hidden event |
| 404 | `USER_NOT_FOUND` | Unknown user |
| 404 | `REGISTRATION_NOT_FOUND` | No active registration to cancel |
| 404 | `ROUTE_NOT_FOUND` | Unknown route |
| 409 | `EMAIL_TAKEN` | Email already registered |
| 409 | `ALREADY_REGISTERED` | Duplicate registration |
| 409 | `EVENT_FULL` | Capacity reached |
| 422 | `CAPACITY_BELOW_REGISTRATIONS` | Update would evict attendees |
| 409 | `CANNOT_DEMOTE_SELF` / `LAST_ADMIN` | Invalid role change |
| 409 | `DUPLICATE_KEY` | Generic unique-index fallback |
| 413 | `PAYLOAD_TOO_LARGE` | Body over 1 MB |
| 422 | `VALIDATION_ERROR` | Field validation failed |
| 429 | `RATE_LIMITED` | Limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

## 10. Testing and quality

```bash
npm test          # 75 integration tests
npm run coverage  # same + coverage report in coverage/
npm run test:watch
```

How the suite works:

- `tests/env.js` sets deterministic env vars **before** config loads.
- `tests/setup.js` starts `mongodb-memory-server`, connects Mongoose, and waits
  for `User.init()`, `Event.init()`, and `Registration.init()` so unique/text
  indexes exist.
- Collections are cleared after every test.
- `tests/helpers.js` creates users, events, and tokens.
- Supertest drives the Express app directly — no port binding.
- Rate limits are disabled under `NODE_ENV=test` and bcrypt rounds are lowered
  to 4 for speed.
- The first run downloads a MongoDB binary (network required once; then cached).

Current local coverage report: **485/516 lines (~94%)**, **187/259 branches
(~72%)**, across 29 source files. `server.js`, `seed.js`, and `docs/` are
excluded from coverage. Run `npm run coverage` to regenerate it.

Test areas:

- Registration, login, hashing, token edge cases, `/me`.
- Event CRUD, authorization, validation, pagination, search, filter, sort.
- Registration, duplicates, capacity, cancel, re-register, attendee access.
- `registeredCount` consistency and unique-index behavior.
- Admin user listing, role changes, self-demotion and last-admin guards.
- Health, 404s, malformed JSON, oversized payloads, expired/deleted-user tokens.
- OpenAPI validity, broken `$ref` detection, and response/summary completeness.
- Seed idempotency.

---

## 11. Project structure

```text
.
├── src/
│   ├── app.js                  # Express app: middleware, routes, docs, errors
│   ├── server.js               # Startup, DB connect, graceful shutdown
│   ├── seed.js                 # Idempotent admin + sample-event seed
│   ├── config/
│   │   ├── env.js              # Env parsing + production JWT guard
│   │   └── db.js               # Connect/disconnect/state helpers
│   ├── controllers/            # auth, event, registration, user logic
│   ├── docs/openapi.js         # OpenAPI 3.0 spec
│   ├── middleware/             # auth, errors, validation, rate limits, 404
│   ├── models/                 # User, Event, Registration
│   ├── routes/                 # /api/v1 routers
│   ├── utils/                  # ApiError, JWT, responses, pagination
│   └── validators/             # express-validator schemas
├── tests/                      # 75 Jest + Supertest integration tests
├── docs/postman_collection.json
├── coverage/                   # generated report (gitignored)
├── Dockerfile
├── docker-compose.yml
├── render.yaml
├── .env.example
├── README.md
├── PROJECT_OVERVIEW.md         # this file
└── DEPLOYMENT_AND_OPERATIONS.md
```

### Suggested reading order

1. `package.json` — scripts and dependencies.
2. `src/app.js` — how the HTTP stack is assembled.
3. `src/routes/*.js` — the public contract.
4. `src/middleware/auth.js` — authentication and roles.
5. `src/controllers/registrationController.js` — the concurrency-critical code.
6. `src/models/*.js` — schema rules and indexes.
7. `src/docs/openapi.js` — the documented contract.
8. `tests/*.test.js` — executable examples of every behavior.

---

## 12. Key design decisions

- **Stateless JWT, database-backed authorization.** Tokens scale horizontally;
  reloading the user makes role changes immediate.
- **Public reads, protected writes.** A campus catalogue should be browsable
  without login, while all mutations require authentication.
- **Hide, don't reveal.** Drafts return 404 to non-owners instead of 403.
- **Unique index + application check.** Duplicate registrations are blocked at
  both layers; the index is the final guarantee under races.
- **Atomic seat reservation.** A single conditional `findOneAndUpdate` prevents
  overselling without multi-document transactions.
- **Soft cancellation.** Registrations keep history and enable re-registration
  without duplicate rows.
- **Denormalized counter with compensating updates.** Fast reads, careful writes.
- **Stable error envelope.** Clients can branch on `error.code`, not on prose.
- **Docs as code.** OpenAPI lives beside the routes and is tested.
- **Real database tests.** Indexes and atomicity are exercised, not mocked.
- **Fail fast in production.** Missing/short `JWT_SECRET` stops startup.
- **Graceful shutdown.** Draining connections avoids dropped requests on deploy.

---

## 13. Known limitations

These are intentional scope boundaries, not bugs:

- No refresh tokens; the access token simply expires.
- No email verification, password reset, or email notifications.
- No event images or file uploads.
- No waitlist when an event is full.
- No payments or ticketing.
- No audit log or analytics.
- No idempotency keys for registration (the unique index still prevents
  duplicates, but a retried request returns `409` rather than the original
  response).
- Rate limiting is in-memory, so limits are per instance, not global across
  replicas.
- The health endpoint reports database state but still returns HTTP 200 when the
  DB is disconnected; it is a liveness check, not a strict readiness probe.
- No CI workflow is checked in (a ready-to-use one is in the deployment guide).
- `CORS_ORIGIN=*` is convenient but should be narrowed in production.

See [DEPLOYMENT_AND_OPERATIONS.md](DEPLOYMENT_AND_OPERATIONS.md) for how to
extend these areas.
