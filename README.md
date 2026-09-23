# Sunrise Suites — AI Hotel Guest Assistant

A full-stack React + Express hotel guest assistant built for the assignment.

> **Runs at zero cost by default.** No API key is required. Out of the box
> the assistant uses a deterministic, rule-based response engine — there is
> no external API call and therefore no possibility of hitting a billing
> wall or "insufficient credit" error. See [AI provider (optional)](#ai-provider-optional) below if you want to layer in a real
> LLM using Groq's free tier.

## Features

- Conversational hotel assistant
- Follow-up questions with conversation context
- Hotel knowledge base stored in JSON
- Works fully for free with zero API keys (deterministic mode)
- Optional real-LLM mode via Groq's free tier or OpenAI (paid)
- Deterministic fallback assistant when no API key is configured, and as a safety net if the LLM call ever fails
- Room availability tool/function
- Availability form for check-in, check-out and guests
- Room result cards
- Loading, validation and error states
- Responsive desktop/mobile UI
- Backend validation and request logging
- 10 automated backend tests
- No API key is exposed to the browser

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- AI: OpenAI Responses API (optional)
- Data: JSON mock hotel knowledge base
- Tests: Node built-in test runner + Supertest

## Project structure

```text
hotel-ai-assistant/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AvailabilityPanel.jsx
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── QuickQuestions.jsx
│   │   │   └── RoomCard.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── data/hotel.json
│   ├── src/
│   │   ├── aiService.js
│   │   ├── availabilityService.js
│   │   ├── server.js
│   │   └── utils.js
│   ├── tests/assistant.test.js
│   ├── .env.example
│   └── package.json
└── README.md
```

## Run locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend runs on `http://localhost:5000`.

By default (nothing added to `.env`) the app runs entirely on deterministic
logic — no external calls, no cost, nothing that can fail due to billing.
This is enough to demo the full assignment flow.

### AI provider (optional)

If you'd like real LLM-generated answers instead of (or in addition to) the
rule-based ones, you have two choices:

**Option A — Groq (free, recommended, no credit card required)**

1. Create a free account at https://console.groq.com and generate an API key.
2. Add to `backend/.env`:
   ```env
   GROQ_API_KEY=your_groq_key_here
   GROQ_MODEL=llama-3.1-8b-instant
   ```
3. Restart the backend. Chat responses will now come from the LLM, grounded
   in the hotel JSON, while availability stays fully deterministic.

**Option B — OpenAI (paid, only if you already have billing set up)**

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

If neither key is set, or if the LLM call fails for any reason (bad key, no
quota/credit, rate limit, network error), the backend automatically and
silently falls back to the deterministic assistant — the guest never sees a
broken chat.

### 2. Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## API examples

### Health

```bash
curl http://localhost:5000/api/health
```

### Ask assistant

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"What time is check-in?\",\"history\":[]}"
```

### Availability

```bash
curl -X POST http://localhost:5000/api/availability \
  -H "Content-Type: application/json" \
  -d "{\"checkIn\":\"2026-09-25\",\"checkOut\":\"2026-09-28\",\"adults\":2}"
```

## AI design

The backend first determines whether a request is an availability request. Availability is handled by deterministic business logic and never depends on an LLM.

For normal hotel questions, the assistant uses the hotel JSON knowledge base. When `GROQ_API_KEY` or `OPENAI_API_KEY` is set, the backend sends the relevant hotel data and conversation context to the chat completions API. The prompt explicitly instructs the model to stay within the supplied knowledge base and say it does not know when information is missing. If that call throws for any reason, the deterministic engine answers instead so the guest experience never breaks.

This separation reduces hallucination risk and keeps business logic deterministic.

## Test suite

Run:

```bash
cd backend
npm test
```

The suite covers:
1. health endpoint
2. check-in question
3. breakfast question
4. unsupported question fallback
5. follow-up context
6. availability success
7. invalid date range
8. missing guests
9. unavailable date range
10. end-to-end chat-to-availability style API flow

## Production improvements

Before production:
- replace mock availability with a hotel PMS/booking API
- add authentication/session handling where needed
- add rate limiting
- add structured logging/monitoring
- add database-backed hotel content
- add analytics for unanswered questions and availability conversions
- add prompt/version management and AI evaluation
- add accessibility audit
- add security headers and stricter CORS
