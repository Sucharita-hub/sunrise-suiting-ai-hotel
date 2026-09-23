# Product, UX, engineering and AI decisions

## What customer problem are we solving?

Guests looking at a hotel site have small, urgent questions (check-in time, pool, breakfast, cancellation policy) and one bigger one (is a room free for my dates, and how much). Today that means scanning a policies page or calling the front desk. Every unanswered question is a guest who leaves without booking; every phone call is front-desk time that doesn't scale. The assistant answers instantly from the hotel's own data, turns "is anything free?" into a structured availability check, and lets the guest go from question to a paid, confirmed reservation without leaving the chat or talking to a human.

## What does the guest journey look like?

1. Signs up or logs in (Supabase email/password) — no anonymous chat, so every conversation and booking has a stable owner.
2. Lands on the Chat tab, sees suggested prompts and a `/help` command listing everything the assistant can do.
3. Asks a knowledge question ("does the hotel have a pool?") — gets a grounded 1–2 sentence answer.
4. Asks about booking or types `/book` — an inline date-picker widget appears directly in the chat thread (no tab switch).
5. Picks dates and guest count → sees room options with per-night and total pricing as a widget, not prose.
6. Picks a room → inline payment widget (simulated) → confirmation widget with a booking reference, all without leaving the conversation.
7. Can revisit "My Reservations" or type `/reservations` to pay later if they didn't pay immediately.
8. Every conversation is nested under "Chat" in the sidebar, expandable/collapsible, so returning guests can resume any past thread.
9. Staff accounts additionally see an Admin tab: every guest's reservations, plus a feed of questions the assistant couldn't answer from the knowledge base.

## Why did we design the frontend experience the way we did?

- **Inline chat widgets, not a separate booking form/tab.** The guest's mental model is "I'm talking to the assistant" — asking them to abandon that thread and fill out a standalone form to finish what they just asked about is a needless context switch. Date picker → room options → payment → confirmation all render as structured widgets inside the same message stream, driven by the same backend endpoints a standalone form would call.
- **Slash commands with autocomplete.** Guests won't discover "type /book to reserve" on their own. A visible `/` autocomplete menu (`/book /rooms /reservations /info /help`) makes every capability discoverable without reading documentation, and short-circuits straight to a widget client-side — no wasted round trip to the LLM for something that isn't really a knowledge question.
- **Result widgets, not prose.** Prices, dates and payment status are easier to scan and impossible for the model to misstate when they're rendered from structured JSON payloads rather than generated text.
- **Threads nested under "Chat" in the sidebar, expandable/collapsible, not a separate rail or drawer.** Keeps navigation to one place instead of splitting "which tab" and "which conversation" into two different UI regions; works identically (same component, same interaction) on desktop and the mobile burger-triggered nav — no separate mobile-only thread UI to maintain.
- **Mobile-first responsive pass.** Off-canvas nav (burger + Escape-to-close), horizontally-scrollable tables for reservations/admin, wider chat widget cards on small screens — verified in Playwright at 390×844 and 820×1180, not just assumed.
- **Visible states.** Typing indicator while the assistant is "thinking", disabled input mid-request, error text on failed requests, empty states with a "Book a room" quick action instead of a blank thread.

## Which parts use AI and which stay deterministic?

| AI (LLM, optional) | Deterministic code |
| --- | --- |
| Phrase a grounded answer from retrieved knowledge-base sections | Keyword-scored retrieval over `data/hotel.json` |
| — | Availability search (`availabilityService.js`) — date range + capacity check against mock inventory, never touches an LLM |
| — | Reservation create/pay/list, pricing and totals |
| — | Hallucination guard (`isGrounded()`) — numeric check against retrieved text |
| — | Deterministic fallback answer when no provider is configured or every provider call fails |
| — | Intent short-circuit for booking-intent words (`book`, `reserve`, `availability`, ...) — routes straight to the inline widget flow without a model call |

Rule of thumb: if a wrong answer would cost the hotel money or trust (price, dates, availability, policy figures), it's computed or checked in code, never left to the model alone. The app runs the entire assignment flow with **zero AI provider keys configured** — deterministic retrieval is not a fallback bolted on afterward, it's the default path.

## What can go wrong with the AI response?

- Inventing an amenity, policy, or number not present in `data/hotel.json`.
- Quoting a plausible but wrong price or check-in/out time.
- Treating a booking-intent phrase as a knowledge question (or vice versa).
- A configured provider being slow, rate-limited, or returning malformed output.
- Being confidently unhelpful on a genuinely ambiguous question.

## How do we prevent hallucinations or unsupported answers?

1. **Retrieval-scoped context** — the model only ever sees the specific `hotel.json` sections that keyword-matched the question, never the full document, and is instructed to answer only from that text.
2. **Numeric post-check (`isGrounded()`)** — every number the model states is checked against the retrieved source text; if one isn't backed by the data, the model's answer is discarded and the deterministic paragraph is used instead.
3. **Deterministic-first for anything with a real cost of being wrong** — availability, pricing, and the booking flow never touch the LLM at all.
4. **Narrow booking-intent word list** (`book`, `reserve`, `reservation`, `availability`, `available`) — deliberately excludes words like "check-in", "dates", "stay" that show up in ordinary knowledge questions, so the booking short-circuit can't hijack a real KB question (this was a real regression caught by the backend test suite during development — see `deliverables/07-evaluation-and-results.md`).
5. **Ungrounded questions are logged**, not just answered with a generic fallback — staff can see the actual coverage gap in the Admin tab's flagged-questions feed instead of guessing what the assistant can't handle.

## What happens when the model, the frontend API call, or another dependency fails?

| Failure | Behaviour |
| --- | --- |
| No AI provider key configured | App runs entirely on deterministic retrieval by design — not a degraded state, the documented default |
| Configured provider times out / rate-limits / errors | Provider chain (Groq → Gemini → OpenAI) tries the next provider, then falls back to deterministic retrieval — guest never sees an error for this |
| Model returns a number not backed by retrieved text | Hallucination guard discards the answer, deterministic paragraph is used instead |
| CORS / wrong origin (real production incident) | Root-caused to `cors({ origin: FRONTEND_ORIGIN })` pinning a single exact origin string, silently blocking any client from a different origin (preview URL, www vs bare domain, trailing slash). Fixed by reflecting the caller's origin (`cors({ origin: true })`) since auth is bearer-token based, not cookie-based — there was no security reason to pin one origin in the first place |
| Backend request fails from the browser | Frontend shows an inline error message in the chat thread, input stays usable, history is preserved |
| Bad request (missing dates, empty message, invalid range) | HTTP 400 with a readable error, covered by backend tests 8, 9, 11 |
| Non-staff user requests `?scope=all` reservations or `/api/admin/flagged-questions` | 403/staff-only enforced server-side, not just hidden in the UI |

## How would we measure whether the feature is useful?

- **Resolution rate**: share of chat questions answered without falling back to "I don't have that information."
- **Flagged-question volume and content** (already built — the Admin tab's coverage-gap feed): a direct, ungamed signal of what to add to the knowledge base next.
- **Booking funnel**: `/book` or date-picker widget opened → dates submitted → room selected → payment completed. Drop-off between "room selected" and "payment completed" would flag friction in the inline widget flow specifically.
- **Slash-command usage vs. free-text booking phrasing** — tells us whether the discoverability bet (autocomplete menu) actually worked or whether guests still type around it.
- **Reservation conversion**: signed-in guests who complete at least one paid reservation.
- **Live-model vs. deterministic answer quality**, spot-checked manually when a real provider key is configured (no automated eval harness against a live model exists yet — see "what would we improve").

## What would we improve before production?

1. Real hotel PMS/inventory integration instead of the mock availability rule.
2. Real payment provider (Stripe/Razorpay) behind the "Pay now" step.
3. Rate limiting on `/api/chat` and auth endpoints.
4. Structured logging/monitoring and an automated live-model eval harness (current live-model checks are manual).
5. Thread rename/delete — currently threads can only be created and switched between.
6. Embedding-based retrieval once the knowledge base outgrows keyword matching.
7. Accessibility audit and stricter production CORS scoping now that a specific set of trusted frontend origins is known (currently reflects any origin, acceptable because auth is bearer-token based, but a production deployment with a fixed domain list could re-tighten this safely).
8. Analytics on the booking and chat funnels, and thumbs up/down feedback per answer.

## Engineering choices, briefly

| Choice | Why | Alternative rejected |
| --- | --- | --- |
| Split React+Vite / Express, not one framework | Explicit HTTP boundary between an untrusted browser and the server that owns every real decision; backend could serve a different frontend unchanged | Next.js single-project: valid too, but a deliberately different architecture from the reference implementation being compared against |
| Mantine as the component library | Distinct visual system, built-in accessible primitives (dialogs, forms, tables), fast to theme with a custom dusk/gold palette | Tailwind/plain CSS: more time spent on primitives that Mantine already solves |
| Bearer-token auth (no cookies) | Simpler CORS story for a split-stack app talking cross-origin in production; no `credentials: 'include'` complexity | Cookie/session-based auth: would need CSRF handling and same-site cookie config across two different Vercel deployments |
| Service-role key server-side + RLS as defense-in-depth | Backend already authenticates the bearer token before touching the database, so ownership checks (`user_id`, `profiles.role === 'staff'`) are explicit in application code; RLS policies still exist in `scripts/schema.sql` as a second layer | RLS-only with a forwarded client token: works, but moves the primary enforcement into policy files instead of reviewable request-handling code |
| Deterministic-first AI, provider chain optional | Zero-cost, zero-flakiness default; free-tier LLMs add real answers on top without being load-bearing for the assignment's required flows | LLM-required: would make the whole app's demo dependent on a third-party free tier staying up |
| Node built-in test runner + Supertest, offline against fakes | No network calls, no real Supabase project needed to run `npm test`; fast and deterministic | Mocking `fetch` per test: brittle, couples tests to HTTP client internals |
| Playwright for e2e, real Supabase project | Only way to genuinely verify the auth + persistence + booking flow end to end, including the newer responsive/widget/nested-thread UI | Skipping e2e: would leave the riskiest cross-cutting behavior (auth-gated persistence across the whole guest journey) unverified |
