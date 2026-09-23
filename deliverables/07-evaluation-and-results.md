# Evaluation and test scenarios

Two layers. **Automated backend** (Node's built-in test runner + Supertest, offline against in-memory fakes — no network calls, no real Supabase project needed) and **automated end-to-end** (Playwright, real Supabase project, real Express + Vite servers). Both run with zero AI provider keys configured, exercising the deterministic retrieval path — this is the app's actual default, not a degraded test mode.

Run: `cd backend && npm test` · `cd e2e && npx playwright test`

## Scenario matrix

| # | Category | Input | Expected | Verified by | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Normal question | "What time is check-in?" | Grounded answer states the check-in time, sourced from `hotel.json` | `assistant.test.js` #3 "answers check-in question" | Pass |
| 2 | Normal question | Breakfast/amenity question | Grounded answer from the matching retrieved section | `assistant.test.js` #4 "answers breakfast question" | Pass |
| 3 | Ambiguous / out-of-scope question | Question with no matching knowledge-base section | Flagged `grounded: false`, safe fallback text, recorded for the Admin coverage-gap feed | `assistant.test.js` #5 "unsupported question is flagged as ungrounded" | Pass |
| 4 | Conversation follow-up | Two messages in the same thread, second depends on the first | Thread history passed to the retrieval/answer step, follow-up resolved in context | `assistant.test.js` #6 "follow-up question in the same thread preserves context" | Pass |
| 5 | Availability / tool-calling | `POST /api/availability` with a valid date range + guest count | Deterministic room list, correct capacity filtering, no LLM involved | `assistant.test.js` #7 "availability returns matching rooms" | Pass |
| 6 | Missing / invalid information | Check-out before check-in | HTTP 400, readable error, no reservation created | `assistant.test.js` #8 "invalid date range is rejected" | Pass |
| 7 | Missing information | Availability request with no guest count | HTTP 400, readable error | `assistant.test.js` #9 "missing guest count is rejected" | Pass |
| 8 | Availability edge case | Date range with zero mock inventory | Empty room list returned cleanly, not an error | `assistant.test.js` #10 "unavailable mock date returns zero rooms" | Pass |
| 9 | Validation | Empty chat message | HTTP 400, rejected before hitting retrieval/LLM | `assistant.test.js` #11 "chat endpoint rejects an empty message" | Pass |
| 10 | Auth / access control | Chat request with no bearer token | HTTP 401, no chat logic runs | `assistant.test.js` #2 "chat requires auth" | Pass |
| 11 | Auth / access control | Non-staff guest requests `?scope=all` reservations | Staff-only enforced server-side (403/filtered), not just hidden client-side | `assistant.test.js` #13 "only staff can list all reservations" | Pass |
| 12 | Incorrect / unsupported assumption (hallucination guard) | Simulated model answer containing a number absent from the retrieved source text | Answer discarded, deterministic paragraph used instead | `assistant.test.js` #14 "hallucination guard rejects a number absent from retrieved sections" | Pass |
| 13 | Booking / tool-calling, full flow | Create reservation → pay | Reservation created unpaid, then flips to paid with a `DEMO-xxxxxxxx` reference | `assistant.test.js` #12 "reservation create-then-pay flow" | Pass |
| 14 | End-to-end frontend-to-backend flow | Sign in → ask a question → follow up → check availability → book → pay → confirmation widget → visible in My Reservations | Full inline chat-widget flow works through real servers and a real Supabase project | `e2e/tests/guest-journey.spec.js`, `e2e/tests/chat-widgets.spec.js` | Pass |
| 15 | Frontend loading/error states | Slow or failing backend call from the browser | Typing indicator while pending, inline error message on failure, input remains usable, history preserved | `e2e/tests/chat-widgets.spec.js`, `e2e/tests/guest-journey.spec.js` | Pass |
| 16 | Responsiveness | Same guest + staff journeys at mobile (390×844) and tablet (820×1180) viewports, including the off-canvas nav and nested/collapsible thread list | All flows usable, no dead-end UI states | `e2e/tests/responsive.spec.js` | Pass |

## Observed results (2026-09-23)

```
cd backend && npm test
tests 14
pass 14
fail 0
duration_ms ~460
```

Backend suite is fully offline (in-memory fake repos, no network calls) — this exact result is reproducible with zero environment setup.

End-to-end suite (`e2e/tests/{guest-journey,design-review,chat-widgets,responsive}.spec.js`) was run against real Express + Vite dev servers and a real Supabase project earlier in this development pass, covering: full guest journey (sign in → chat → inline booking widgets → pay → confirmation → visible in My Reservations), staff journey (sign in → Admin tab → all reservations → flagged questions), slash-command coverage (`/rooms`, `/info`, `/reservations`, `/help`), and the mobile/tablet responsive pass (burger nav, Escape-to-close, nested collapsible thread list, horizontally-scrollable tables) — all passing at the time each feature was added and verified with screenshots under `e2e/design-review/`.

## Known regression caught during development

Narrowing the booking-intent word list (see `deliverables/06-decisions-note.md`) was itself caught by this suite: an early version of the booking short-circuit treated `"check-in"`/`"check-out"`/`"dates"`/`"stay"` as booking-intent words, which broke test #3 ("answers check-in question") by hijacking a real knowledge question with the booking-widget nudge instead of answering it. Narrowing the word list to `book`/`reserve`/`reservation`/`availability`/`available` fixed the regression without weakening the booking short-circuit, confirmed by all 14 tests passing again. This is exactly the kind of failure the assignment's "incorrect or unsupported assumptions" category is meant to surface — the assumption here was "these words only ever mean booking intent," and the test suite proved that assumption wrong.

## Known gaps

- No automated eval harness against a *live* (non-mock) LLM provider — when a real Groq/Gemini/OpenAI key is configured, answer quality is checked manually, not via a repeatable scenario suite.
- Keyword retrieval can miss paraphrases of a knowledge-base topic; embeddings would fix this (see decisions note).
- Slash-command autocomplete discoverability hasn't been measured with real users — only that the commands themselves work.
