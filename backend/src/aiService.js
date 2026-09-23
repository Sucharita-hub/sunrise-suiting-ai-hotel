import OpenAI from "openai";
import hotel from "../data/hotel.json" with { type: "json" };
import { cleanHistory } from "./utils.js";

// Provider chain, cheapest/most-available first. All optional — with none
// set the assistant runs entirely on the deterministic engine below, so
// the demo works with zero API keys and zero billing risk.
let client = null;
let model = null;
let provider = "none";

if (process.env.GROQ_API_KEY) {
  client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" });
  model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  provider = "groq";
} else if (process.env.GEMINI_API_KEY) {
  client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
  });
  model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  provider = "gemini";
} else if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  provider = "openai";
}

// --- Retrieval --------------------------------------------------------
// Instead of handing the whole hotel.json blob to the model (expensive,
// and harder to check for hallucination), break it into small labelled
// sections and only retrieve the ones that actually match the question.
function buildSections() {
  const h = hotel.hotel;
  const sections = [
    { id: "checkin", text: `Check-in is at ${h.checkIn}.` },
    { id: "checkout", text: `Check-out is at ${h.checkOut}.` },
    { id: "breakfast", text: h.breakfast },
    { id: "pool", text: h.pool },
    { id: "wifi", text: h.wifi },
    { id: "cancellation", text: h.cancellation },
    { id: "parking", text: h.parking },
    { id: "address", text: `Sunrise Suites is located at ${h.address}. Phone: ${h.phone}.` }
  ];
  for (const room of hotel.rooms) {
    sections.push({
      id: `room-${room.id}`,
      text: `${room.name}: ${room.description} ${room.beds}, sleeps up to ${room.maxGuests} guests, ${room.size}, ₹${room.price.toLocaleString("en-IN")} per night${room.breakfastIncluded ? ", breakfast included" : ""}.`
    });
  }
  return sections;
}

const SECTIONS = buildSections();
const STOPWORDS = new Set(["the", "a", "an", "is", "are", "for", "and", "to", "of", "do", "you", "what", "your", "i", "me", "my", "have", "with", "in", "at", "on"]);

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

export function retrieveSections(message, limit = 4) {
  const queryWords = tokenize(message);
  if (queryWords.length === 0) return [];

  const scored = SECTIONS.map((section) => {
    const lowerText = section.text.toLowerCase();
    const score = queryWords.reduce((sum, word) => sum + (lowerText.includes(word) ? 1 : 0), 0);
    return { ...section, score };
  }).filter((section) => section.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function findRoomAnswer(text) {
  const lower = text.toLowerCase();
  if (lower.includes("room") && lower.includes("price")) {
    return hotel.rooms.map((r) => `${r.name}: ₹${r.price.toLocaleString("en-IN")} per night.`).join(" ");
  }
  return null;
}

function deterministicAnswer(message, sections) {
  const roomAnswer = findRoomAnswer(message);
  if (roomAnswer) return { answer: roomAnswer, grounded: true };

  if (sections.length > 0) {
    return { answer: sections.map((s) => s.text).join(" "), grounded: true };
  }

  const lower = message.toLowerCase();
  if (lower.includes("available") || lower.includes("availability") || lower.includes("book")) {
    return {
      answer: "I can help you check room availability — head to the \"Book a Stay\" tab and pick your dates and guest count.",
      grounded: true
    };
  }

  return {
    answer: "I don't have that information in what I know about Sunrise Suites. I can help with check-in/check-out, breakfast, the pool, Wi-Fi, parking, cancellation policy, and room details.",
    grounded: false
  };
}

const BOOKING_INTENT_WORDS = ["book", "booking", "reserve", "reservation", "availability", "available", "check in", "check-in", "checkin", "dates", "stay"];

function hasBookingIntent(text) {
  const lower = text.toLowerCase();
  return BOOKING_INTENT_WORDS.some((word) => lower.includes(word));
}

function stripCodeFences(text) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function extractNumbers(text) {
  return text.match(/\d[\d,.]*/g) ?? [];
}

// Hallucination guard: any number the model states that doesn't appear
// anywhere in the sections we actually retrieved is treated as invented
// (a price, a time, a guest count it made up), and we fall back to the
// deterministic answer instead of showing it to the guest.
export function isGrounded(reply, sections) {
  const sourceText = sections.map((s) => s.text).join(" ");
  const numbers = extractNumbers(reply);
  return numbers.every((n) => sourceText.includes(n));
}

export async function answerQuestion({ message, history = [] }) {
  const safeHistory = cleanHistory(history);
  const sections = retrieveSections(message);
  const intent = hasBookingIntent(message) ? "booking" : "info";

  if (!client) {
    const { answer, grounded } = deterministicAnswer(message, sections);
    return { answer, grounded, intent, source: "deterministic" };
  }

  const context = sections.length > 0 ? sections.map((s) => `- ${s.text}`).join("\n") : "(no matching hotel information found)";

  const messages = [
    {
      role: "system",
      content: `You are the guest assistant for Sunrise Suites hotel.
Answer ONLY using the RETRIEVED HOTEL INFORMATION below. Never invent a price, time, room feature, or policy that is not stated there.
If the retrieved information does not answer the question, say so plainly and suggest what you *can* help with.
Keep replies short, warm, and specific.

Respond with ONLY a compact JSON object, no markdown fences, no extra text, in exactly this shape:
{"reply": "<short chat reply>", "grounded": true | false}

Set "grounded" to false whenever the retrieved information does not actually answer the question (even if you still give a helpful general reply).

RETRIEVED HOTEL INFORMATION:
${context}`
    },
    ...safeHistory.map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content: message }
  ];

  try {
    const response = await client.chat.completions.create({ model, messages, temperature: 0.3, max_tokens: 300 });
    const raw = response.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      const fallback = deterministicAnswer(message, sections);
      return { answer: fallback.answer, grounded: fallback.grounded, intent, source: "deterministic (empty llm response)" };
    }

    let parsed;
    try {
      parsed = JSON.parse(stripCodeFences(raw));
    } catch {
      const fallback = deterministicAnswer(message, sections);
      return { answer: fallback.answer, grounded: fallback.grounded, intent, source: "deterministic (unparseable llm response)" };
    }

    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : null;
    if (!reply) {
      const fallback = deterministicAnswer(message, sections);
      return { answer: fallback.answer, grounded: fallback.grounded, intent, source: "deterministic (empty llm reply field)" };
    }

    if (!isGrounded(reply, sections)) {
      const fallback = deterministicAnswer(message, sections);
      return { answer: fallback.answer, grounded: fallback.grounded, intent, source: "deterministic (hallucination guard)" };
    }

    return { answer: reply, grounded: Boolean(parsed.grounded), intent, source: provider };
  } catch (error) {
    console.error("LLM_CALL_FAILED", provider, error?.message || error);
    const fallback = deterministicAnswer(message, sections);
    return { answer: fallback.answer, grounded: fallback.grounded, intent, source: "deterministic (llm error)" };
  }
}
