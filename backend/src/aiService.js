import OpenAI from "openai";
import hotel from "../data/hotel.json" with { type: "json" };
import { cleanHistory } from "./utils.js";

// AI provider is fully OPTIONAL. If no key is set for either provider below,
// the assistant runs entirely on the deterministic rule-based logic further
// down this file — no external API calls, no cost, no billing risk.
//
// Two ways to enable a real LLM, both optional:
//  1) GROQ_API_KEY  -> uses Groq's free tier (no credit card required,
//     generous free rate limits). Recommended for this assignment.
//  2) OPENAI_API_KEY -> uses OpenAI (this one is paid / requires billing
//     credit on your OpenAI account — only set this if you intend to pay).
let client = null;
let model = null;
let provider = "none";

if (process.env.GEMINI_API_KEY) {
  // Google Gemini exposes an OpenAI-compatible endpoint, so we can reuse
  // the same OpenAI SDK client just by pointing baseURL at Google.
  client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
  });
  model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  provider = "gemini";
} else if (process.env.GROQ_API_KEY) {
  client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
  });
  model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  provider = "groq";
} else if (process.env.OPENAI_API_KEY) {
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  provider = "openai";
}

const fallbackRules = [
  {
    keywords: ["check-in", "check in", "arrival"],
    answer: `Check-in is at ${hotel.hotel.checkIn}.`
  },
  {
    keywords: ["check-out", "check out", "departure"],
    answer: `Check-out is at ${hotel.hotel.checkOut}.`
  },
  {
    keywords: ["breakfast", "morning meal"],
    answer: hotel.hotel.breakfast
  },
  {
    keywords: ["pool", "swimming"],
    answer: hotel.hotel.pool
  },
  {
    keywords: ["wifi", "wi-fi", "internet"],
    answer: hotel.hotel.wifi
  },
  {
    keywords: ["cancel", "cancellation", "refund"],
    answer: hotel.hotel.cancellation
  },
  {
    keywords: ["parking", "car"],
    answer: hotel.hotel.parking
  },
  {
    keywords: ["address", "location", "where are you"],
    answer: `Sunrise Suites is located at ${hotel.hotel.address}.`
  }
];

function findRoomAnswer(text) {
  const lower = text.toLowerCase();

  if (lower.includes("room") && (lower.includes("three") || lower.includes("3"))) {
    const room = hotel.rooms.find(r => r.maxGuests >= 3);
    return `${room.name} can accommodate up to ${room.maxGuests} guests. It has ${room.beds}, is ${room.size}, and starts at ₹${room.price.toLocaleString("en-IN")} per night.`;
  }

  if (lower.includes("room") && lower.includes("price")) {
    return hotel.rooms
      .map(r => `${r.name}: ₹${r.price.toLocaleString("en-IN")} per night.`)
      .join(" ");
  }

  return null;
}

function deterministicAnswer(message, history) {
  const text = message.toLowerCase();

  // Basic follow-up handling.
  if (history.length > 0 && ["what about", "and", "how about"].some(p => text.startsWith(p))) {
    if (text.includes("breakfast")) return hotel.hotel.breakfast;
    if (text.includes("pool")) return hotel.hotel.pool;
    if (text.includes("check")) return `Check-in is at ${hotel.hotel.checkIn} and check-out is at ${hotel.hotel.checkOut}.`;
  }

  const roomAnswer = findRoomAnswer(message);
  if (roomAnswer) return roomAnswer;

  const rule = fallbackRules.find(item =>
    item.keywords.some(keyword => text.includes(keyword))
  );

  if (rule) return rule.answer;

  if (text.includes("available") || text.includes("availability")) {
    return "I can check room availability for you. Please provide your check-in date, check-out date, and number of guests.";
  }

  return "I can help with Sunrise Suites rooms, check-in/check-out, breakfast, swimming pool, Wi-Fi, parking, cancellation policy, and room availability. What would you like to know?";
}

// Words that signal the guest wants to book/check dates/pick a room, so we
// can surface the inline date-picker widget instead of just replying in text.
const BOOKING_INTENT_WORDS = [
  "book", "booking", "reserve", "reservation", "availability", "available",
  "check in", "check-in", "checkin", "dates", "stay", "room", "suite", "pay", "payment"
];

function hasBookingIntent(text) {
  const lower = text.toLowerCase();
  return BOOKING_INTENT_WORDS.some(word => lower.includes(word));
}

// Strips ```json ... ``` fences some models wrap structured output in.
function stripCodeFences(text) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export async function answerQuestion({ message, history = [] }) {
  const safeHistory = cleanHistory(history);

  if (!client) {
    const answer = deterministicAnswer(message, safeHistory);
    return {
      answer,
      widget: hasBookingIntent(message) ? "date_picker" : "none",
      source: "deterministic-fallback"
    };
  }

  const hotelContext = JSON.stringify(hotel, null, 2);

  const input = [
    {
      role: "system",
      content: `You are the guest assistant for Sunrise Suites.
Answer only using the hotel data supplied below.
Do not invent amenities, prices, policies, room features, or availability.
If the supplied data does not answer the question, say you do not have that information and offer a useful next step.
Keep responses concise, warm and useful.

This app shows booking steps as interactive chat widgets instead of separate
pages, so you never need to ask the guest to type dates, pick a room, or
confirm payment in plain text — a widget below your reply handles that.

Respond with ONLY a compact JSON object, no markdown fences, no extra text,
in exactly this shape:
{"reply": "<your short chat reply>", "widget": "none" | "date_picker"}

Rules for "widget":
- Use "date_picker" whenever the guest wants to check availability, book a
  room, or mentions dates/guests for a stay — the widget lets them pick
  check-in/check-out dates and guest count and shows real available rooms.
  Keep "reply" short in this case, e.g. "Sure, pick your dates below:" —
  do not list rooms or prices yourself, the widget does that with live data.
- Use "none" for every other question (amenities, policies, general info).
- Room selection and payment are handled by follow-up widgets automatically
  after the guest picks dates, so you do not need to trigger those yourself.

HOTEL DATA:
${hotelContext}`
    },
    ...safeHistory.map(item => ({
      role: item.role,
      content: item.content
    })),
    {
      role: "user",
      content: message
    }
  ];

  try {
    const response = await client.chat.completions.create({
      model,
      messages: input,
      temperature: 0.3,
      max_tokens: 400
    });

    const raw = response.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      const answer = deterministicAnswer(message, safeHistory);
      return { answer, widget: hasBookingIntent(message) ? "date_picker" : "none", source: provider };
    }

    try {
      const parsed = JSON.parse(stripCodeFences(raw));
      const widget = parsed.widget === "date_picker" ? "date_picker" : "none";
      const answer = typeof parsed.reply === "string" && parsed.reply.trim()
        ? parsed.reply.trim()
        : deterministicAnswer(message, safeHistory);

      return { answer, widget, source: provider };
    } catch {
      // Model didn't return valid JSON (can happen occasionally) — fall
      // back to treating the raw text as the reply so the chat still works.
      return {
        answer: raw,
        widget: hasBookingIntent(message) ? "date_picker" : "none",
        source: `${provider} (unstructured)`
      };
    }
  } catch (error) {
    // If the LLM call fails for any reason (bad key, no quota/credit,
    // network issue, rate limit, etc.) we never surface that failure to
    // the guest — we quietly fall back to the deterministic answer so the
    // chat still works.
    console.error("LLM_CALL_FAILED", provider, error?.message || error);
    const answer = deterministicAnswer(message, safeHistory);
    return {
      answer,
      widget: hasBookingIntent(message) ? "date_picker" : "none",
      source: "deterministic-fallback (llm error)"
    };
  }
}
