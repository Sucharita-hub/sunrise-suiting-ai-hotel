# Sunrise Suites — AI Hotel Guest Assistant

A full-stack React + Express hotel guest assistant with real accounts, persisted
conversations, a booking-and-payment flow, and a staff admin view — built for
the assignment.

> **Runs at zero LLM cost by default.** No AI provider key is required. Out of
> the box the assistant uses a deterministic, retrieval-based response engine —
> there is no external LLM call and therefore no possibility of hitting a
> billing wall or "insufficient credit" error. See
> [AI provider (optional)](#ai-provider-optional) below if you want to layer in
> a real LLM using Groq's free tier.

## Features

- Email/password auth (Supabase Auth) — every guest gets a real account
- Conversations are persisted per user (threads + messages survive refresh/reload)
- Retrieval-grounded hotel knowledge base with a **hallucination guard**: any
  number the LLM states that isn't present in the retrieved source text is
  rejected and the deterministic answer is used instead
- Works fully for free with zero AI provider keys (deterministic mode)
- Optional real-LLM mode via a provider chain: Groq → Gemini → OpenAI → deterministic fallback
- Room availability search (deterministic, never depends on an LLM)
- **Book a Stay**: search → reserve → simulated payment → confirmation
- **My Reservations**: a guest's own booking history with payment status
- **Admin** (staff-only): every guest's reservations, plus a feed of questions
  the assistant couldn't answer from the knowledge base (coverage-gap visibility)
- Row-Level Security in Postgres — guests can only ever read their own rows;
  the backend enforces staff-only routes on top of that
- Responsive desktop/mobile UI (Mantine)
- 14 automated backend tests (offline, against in-memory fakes — no network calls)
- Playwright end-to-end tests covering the full guest + staff journey
- No API key or service-role secret is ever exposed to the browser

## Stack

- Frontend: React + Vite + [Mantine](https://mantine.dev) (component library/design system)
- Backend: Node.js + Express (ESM), app-factory pattern for dependency injection
- Auth + Database: Supabase (Postgres + Auth), enforced with Row-Level Security
- AI: provider chain — Groq → Gemini → OpenAI → deterministic (all optional; retrieval + hallucination guard sit in front of all of them)
- Data: JSON hotel knowledge base, retrieved by keyword-scored section matching
- Tests: Node built-in test runner + Supertest (backend), Playwright (end-to-end)

## Project structure

```text
sunrise-suiting-ai-hotel/
├── frontend/
│   ├── src/
│   │   ├── assets/illustrations/     # unDraw SVGs (MIT-licensed)
│   │   ├── components/SidebarShell.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── lib/{api.js,supabaseClient.js}
│   │   ├── screens/AuthScreen.jsx
│   │   ├── tabs/{ChatTab,BookStayTab,ReservationsTab,AdminTab}.jsx
│   │   ├── theme.js                  # Mantine theme override
│   │   ├── App.jsx / main.jsx / index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── data/hotel.json
│   ├── scripts/schema.sql            # Supabase table + RLS definitions
│   ├── src/
│   │   ├── app.js                    # createApp(deps) — route definitions
│   │   ├── server.js                 # boots app.js and listens
│   │   ├── authMiddleware.js         # bearer-token verification
│   │   ├── supabaseAdmin.js          # service-role client
│   │   ├── profileRepo.js / threadRepo.js / reservationRepo.js
│   │   ├── aiService.js              # retrieval + hallucination guard + provider chain
│   │   ├── availabilityService.js
│   │   └── utils.js
│   ├── tests/{assistant.test.js,fakes.js}
│   ├── .env.example
│   └── package.json
├── e2e/
│   ├── tests/{guest-journey.spec.js,design-review.spec.js}
│   └── playwright.config.js
├── EXPLAIN.md                        # plain-language infra + interview Q&A
└── README.md
```

## Run locally

### 1. Set up Supabase

1. Create a free project at https://supabase.com.
2. In the SQL editor, run `backend/scripts/schema.sql` — creates `profiles`,
   `threads`, `thread_messages`, and `reservations` tables with Row-Level
   Security policies.
3. Grab your project URL, service-role key (Settings → API), and anon/publishable key.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Backend runs on `http://localhost:5000`.

With no `GROQ_API_KEY`/`GEMINI_API_KEY`/`OPENAI_API_KEY` set, chat answers come
entirely from deterministic retrieval over `data/hotel.json` — no external
calls, no cost, nothing that can fail due to billing. This is enough to demo
the full assignment flow.

### AI provider (optional)

If you'd like real LLM-generated answers layered on top of the retrieval step:

**Option A — Groq (free, recommended, no credit card required)**

```env
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

**Option B — Gemini (free tier)**

```env
GEMINI_API_KEY=your_gemini_key_here
```

**Option C — OpenAI (paid, only if you already have billing set up)**

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

Providers are tried in order (Groq → Gemini → OpenAI). If none are configured,
or if every configured call fails (bad key, no quota, rate limit, network
error), the backend falls back to the deterministic assistant — the guest
never sees a broken chat. Every LLM answer also passes through the
hallucination guard before being returned.

### 3. Frontend

Open another terminal:

```bash
cd frontend
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

### 4. Make a staff account (optional, for the Admin tab)

Sign up normally through the app, then in the Supabase SQL editor:

```sql
update profiles set role = 'staff' where user_id = '<your-auth-user-id>';
```

## API examples

All routes except `/api/health` require `Authorization: Bearer <supabase_access_token>`.

### Health

```bash
curl http://localhost:5000/api/health
```

### Ask assistant

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"threadId\":null,\"message\":\"What time is check-in?\"}"
```

### Availability (deterministic, still needs auth but never touches an LLM)

```bash
curl -X POST http://localhost:5000/api/availability \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"checkIn\":\"2026-09-25\",\"checkOut\":\"2026-09-28\",\"adults\":2}"
```

### Reservations

```bash
# create
curl -X POST http://localhost:5000/api/reservations \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"roomId\":\"deluxe\",\"checkIn\":\"2026-09-25\",\"checkOut\":\"2026-09-28\",\"adults\":2}"

# pay (simulated)
curl -X POST http://localhost:5000/api/reservations/<id>/pay \
  -H "Authorization: Bearer $TOKEN"

# list own, or all (staff only)
curl "http://localhost:5000/api/reservations?scope=all" -H "Authorization: Bearer $TOKEN"
```

### Admin: unanswered questions (staff only)

```bash
curl http://localhost:5000/api/admin/flagged-questions -H "Authorization: Bearer $TOKEN"
```

## AI design

The backend first determines whether a request is an availability request.
Availability is handled by deterministic business logic and never depends on
an LLM.

For normal hotel questions, `aiService.js` retrieves only the relevant
sections of the hotel JSON (keyword-scored, not the whole document) and — if a
provider key is configured — sends those sections plus the question to the
LLM, instructed to answer only from what it was given. Before the answer is
returned, `isGrounded()` checks every number the model stated against the
retrieved source text; if a number doesn't appear there, the call is treated
as ungrounded and the deterministic engine answers instead. Questions the
deterministic engine also can't answer are recorded so staff can see
knowledge-base gaps in the Admin tab.

This two-layer approach (retrieval scoping + post-hoc grounding check) reduces
hallucination risk further than prompting alone, and keeps the guest
experience unbreakable even with no AI provider configured at all.

## Auth & data model

- Supabase Auth issues a JWT per session; the frontend attaches it as
  `Authorization: Bearer <token>` on every API call.
- `authMiddleware.js` verifies the token server-side via
  `supabase.auth.getUser(token)` on every request — there is no session cookie
  or server-side session store.
- Every table (`threads`, `thread_messages`, `reservations`) has Row-Level
  Security policies scoping reads/writes to `auth.uid()`, so even if the
  frontend had a bug, Postgres itself refuses cross-user reads.
- The backend uses the Supabase **service-role** key, which bypasses RLS by
  design — so the backend's own application code (checking `req.user.id`
  against the row's `user_id`, and checking `profiles.role === 'staff'` for
  admin routes) is what enforces access control for backend-issued queries.

## Test suite

Backend (offline, no network calls — runs against in-memory fake repos):

```bash
cd backend
npm test
```

Covers: health endpoint, auth requirement, grounded/ungrounded chat answers,
follow-up context within a thread, availability success/invalid-range/missing-
guests/no-availability, empty-message rejection, reservation create-then-pay,
staff-only access to all reservations, and the hallucination guard rejecting
an unsupported number.

End-to-end (Playwright, spins up both real servers):

```bash
cd e2e
npm install
npx playwright install
npx playwright test
```

Covers the full guest journey (sign in → chat → book → pay → see it in My
Reservations) and the staff journey (sign in → see the booking in Admin → view
unanswered questions), plus a full-page screenshot pass across every screen
for visual review.

## Deliverables

Product/UX/engineering/AI decisions, evaluation scenarios with observed results, and the list of AI tools used during development are in [`deliverables/`](./deliverables):

- [`06-decisions-note.md`](./deliverables/06-decisions-note.md) — customer problem, guest journey, frontend design rationale, AI-vs-deterministic split, failure handling, what we'd measure and improve
- [`07-evaluation-and-results.md`](./deliverables/07-evaluation-and-results.md) — scenario matrix and observed test results
- [`08-ai-tools-used.md`](./deliverables/08-ai-tools-used.md) — AI tools used during development

## Production improvements

Before production:
- replace mock availability with a hotel PMS/booking API
- replace the simulated payment step with a real payment provider (Stripe, Razorpay)
- add rate limiting
- add structured logging/monitoring
- add analytics for unanswered questions and availability conversions
- add prompt/version management and AI evaluation
- add accessibility audit
- add security headers and stricter CORS
- add email verification / password reset flows on top of Supabase Auth defaults
