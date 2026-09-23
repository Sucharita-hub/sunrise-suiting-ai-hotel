# AI tools used during development

| Tool | Used for |
| --- | --- |
| Claude (Anthropic) via Claude Code | Requirements analysis, architecture decisions, scaffolding, writing the application code (frontend, backend, tests), documentation, working from the brief under direct human review and direction throughout |
| Groq (Llama), Google Gemini, OpenAI | Optional runtime models inside the product itself, for grounded answering on top of retrieval. None required — the app's default, zero-cost path is deterministic retrieval with no LLM call at all. Not used to write code |

How the work was directed: the assignment brief was worked through requirement by requirement. The backend's deterministic retrieval and hallucination guard were built and tested first, with the LLM layer added strictly as an optional enhancement on top — the app was never allowed to depend on a live model call to satisfy any required assignment flow. Every change was run through the backend test suite and, for UI/UX changes, manually verified in a browser and with Playwright end-to-end tests (including a dedicated responsive pass at mobile and tablet viewports) before being considered done. Product, UX, and engineering decisions in `06-decisions-note.md` were directed and reviewed by the author and are defensible independent of the tooling used to implement them.
