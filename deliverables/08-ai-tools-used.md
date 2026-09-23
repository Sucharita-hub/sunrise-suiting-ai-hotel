# AI tools used

Two separate lists: tools used **to build** this project, and AI models used **inside** the running app itself. These are not the same thing.

## Used to build the project (development-time only, not shipped in the app)

| Tool | Used for |
| --- | --- |
| Claude (Anthropic) via Claude Code | Requirements analysis, architecture decisions, scaffolding, writing the application code (frontend, backend, tests), documentation, working from the brief under direct human review and direction throughout |

## Used inside the app itself (runtime, ships in the product)

| Tool | Where it's called from | Used for | Required? |
| --- | --- | --- | --- |
| Google Gemini (`gemini-1.5-flash` by default) | `backend/src/aiService.js`, provider chain position 2 | Answers a guest's hotel-knowledge question using only the keyword-retrieved `hotel.json` sections it's given, checked afterward by the hallucination guard (`isGrounded()`) | No — optional, enabled by setting `GEMINI_API_KEY` |
| Groq (Llama models, e.g. `llama-3.1-8b-instant`) | `backend/src/aiService.js`, provider chain position 1 (tried first) | Same grounded-answering role as Gemini | No — optional, enabled by setting `GROQ_API_KEY` |
| OpenAI (e.g. `gpt-4o-mini`) | `backend/src/aiService.js`, provider chain position 3 (last fallback) | Same grounded-answering role, tried only if Groq and Gemini are both unset or fail | No — optional, enabled by setting `OPENAI_API_KEY` |

None of the three runtime providers is required — with no key set at all, the app answers every question with the deterministic retrieval engine and never makes an LLM call. When a key is set, the provider chain is tried in the order above and falls back to deterministic on any failure, so the guest-facing chat can never hard-fail because of a runtime AI provider.

How the work was directed: the assignment brief was worked through requirement by requirement. The backend's deterministic retrieval and hallucination guard were built and tested first, with the LLM layer added strictly as an optional enhancement on top — the app was never allowed to depend on a live model call to satisfy any required assignment flow. Every change was run through the backend test suite and, for UI/UX changes, manually verified in a browser and with Playwright end-to-end tests (including a dedicated responsive pass at mobile and tablet viewports) before being considered done. Product, UX, and engineering decisions in `06-decisions-note.md` were directed and reviewed by the author and are defensible independent of the tooling used to implement them.
