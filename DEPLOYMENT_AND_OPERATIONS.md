# Deployment, Operations & Next Steps

> Practical guide for running the Campus Events API locally, deploying it to a
> managed platform or a VPS, verifying it, operating it, and extending it.
>
> New to the project? Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) first.
> The original quick-start is in [README.md](README.md).

---

## Current deployment

> **Status: suspended.** The Render service is suspended and returns `503` until
> resumed from the Render dashboard. The MongoDB Atlas free cluster and seeded
> data remain intact, and suspended Render services are not billed.

| Item | Value |
| --- | --- |
| Public URL (when resumed) | <https://campus-events-api-19v5.onrender.com> |
| Swagger UI | <https://campus-events-api-19v5.onrender.com/api-docs> |
| OpenAPI JSON | <https://campus-events-api-19v5.onrender.com/api-docs.json> |
| Health check | <https://campus-events-api-19v5.onrender.com/api/v1/health> |
| Render service | `campus-events-api` (free plan, Oregon) |
| Database | MongoDB Atlas `campus-events` (M0, AWS `US_EAST_1`), database `campus_events` |
| Admin account | `admin@campus.edu` — password stored locally in `.env.deploy` (gitignored) |

> The Render free instance sleeps after inactivity, so the first request after a
> quiet period can take ~50 seconds. The Atlas cluster is on the free M0 tier.
> Deployment secrets live in `.env.deploy` and are intentionally excluded from
> git by the `.env.*` rule in `.gitignore`.
>
> To restore the API: Render Dashboard → `campus-events-api` → **Resume service**.

---

## 1. Choose a deployment path

| Path | Best for | Effort | Persistent DB |
| --- | --- | --- | --- |
| Local Node + local/Atlas MongoDB | Development, debugging | Low | Your choice |
| Docker Compose (API + Mongo) | Demos, self-hosting, small teams | Low | Docker volume |
| Render blueprint (`render.yaml`) | Fastest free public deployment | Very low | MongoDB Atlas |
| Render/Railway/Fly manual | Managed hosting with custom settings | Low | MongoDB Atlas |
| VPS + Docker + Caddy/Nginx | Full control, custom domains, no cold starts | Medium | Docker volume or Atlas |

The API is **stateless** (JWT auth, no server-side sessions), so it can run as
multiple replicas behind a load balancer. The only state is MongoDB.

---

## 2. Prerequisites

- **Node.js 18+** and npm (Docker image uses Node 22; README tested on Node 24).
- **MongoDB 6/7**, or a free **MongoDB Atlas M0** cluster.
- **Docker + Docker Compose** (optional, for containerized runs).
- **Git**, and an account on Render/Railway/Fly if using managed hosting.
- A way to generate a random secret (Node, OpenSSL, or a password manager).

Check versions:

```bash
node --version
npm --version
docker --version
docker compose version
```

The repo has `"engines": { "node": ">=18" }`. If your platform supports a Node
version file, pin 22 (the Docker image's version) for parity.

---

## 3. Environment variables

Copy `.env.example` to `.env` for local runs. **Never commit `.env`.**

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Set `production` in deployed environments. Enables the JWT guard, combined logs, and hides error details/stacks. |
| `PORT` | No | `5000` | The API binds to this port. Managed platforms usually inject it; the app already reads `process.env.PORT`. |
| `MONGODB_URI` | **Yes** | `mongodb://127.0.0.1:27017/campus_events` | Include the database name. URL-encode special characters in the password. |
| `JWT_SECRET` | **Yes in production** | Insecure dev fallback | Must be **≥ 32 characters** when `NODE_ENV=production`, or startup throws. Generate 48 random bytes as hex. |
| `JWT_EXPIRES_IN` | No | `7d` | Any `jsonwebtoken` duration (`1h`, `7d`). |
| `BCRYPT_ROUNDS` | No | `12` | Higher = slower login and registration. Do not lower in production. |
| `CORS_ORIGIN` | No | `*` | `*` or comma-separated origins, e.g. `https://app.example.com,https://admin.example.com`. No trailing slashes. |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | 15 minutes. |
| `RATE_LIMIT_MAX` | No | `100` | Requests per window per IP for the whole API. |
| `AUTH_RATE_LIMIT_MAX` | No | `10` | Login/register attempts per window per IP. |
| `ADMIN_NAME` | No | `Platform Admin` | Used only by `npm run seed`. |
| `ADMIN_EMAIL` | No | `admin@campus.edu` | Used only by `npm run seed`. |
| `ADMIN_PASSWORD` | No | `Admin@12345` | Used only by `npm run seed`. **Change it.** |
| `SEED_SAMPLE_DATA` | No | `true` | Creates five demo events only if the `events` collection is empty. Set `false` in production if you want a clean catalogue. |
| `SEED_RESET_ADMIN_PASSWORD` | No | `false` | Supported by `src/seed.js` but not listed in `.env.example`. Set `true` for one seed run to reset the admin password, then unset it. |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

PowerShell equivalent (same command works):

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> Production boot guard: `src/config/env.js` throws if `NODE_ENV=production` and
> `JWT_SECRET` is missing or shorter than 32 characters. This is intentional.

---

## 4. Run locally

### 4.1 Install and configure

```bash
npm install
cp .env.example .env
```

On Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` and set at least `MONGODB_URI` and `JWT_SECRET`.

### 4.2 Start MongoDB

Easiest with Docker:

```bash
docker run -d --name campus-mongo -p 27017:27017 -v campus-mongo-data:/data/db mongo:7
```

Or use a local MongoDB service, or an Atlas URI. If you use Atlas, put your
current public IP in the Atlas network allow-list (or `0.0.0.0/0` for a demo).

### 4.3 Seed and run

```bash
npm run seed     # idempotent: admin + optional sample events
npm run dev      # nodemon, reloads on change
# or
npm start
```

Open:

- API root: `http://localhost:5000/`
- API base: `http://localhost:5000/api/v1`
- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs.json`
- Health: `http://localhost:5000/api/v1/health`

Default seeded admin: `admin@campus.edu` / `Admin@12345` (change via `.env`
before seeding).

### 4.4 Useful local commands

| Command | What it does |
| --- | --- |
| `npm start` | Start once with Node. |
| `npm run dev` | Start with nodemon. |
| `npm run seed` | Create/promote the admin and optionally sample events. |
| `npm test` | 75 Jest/Supertest integration tests. |
| `npm run test:watch` | Watch mode. |
| `npm run coverage` | Tests plus `coverage/lcov-report/index.html`. |

The first `npm test` downloads a MongoDB binary for
`mongodb-memory-server`; it needs network access once and is cached afterwards.

---

## 5. Deploy with Docker Compose

`docker-compose.yml` starts MongoDB 7 and the API, with a health-checked
dependency and a named volume `mongo-data`.

### 5.1 Start

Bash:

```bash
export JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
docker compose up --build -d
```

PowerShell:

```powershell
$env:JWT_SECRET = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
docker compose up --build -d
```

If you omit `JWT_SECRET`, Compose falls back to an insecure throwaway value. That
is acceptable only for a local demo — **never for production**.

### 5.2 Seed and inspect

```bash
docker compose exec api npm run seed
docker compose logs -f api
docker compose ps
```

The API is at `http://localhost:5000`; Swagger at `http://localhost:5000/api-docs`.

### 5.3 Stop and clean up

```bash
docker compose down       # stop, keep the Mongo volume
docker compose down -v    # stop and DELETE the database volume
```

`docker compose down -v` is irreversible. Back up first if the data matters.

### 5.4 Run the image against an external MongoDB

```bash
docker build -t campus-events-api .

docker run --rm -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e MONGODB_URI="mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/campus_events?retryWrites=true&w=majority" \
  -e JWT_SECRET="replace-with-at-least-32-random-characters" \
  campus-events-api
```

On Linux, `host.docker.internal` is not available by default. Use an Atlas URI,
a Docker network, or add:

```bash
--add-host=host.docker.internal:host-gateway
```

### 5.5 Docker notes

- The image runs as the unprivileged `node` user.
- It installs **production dependencies only** (`npm ci --omit=dev`).
- It copies only `src/` and `package*.json`. If you add runtime files outside
  `src/`, update the `Dockerfile`.
- The health check calls `/api/v1/health` with `wget`.
- MongoDB data lives in the `mongo-data` volume, not in the image.

---

## 6. Deploy to Render (recommended for a free public URL)

### 6.1 MongoDB Atlas first

1. Create a free **M0** cluster at <https://www.mongodb.com/atlas>.
2. **Database Access** → add a database user with a strong password.
3. **Network Access** → allow your app. For Render, `0.0.0.0/0` is the simplest
   option; restrict it if you have static egress IPs.
4. Copy the connection string and append a database name:
   `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/campus_events?retryWrites=true&w=majority`
5. URL-encode any of `@ : / ? # [ ] %` in the password.

> M0 has limited storage and no continuous backups. For anything important, use
> a paid tier or scheduled `mongodump` backups.

### 6.2 Option A — Blueprint (`render.yaml`)

The repo includes a Render blueprint:

```yaml
services:
  - type: web
    name: campus-events-api
    runtime: node
    plan: free
    buildCommand: npm ci
    startCommand: npm start
    healthCheckPath: /api/v1/health
    autoDeploy: true
```

Steps:

1. Push the repository to GitHub/GitLab.
2. Render Dashboard → **New** → **Blueprint** → select the repository.
3. Render detects `render.yaml`. It will:
   - generate `JWT_SECRET` (`generateValue: true`),
   - prompt for `MONGODB_URI` and `ADMIN_PASSWORD` (`sync: false`),
   - set `NODE_ENV=production`, `CORS_ORIGIN=*`, `SEED_SAMPLE_DATA=true`.
4. Paste the Atlas URI. Use a strong `ADMIN_PASSWORD`.
5. Apply/deploy. First build runs `npm ci`; start runs `npm start`.
6. Wait for the health check to pass, then open:
   - `https://<service>.onrender.com/api/v1/health`
   - `https://<service>.onrender.com/api-docs`

Before going live, edit `render.yaml` if you want:

- `name`: your service name,
- `plan`: `free` causes spin-down after inactivity and cold starts,
- `SEED_SAMPLE_DATA`: set `"false"` for a clean event catalogue,
- `CORS_ORIGIN`: your real frontend origin(s) instead of `*`.

### 6.3 Option B — Manual Web Service

Render Dashboard → **New** → **Web Service** → connect the repo:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/api/v1/health` |
| Auto-deploy | On (optional) |

Environment variables:

```text
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<48-byte hex>
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://your-frontend.example.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
ADMIN_NAME=Platform Admin
ADMIN_EMAIL=admin@your-campus.edu
ADMIN_PASSWORD=<strong-password>
SEED_SAMPLE_DATA=false
```

The app already binds to `process.env.PORT`, so do not hardcode `5000` on a
managed platform.

### 6.4 Seed production

`npm run seed` is idempotent and creates the admin from `ADMIN_*` variables.
Run it **once** after the first deploy:

- From the platform shell (if your plan includes one), or
- From a trusted machine pointed at the production database:

```bash
NODE_ENV=production \
MONGODB_URI="mongodb+srv://..." \
JWT_SECRET="<same 32+ char secret as the service>" \
ADMIN_NAME="Platform Admin" \
ADMIN_EMAIL="admin@your-campus.edu" \
ADMIN_PASSWORD="<strong-password>" \
SEED_SAMPLE_DATA=false \
npm run seed
```

PowerShell:

```powershell
$env:NODE_ENV="production"
$env:MONGODB_URI="mongodb+srv://..."
$env:JWT_SECRET="<same 32+ char secret as the service>"
$env:ADMIN_NAME="Platform Admin"
$env:ADMIN_EMAIL="admin@your-campus.edu"
$env:ADMIN_PASSWORD="<strong-password>"
$env:SEED_SAMPLE_DATA="false"
npm run seed
```

Notes:

- Setting `SEED_SAMPLE_DATA=false` prevents demo events.
- If the admin already exists, the script leaves the password unchanged unless
  `SEED_RESET_ADMIN_PASSWORD=true` is set for that run.
- Changing `ADMIN_EMAIL` creates a **new** admin; it does not rename the old one.
- Public registration can only create students, so the seed or another admin is
  required to bootstrap the first admin.

---

## 7. Deploy to Railway, Fly.io, or a VPS

### Railway

1. New Project → Deploy from GitHub repo.
2. Railway detects Node via `package.json`; build `npm ci`, start `npm start`.
   You can also point it at the `Dockerfile`.
3. Add the same environment variables as Render, especially `MONGODB_URI`,
   `JWT_SECRET`, `NODE_ENV=production`, and `CORS_ORIGIN`.
4. Generate a public domain and set the health check to `/api/v1/health`.
5. Seed via the Railway shell or from your machine as shown above.

### Fly.io

Fly uses the included Dockerfile. A minimal flow:

```bash
fly launch --no-deploy        # creates fly.toml; choose a region
fly secrets set \
  NODE_ENV=production \
  MONGODB_URI="mongodb+srv://..." \
  JWT_SECRET="<48-byte hex>" \
  CORS_ORIGIN="https://your-frontend.example.com"
fly deploy
fly logs
```

Make sure `fly.toml` exposes the same port the app uses (default 5000) and
configures an HTTP health check on `/api/v1/health`.

### VPS + Docker + Caddy

On a small Linux VM:

```bash
git clone <your-repo> campus-events-api
cd campus-events-api
cp .env.example .env
# edit .env: NODE_ENV=production, strong JWT_SECRET, strong ADMIN_PASSWORD
docker compose up --build -d
docker compose exec api npm run seed
```

Put a TLS-terminating reverse proxy in front. Example `Caddyfile`:

```caddyfile
campus.example.com {
  reverse_proxy 127.0.0.1:5000
}
```

Caddy obtains certificates automatically and forwards `X-Forwarded-For`. The app
sets `trust proxy = 1`, which assumes **exactly one** trusted proxy hop. If you
add Cloudflare in front of Caddy (two hops), rate limiting will key on the wrong
IP until you adjust `app.set('trust proxy', ...)` or the proxy chain.

Firewall the MongoDB port. Prefer binding the API to localhost
(`127.0.0.1:5000:5000` in Compose) when a reverse proxy is the only public entry
point.

---

## 8. Verify a deployment

### 8.1 Public endpoints

```bash
curl -s https://<your-service>/api/v1/health
curl -s https://<your-service>/api-docs.json | head -c 300
```

Expected health shape:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "uptime": 123,
    "timestamp": "2026-10-26T12:00:00.000Z"
  }
}
```

> The health endpoint always returns HTTP 200, even if `database` is
> `disconnected`. It is a liveness check, not a strict readiness probe. Check
> the `database` field if you need DB readiness. Render's health check therefore
> confirms the process is serving HTTP, not that Mongo is reachable.

### 8.2 End-to-end smoke test

Bash (requires `jq` for parsing; otherwise read the token manually):

```bash
BASE="https://<your-service>"

curl -s "$BASE/api/v1/health" | jq

TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@your-campus.edu","password":"<password>"}' \
  | jq -r '.data.token')

START_DATE=$(node -e "console.log(new Date(Date.now()+30*864e5).toISOString())")
END_DATE=$(node -e "console.log(new Date(Date.now()+30*864e5+7200e3).toISOString())")

BODY=$(jq -n --arg start "$START_DATE" --arg end "$END_DATE" '{
  title: "Deployment Smoke Test",
  description: "Created to verify the production deployment.",
  category: "Technology",
  location: "Online",
  startDate: $start,
  endDate: $end,
  capacity: 10
}')

curl -s -X POST "$BASE/api/v1/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$BODY" | jq
```

The dates are generated 30 days ahead so the smoke test keeps working over time.

PowerShell uses `curl.exe` to avoid the `Invoke-WebRequest` alias:

```powershell
$BASE = "https://<your-service>"
curl.exe -s "$BASE/api/v1/health"
curl.exe -s -o NUL -w "%{http_code}`n" "$BASE/api-docs.json"
```

Then verify in the browser:

- `https://<your-service>/api/v1/health` → `success: true`, DB connected.
- `https://<your-service>/api-docs` → Swagger UI loads.
- Authorize in Swagger with a token from `/auth/login`.
- Register a second (student) account and reserve a seat in a seeded event.

### 8.3 Deployment checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` is random, ≥ 32 chars, stored only in platform secrets
- [ ] `MONGODB_URI` points at the production DB and includes a database name
- [ ] Atlas network access limited as much as practical
- [ ] `CORS_ORIGIN` narrowed to real frontend origins
- [ ] Seeded admin exists with a **non-default** password
- [ ] `SEED_SAMPLE_DATA` is a deliberate choice
- [ ] Health check configured at `/api/v1/health`
- [ ] HTTPS enabled
- [ ] Logs visible and free of secrets
- [ ] Backup/restore plan tested
- [ ] Uptime monitor configured (also mitigates free-tier cold starts)
- [ ] `npm test` green on the commit being deployed

---

## 9. Day-2 operations

### Logs

| Environment | Command / place |
| --- | --- |
| Local | Terminal running `npm run dev` |
| Compose | `docker compose logs -f api` |
| Container | `docker logs -f <container>` |
| Render | Dashboard → service → Logs |
| Railway | Dashboard → service → Logs |
| Fly | `fly logs` |

Morgan logs one line per request. Authorization headers are not logged, but
search terms appear in URLs; avoid putting secrets in query strings.

### Common actions

| Task | How |
| --- | --- |
| Check health | `GET /api/v1/health` |
| Restart | Platform restart, or `docker compose restart api` |
| Deploy new code | Push to the connected branch (auto-deploy), or redeploy from the dashboard |
| Change config | Update env vars and restart/redeploy (config is read at startup) |
| Rotate JWT secret | Set a new secret and redeploy. **All existing tokens become invalid.** |
| Reset admin password | Set `SEED_RESET_ADMIN_PASSWORD=true`, run `npm run seed`, then remove the variable |
| Promote a user | Log in as admin → `PATCH /api/v1/users/:id/role` with `{"role":"admin"}` |
| Add another admin | Promote via the API, or set a new `ADMIN_EMAIL` and seed again |
| Back up | Atlas snapshot, or `mongodump` (below) |
| Scale horizontally | Increase replicas/instances; the API is stateless |
| Change rate limits | Update `RATE_LIMIT_*` / `AUTH_RATE_LIMIT_MAX` and restart |

### Backups

Atlas paid tiers can take automated snapshots. For M0 or self-hosted Mongo, use
`mongodump` from MongoDB Database Tools:

```bash
mongodump --uri="$MONGODB_URI" --out="backup-$(date +%Y%m%d-%H%M%S)"
```

Restore into a **separate** database first and verify counts before touching
production:

```bash
mongorestore --uri="$MONGODB_URI" --nsFrom='campus_events.*' --nsTo='campus_events_restore.*' ./backup-...
```

For Compose, back up the `mongo-data` volume as well.

### Indexes

Mongoose creates the declared indexes automatically when models initialize
(`autoIndex` defaults to true). Verify them after the first production boot:

```bash
mongosh "$MONGODB_URI" --eval 'db.events.getIndexes()'
mongosh "$MONGODB_URI" --eval 'db.registrations.getIndexes()'
mongosh "$MONGODB_URI" --eval 'db.users.getIndexes()'
```

Expected critical indexes:

- `users.email` (unique)
- `registrations.{event,user}` (unique compound)
- `registrations.{user,status,createdAt}`
- `events.{status,startDate}`
- `events` text index on `title`, `description`

On large existing collections, consider disabling `autoIndex` and creating
indexes deliberately during a maintenance window.

### Monitoring

- Point an uptime monitor at `/api/v1/health` every 1–5 minutes.
- Alert on non-2xx responses, high latency, and 5xx rates.
- Watch MongoDB Atlas metrics: connections, operations, storage, slow queries.
- Track `429` rates to tune limits; track `401`/`403` spikes for abuse.
- Free Render services sleep after inactivity; an uptime ping also keeps the
  service warm (check that this is acceptable for your plan).

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Boot fails: `JWT_SECRET must be set to a random string of at least 32 characters in production.` | `NODE_ENV=production` with missing/short secret | Set a 32+ char `JWT_SECRET`; redeploy. |
| `[startup] could not connect to MongoDB` | Wrong URI, DB down, Atlas IP not allowed, unencoded password | Verify URI, add the platform egress IP to Atlas, URL-encode the password. |
| Every request gets `429 RATE_LIMITED` | Limits too low, shared IP, proxy misconfigured | Raise limits, verify `trust proxy`, or add a Redis-backed limiter for multi-instance accuracy. |
| Browser shows a CORS error | Origin not allowed | Set `CORS_ORIGIN` to the exact scheme + host + port, no trailing slash; restart. |
| `Authorization` fails in Swagger | Pasted `Bearer <token>` instead of the token | Paste only the token value. Tokens expire after `JWT_EXPIRES_IN`. |
| 502/503 on Render/Railway | App not listening on injected `PORT`, or cold start | Confirm the app uses `process.env.PORT` (it does); check logs and health path. |
| Seed says admin exists but password is unknown | Seed never resets existing passwords | Run once with `SEED_RESET_ADMIN_PASSWORD=true`. |
| `EVENT_FULL` when seats appear free | `registeredCount` drifted from actual rows | Recount/inspect registrations; only mutate the counter through the API. |
| `413 PAYLOAD_TOO_LARGE` | Body over 1 MB | Send a smaller payload; raise the limit in `src/app.js` if genuinely needed. |
| Tests fail on first run | `mongodb-memory-server` binary download blocked | Allow network once, or pre-download/set `MONGOMS_DOWNLOAD_DIR`. |
| `npm ci` fails in CI/Docker | Lockfile out of sync | Run `npm install` locally and commit `package-lock.json`. |
| Docker seed can't find a dev dependency | Image installs production deps only | Seed uses production deps, but custom scripts may need a dev image (`npm ci` without `--omit=dev`) or a run outside the container. |
| Data disappeared after Compose | `docker compose down -v` removed the volume | Restore from backup; avoid `-v` unless intentional. |
| Mongo indexes missing in production | Models never initialized, or `autoIndex` disabled | Start the app once, or create indexes explicitly. |
| Render service slow on first request | Free-tier cold start | Expected; upgrade or keep it warm with a monitor. |

---

## 11. CI/CD

There is no workflow checked in. A minimal GitHub Actions pipeline that runs the
suite and validates the Docker image:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  docker:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t campus-events-api:ci .
```

Add registry login/push steps if you deploy from a private registry. Render and
Railway can also auto-deploy directly from the branch, making the workflow a
quality gate rather than a deployer.

---

## 12. Extending the project

The codebase is deliberately layered. Most changes follow the same recipe.

### 12.1 Add a new endpoint

Example: `PATCH /api/v1/auth/me/password`.

1. **Validator** — `src/validators/authValidators.js`: add `currentPassword` and
   `newPassword` rules (reuse the 8–72, letter+digit rules).
2. **Controller** — `src/controllers/authController.js`: load the user with
   `+password`, compare the current password, assign the new one (the
   `pre('save')` hook re-hashes it), save, and return `sendSuccess`.
3. **Route** — `src/routes/authRoutes.js`:
   `router.patch('/me/password', authenticate, changePasswordValidator, validate, changePassword)`
   placed before any conflicting `/me` route.
4. **OpenAPI** — `src/docs/openapi.js`: document the path, body schema, and
   responses. `tests/docs.test.js` validates the spec, checks for broken
   `$ref`s, and requires a summary and responses on every documented operation.
5. **Tests** — add cases to `tests/auth.test.js`: success, wrong current
   password, weak new password, missing token.
6. **Postman** — optionally add the request to
   `docs/postman_collection.json`.

Run `npm test` and `npm run coverage`.

### 12.2 Add a field to an existing resource

Example: `tags: [String]` on events.

1. `src/models/Event.js` — add the field with validation/defaults.
2. `src/validators/eventValidators.js` — add rules to create and update; add
   `tags` to the update "at least one field" allow-list.
3. `src/controllers/eventController.js` — add `tags` to `UPDATABLE_FIELDS`.
4. `src/docs/openapi.js` — update the Event schema and examples.
5. Tests and Postman.
6. If you plan to filter by it, add an index and a query parameter (and validate
   it). Consider how existing documents behave (missing field = `undefined`).

### 12.3 Add a role

Today roles are `student` and `admin`. To add `organizer`:

1. `src/models/User.js` — add to `ROLES`.
2. `src/validators/userValidators.js` — update the `isIn` list.
3. `src/routes/eventRoutes.js` — allow the role where appropriate (event
   creation is currently admin-only).
4. `src/controllers/eventController.js` — ownership checks already handle
   "organizer of this event"; a global `organizer` role is a different concept.
5. `src/controllers/userController.js` — the self-demotion/last-admin guards are
   admin-specific; review them for the new role.
6. `src/seed.js` — optionally seed one.
7. Tests, OpenAPI enums, and any frontend role mapping.
8. Migrate existing users if the role becomes required.

### 12.4 Suggested roadmap

| Feature | Where to start | Watch out for |
| --- | --- | --- |
| Refresh tokens + logout | New `RefreshToken` model; add `/auth/refresh` and `/auth/logout` | Store only hashed refresh tokens; rotate on use; support revocation |
| Email verification | `emailVerified` + token model; mail provider | Decide whether unverified users can register for events |
| Password reset | Token model + `/auth/forgot-password` and `/auth/reset-password` | Generic responses to avoid enumeration; rate limit; single-use, short TTL |
| Event images | `imageUrl` field + object storage (S3/Cloudinary) | Don't store blobs in Mongo; validate type/size; signed uploads |
| Waitlist | New `waitlisted` status + atomic promotion on cancel | Preserve fairness; notify users; handle capacity changes |
| Audit log | `AuditLog` model written by controllers | Avoid logging secrets/PII; consider async writes |
| Idempotency keys | `Idempotency-Key` header + stored response | TTL, per-user scope, replay semantics |
| Organizer analytics | Aggregation pipelines on registrations | Index support; avoid expensive per-request aggregations |
| Cursor pagination | New `cursor` param on list endpoints | Stable sort keys; keep offset pagination for compatibility |
| Redis rate limiting | Replace in-memory store in `src/middleware/rateLimit.js` | Shared limits across replicas; Redis availability |
| Structured logging + request IDs | Replace/augment Morgan | Correlation IDs; redact auth headers |
| Readiness endpoint | `/health/ready` that fails when DB is down | Keep `/health` as liveness for platform checks |
| CI + security scanning | GitHub Actions + `npm audit`/Dependabot | Pin actions; fail on high-severity issues |
| Migrations | `migrate-mongo` or a custom script | Index/field changes on large collections |

### 12.5 Frontend integration notes

- Set `CORS_ORIGIN` to your frontend origin(s), not `*`, once you have a real UI.
- Use `https://<api>/api/v1` as the base URL and read it from frontend config.
- Store tokens carefully. `localStorage` is simple but XSS-exposed; an
  `httpOnly`, `SameSite` cookie needs CSRF protection and backend cookie support.
- Branch on `error.code` (`EVENT_FULL`, `ALREADY_REGISTERED`, `TOKEN_EXPIRED`,
  `RATE_LIMITED`, …) rather than message text.
- Use `meta` from paginated responses for page controls.
- Dates are ISO 8601 UTC; format in the client's timezone.
- On `401 TOKEN_EXPIRED`, send the user to login (there is no refresh flow yet).
- For Swagger-based manual testing, paste the raw token into **Authorize**.

### 12.6 Scaling notes

- The API is stateless; run multiple instances behind a load balancer.
- MongoDB is the shared dependency. Use Atlas or a replica set, not a single
  local Mongo, for production.
- In-memory rate limits are per instance. Move to a shared store if exact global
  limits matter.
- The denormalized `registeredCount` is updated atomically; avoid writing it
  manually.
- Watch connection counts: each Node instance maintains a Mongoose pool. Size
  the pool and the Atlas tier together.
- For very large event lists, prefer indexes and projection over fetching full
  documents; consider cursor pagination.

---

## 13. Security hardening checklist

- [ ] Generate a unique 48-byte `JWT_SECRET`; never reuse the dev fallback.
- [ ] Set `NODE_ENV=production` so weak-secret and error-detail guards apply.
- [ ] Change the seeded admin password; do not ship `Admin@12345`.
- [ ] Narrow `CORS_ORIGIN` to trusted origins.
- [ ] Require HTTPS (platform default or Caddy/Nginx).
- [ ] Restrict Atlas network access; do not leave `0.0.0.0/0` longer than needed.
- [ ] Keep `BCRYPT_ROUNDS=12` (or higher) in production.
- [ ] Tune `AUTH_RATE_LIMIT_MAX` and `RATE_LIMIT_MAX` to your traffic.
- [ ] Ensure `.env` is not committed and no secrets are in logs or CI output.
- [ ] Run `npm audit` and keep dependencies patched.
- [ ] Back up the database and test a restore.
- [ ] Monitor 5xx/429 rates and set uptime alerts.
- [ ] Rotate `JWT_SECRET` immediately if it leaks (invalidates all tokens).
- [ ] Review role changes and admin promotions periodically.
- [ ] Add request-size limits appropriate to your clients (currently 1 MB).

---

## 14. Command cheat sheet

| Goal | Command |
| --- | --- |
| Install | `npm install` |
| Dev server | `npm run dev` |
| Production start | `npm start` |
| Seed admin/sample data | `npm run seed` |
| Tests | `npm test` |
| Coverage | `npm run coverage` |
| Build image | `docker build -t campus-events-api .` |
| Compose up | `docker compose up --build -d` |
| Compose logs | `docker compose logs -f api` |
| Compose seed | `docker compose exec api npm run seed` |
| Compose stop | `docker compose down` |
| Compose stop + wipe DB | `docker compose down -v` |
| Generate JWT secret | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| Health check | `curl -s http://localhost:5000/api/v1/health` |
| Raw OpenAPI | `curl -s http://localhost:5000/api-docs.json` |
| Backup | `mongodump --uri="$MONGODB_URI" --out=backup` |
| Restore (separate DB) | `mongorestore --uri="$MONGODB_URI" --nsFrom='campus_events.*' --nsTo='campus_events_restore.*' ./backup` |
| Render deploy | Push to the connected branch, or **Manual Deploy** in the dashboard |
| Fly deploy | `fly deploy` |

---

## 15. Where to go next

- Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for the architecture, data
  model, and design rationale.
- Read [README.md](README.md) for the full endpoint reference, response shapes,
  error codes, and curl examples.
- Open `/api-docs` on any running instance to explore and call the API.
- Import `docs/postman_collection.json` into Postman for a ready-made request
  collection with token/event variables.
- Start with the roadmap in §12.4 and pick the smallest user-visible feature
  (password reset and refresh tokens are usually the highest-value next steps).
