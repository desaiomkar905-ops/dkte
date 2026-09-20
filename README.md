# CivicShield AI

> **From Citizen Complaint to Verified Civic Action.**

An **agentic AI civic-response platform** built as an original hackathon
implementation. Most civic systems stop at *collecting* complaints. CivicShield
AI processes a complaint end-to-end: it analyzes the report, decides what
actions are required, executes those actions through tools, monitors the case
against its SLA — and **verifies the final resolution with AI** before a case
can close.

This is **not** a chatbot. A server-side Agent Orchestrator runs named agents
(Vision, Triage, Duplicate, Routing, Dispatch, Verification, SLA) that invoke
real tools, and every decision is persisted to an auditable **Agent Activity
log** surfaced in the UI.

---

## Problem → Solution

| Problem with typical civic portals | What CivicShield AI does |
|---|---|
| Complaints sit in a queue; humans triage by hand | AI pipeline classifies, scores severity/priority, and routes to the responsible department automatically — with explainable reasons |
| Duplicate reports create noise and wasted work | Duplicate intelligence (geo-proximity + category + time + text similarity) links *"potentially related complaint"* records instead of creating new cases |
| Workers mark tasks "done" with no proof | Workers must upload resolution evidence; the **AI Verification Agent** analyzes it and only then marks RESOLVED — otherwise the case is REOPENED / ESCALATED |
| No accountability on time | SLA clocks per severity (12/24/48/72h), OVERDUE flagging, escalation history |
| Decisions are opaque | Every agent step is logged with concise human-readable reasons (no hidden chain-of-thought) |

## Architecture (high level)

```
Citizen (photo + voice/text + GPS)
        │  multipart POST /api/complaints
        ▼
┌────────────────────────────────────────────────────────────┐
│ AGENT ORCHESTRATOR (server-side)                            │
│  VisionAgent    → analyze_image()      [YOLO service | dev] │
│  TriageAgent    → classify_issue(), calculate_severity(),   │
│                   calculate_priority()  [Bedrock | dev]     │
│  DuplicateAgent → find_nearby_complaints(), detect_duplicate()│
│  RoutingAgent   → find_department()                         │
│  DispatchAgent  → create_complaint(), notify_citizen()      │
│  VerificationAgent → verify_resolution()  (on evidence)     │
│  SLAAgent       → check_sla(), escalate_complaint()         │
└───────────────┬────────────────────────────────────────────┘
                ▼
        SQLite/Postgres (Prisma) + file storage
                ▼
React UI: Citizen · Official dashboard (map, table, SLA) · Worker
```

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full design, and
**[DEMO.md](./DEMO.md)** for judge demonstration steps.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend + Backend | **Next.js 16 (App Router), TypeScript, Tailwind CSS v4** | one app, one deploy |
| Database | **SQLite (Prisma ORM)** for the runnable prototype | schema is Postgres-ready — switch `provider` + `DATABASE_URL` to Supabase Postgres with no model changes |
| AI — vision | **YOLOv8** via optional FastAPI microservice (`/vision-service`) | runs the CivicAI custom-trained `best.pt` when provided — see the model note below |
| AI — reasoning | **Amazon Bedrock** (Claude) | labeled deterministic rule-based provider without AWS credentials |
| Storage | Local disk driver behind a storage abstraction | S3 driver is a documented extension point |
| Map | **Leaflet + OpenStreetMap** (react-leaflet) | severity-coded risk map |
| Auth | **Google sign-in via Firebase Auth** — ID token verified server-side (Firebase Admin), CivicShield session JWT in httpOnly cookie | zod validation, rate limiting, upload validation; see [AUTHENTICATION.md](./AUTHENTICATION.md) |
| Tests | Vitest (unit) + end-to-end smoke script (`scripts/smoke.mjs`) | 31 unit tests, 58 e2e checks |

## Setup

```bash
npm install
cp .env.example .env          # fill values (see below)
npm run demo:reset            # create SQLite DB + seed clearly-marked DEMO data
npm run dev                   # http://localhost:3000
```

Authentication is **Google sign-in only** (Firebase). Fill the
`NEXT_PUBLIC_FIREBASE_*` vars plus one server-side Admin credential, then
sign in at `/login`. Full setup: [AUTHENTICATION.md](./AUTHENTICATION.md).
Every Google user is a normal citizen; add your Google email to
`STAFF_EMAILS` in `.env` to reach the official/worker dashboards
(server-side mapping — there is no signup role selection).

`npm run demo:reset` (safe dev-only command) resets the local SQLite database
to the seeded demo state — it refuses to run against non-SQLite URLs unless
`--force` is passed. Re-run it between demo rehearsals.

Optional real vision:

```bash
cd vision-service
pip install -r requirements.txt       # Python 3.11–3.12
uvicorn main:app --port 8000
# then set YOLO_SERVICE_URL=http://localhost:8000 in .env
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | SQLite `file:./dev.db` (or Supabase Postgres URL) |
| `AUTH_SECRET` | yes | JWT session signing secret |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `AUTH_DOMAIN` / `PROJECT_ID` / `STORAGE_BUCKET` / `MESSAGING_SENDER_ID` / `APP_ID` | yes | Firebase web config for Google sign-in (public identifiers, not secrets) |
| `FIREBASE_SERVICE_ACCOUNT_B64` (or `_PATH` / `GOOGLE_APPLICATION_CREDENTIALS`) | yes | server-side Firebase Admin credential — never commit |
| `STAFF_EMAILS` | no | server-side staff mapping `email:ROLE[:DEPT],…` (no UI role selection) |
| `MAX_UPLOAD_MB` | no (default 8) | upload size limit |
| `YOLO_SERVICE_URL` | no | enables the real YOLOv8 vision path |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` | no | enables Bedrock LLM triage |
| `BEDROCK_MODEL_ID` | no (default claude-3-haiku) | Bedrock model |
| `SLA_HOURS_CRITICAL/HIGH/MEDIUM/LOW` | no (12/24/48/72) | SLA policy |
| `CRON_SECRET` | no | protects `/api/cron/sla` scheduled sweeps |
| `DEMO_MODE` | no | set `false` to disable the labeled ⏰ DEMO SLA controls; production builds refuse them unless `DEMO_MODE=true` |
| `RATE_LIMIT_MULTIPLIER` | no (default 1) | dev-only limiter scaling for test runs — never set in production |

No secrets are committed; `.env*` is gitignored. There are **no demo login
credentials** — authentication is real Google sign-in via Firebase. Seeded
staff rows exist only as assignment targets and are claimed automatically on
first login by a matching `STAFF_EMAILS` Google account.

### Running & deployment

```bash
npm run dev        # local development
npm run build      # production build (passes)
npm run lint       # eslint (clean)
npm test           # unit tests (31 passing)
node scripts/smoke.mjs http://localhost:3100   # end-to-end checks (58) against a running server
```

Deploy targets: Vercel (web app) + any Postgres (Supabase) + the vision
service on a small VM/container with your model weights. Scheduled SLA sweeps:
call `/api/cron/sla` with the `x-cron-secret` header from your scheduler.

## Vision model note (external dependency)

The production vision path uses the **CivicAI custom-trained YOLOv8 model
(`best.pt`)** — an external, custom-trained model dependency from the
[CivicAI project](https://github.com/Sujit-1509/CivicAI). The weight itself is
**not distributed** with that repository (verified: no releases; `model/`
holds only training-metric images) and is therefore **not included here**.
Obtain the exact file from the CivicAI author and place it at
`vision-service/model/best.pt` (or set `YOLO_MODEL_PATH`) — the service then
reports provider `yolo-service` with the model file name, and the UI shows a
**REAL YOLO MODEL** chip. Until the weight is provided, the labeled
development provider runs and is disclosed everywhere. The team should record
the author's permission to use the weight in `HACKATHON_CHECKLIST.md`.

## Honest AI policy (important)

Production AI results are **never simulated**. Every provider reports its own
id (`yolo-service`, `bedrock:…`, or `dev:hint` / `dev:rules` /
`dev:heuristic`), the active providers are visible at `/api/health/ai` and on
the landing page, and the Agent Activity log discloses which provider produced
each result. Without cloud credentials the demo still runs — through clearly
labeled development providers — so judges always know what they are looking at.

## Originality statement

CivicShield AI is an **original implementation inspired by civic-AI design
patterns**. No source code, schema, UI, or history was taken from any prior
project; open-source libraries are used under their licenses. Seeded records
are permanently marked `DEMO` in the UI; everything else in the database was
created by real user submissions.

## License

MIT
