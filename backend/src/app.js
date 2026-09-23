import express from "express";
import cors from "cors";
import { answerQuestion } from "./aiService.js";
import { checkAvailability } from "./availabilityService.js";
import { cleanHistory, isValidISODate } from "./utils.js";
import { requireAuth as realRequireAuth } from "./authMiddleware.js";
import * as realProfiles from "./profileRepo.js";
import * as realThreads from "./threadRepo.js";
import * as realReservations from "./reservationRepo.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

// App factory instead of a module-level singleton so tests can swap in
// in-memory repos and a fake auth middleware — the same reason
// hotel-guest-assistant keeps an InMemoryConversationRepo alongside its
// Supabase one, just wired via constructor injection instead of a class.
export function createApp(deps = {}) {
  const auth = deps.auth ?? realRequireAuth;
  const profiles = deps.profiles ?? realProfiles;
  const threads = deps.threads ?? realThreads;
  const reservations = deps.reservations ?? realReservations;
  const flaggedQuestions = deps.flaggedQuestions ?? defaultFlaggedQuestions;

  const app = express();
  // Auth here is a bearer token verified per-request (no cookies, no
  // credentials: 'include'), so there's no CORS security reason to pin a
  // single origin. Pinning one caused "Failed to fetch" for anyone hitting
  // the backend from a different origin than whatever FRONTEND_ORIGIN
  // happened to be set to (preview URL, www vs bare domain, trailing
  // slash, wrong alias) — reflecting the caller's origin removes that
  // whole class of failure.
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "sunrise-suites-backend" });
  });

  // Public — no auth yet, this is what creates the account. Supabase's default
  // confirm-then-email flow hits the free-tier email rate limit almost
  // immediately during a demo, so this creates the user pre-confirmed via the
  // admin API and signs them in server-side instead — no email is ever sent.
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ ok: false, error: "Enter a valid email address." });
      }
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ ok: false, error: "Password must be at least 8 characters." });
      }

      const db = supabaseAdmin();
      const { error: createError } = await db.auth.admin.createUser({ email, password, email_confirm: true });
      if (createError) {
        const taken = createError.status === 422 || /already|registered|exists/i.test(createError.message || "");
        return res.status(taken ? 409 : 400).json({
          ok: false,
          error: taken ? "An account with this email already exists." : "Could not create your account. Please try again."
        });
      }

      const { data, error: signInError } = await db.auth.signInWithPassword({ email, password });
      if (signInError || !data.session) {
        console.error("SIGNUP_SIGNIN_ERROR", signInError);
        return res.status(500).json({ ok: false, error: "Account created, but sign-in failed. Please sign in." });
      }

      return res.status(200).json({ ok: true, session: data.session });
    } catch (error) {
      console.error("SIGNUP_ERROR", error);
      return res.status(500).json({ ok: false, error: "Could not create your account. Please try again." });
    }
  });

  app.post("/api/auth/bootstrap-profile", auth, async (req, res) => {
    try {
      const profile = await profiles.ensureProfile(req.user.id);
      return res.json({ ok: true, role: profile.role });
    } catch (error) {
      console.error("BOOTSTRAP_PROFILE_ERROR", error);
      return res.status(500).json({ ok: false, error: "Could not load your profile." });
    }
  });

  app.get("/api/threads", auth, async (req, res) => {
    try {
      const list = await threads.listThreads(req.user.id);
      return res.json({ ok: true, threads: list });
    } catch (error) {
      console.error("LIST_THREADS_ERROR", error);
      return res.status(500).json({ ok: false, error: "Could not load conversations." });
    }
  });

  app.get("/api/threads/:id/messages", auth, async (req, res) => {
    try {
      const id = await threads.ensureThread(req.params.id, req.user.id);
      const messages = await threads.getMessages(id);
      return res.json({ ok: true, messages });
    } catch (error) {
      if (error instanceof realThreads.ThreadAccessError) {
        return res.status(404).json({ ok: false, error: error.message });
      }
      console.error("GET_THREAD_MESSAGES_ERROR", error);
      return res.status(500).json({ ok: false, error: "Could not load conversation." });
    }
  });

  app.post("/api/chat", auth, async (req, res) => {
    try {
      const { message, threadId } = req.body || {};

      if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ ok: false, error: "Message is required." });
      }
      if (message.length > 2000) {
        return res.status(400).json({ ok: false, error: "Message is too long." });
      }

      const id = await threads.ensureThread(threadId, req.user.id);
      const history = await threads.getHistory(id);
      const result = await answerQuestion({ message: message.trim(), history: cleanHistory(history) });

      await threads.appendTurn(id, { content: message.trim() }, { content: result.answer, envelope: result });
      await threads.titleIfUnset(id, threads.deriveTitle(message.trim()));

      return res.json({ ok: true, threadId: id, ...result });
    } catch (error) {
      if (error instanceof realThreads.ThreadAccessError) {
        return res.status(404).json({ ok: false, error: error.message });
      }
      console.error("CHAT_ERROR", error);
      return res.status(500).json({ ok: false, error: "The assistant is temporarily unavailable. Please try again." });
    }
  });

  app.post("/api/availability", auth, async (req, res) => {
    try {
      const result = checkAvailability(req.body || {});
      if (!result.ok) {
        return res.status(result.status).json({ ok: false, error: result.error });
      }
      if (req.body?.threadId) {
        await threads
          .mergeSlots(req.body.threadId, { checkIn: req.body.checkIn, checkOut: req.body.checkOut, adults: req.body.adults })
          .catch(() => {});
      }
      return res.json(result);
    } catch (error) {
      console.error("AVAILABILITY_ERROR", error);
      return res.status(500).json({ ok: false, error: "Availability service is temporarily unavailable." });
    }
  });

  app.post("/api/reservations", auth, async (req, res) => {
    try {
      const { roomId, roomName, checkIn, checkOut, nights, adults, pricePerNight, totalPrice, threadId } = req.body || {};

      if (!roomId || !roomName || !isValidISODate(checkIn) || !isValidISODate(checkOut)) {
        return res.status(400).json({ ok: false, error: "Missing or invalid reservation details." });
      }
      if (!Number.isInteger(nights) || nights <= 0 || !Number.isInteger(adults) || adults <= 0) {
        return res.status(400).json({ ok: false, error: "Nights and guests must be positive whole numbers." });
      }
      if (typeof pricePerNight !== "number" || typeof totalPrice !== "number" || pricePerNight <= 0 || totalPrice <= 0) {
        return res.status(400).json({ ok: false, error: "Invalid pricing." });
      }

      const reservation = await reservations.createReservation(req.user.id, {
        roomId, roomName, checkIn, checkOut, nights, adults, pricePerNight, totalPrice, threadId
      });
      return res.status(201).json({ ok: true, reservation });
    } catch (error) {
      console.error("CREATE_RESERVATION_ERROR", error);
      return res.status(500).json({ ok: false, error: "Could not create reservation." });
    }
  });

  app.post("/api/reservations/:id/pay", auth, async (req, res) => {
    try {
      const reservation = await reservations.markPaid(req.params.id, req.user.id);
      return res.json({ ok: true, reservation });
    } catch (error) {
      if (error instanceof realReservations.ReservationAccessError) {
        return res.status(404).json({ ok: false, error: error.message });
      }
      console.error("PAY_RESERVATION_ERROR", error);
      return res.status(500).json({ ok: false, error: "Payment simulation failed." });
    }
  });

  app.get("/api/reservations", auth, async (req, res) => {
    try {
      if (req.query.scope === "all") {
        const role = await profiles.getRole(req.user.id);
        if (role !== "staff") {
          return res.status(403).json({ ok: false, error: "Staff access required." });
        }
        const all = await reservations.listAllReservations();
        return res.json({ ok: true, reservations: all });
      }
      const own = await reservations.listOwnReservations(req.user.id);
      return res.json({ ok: true, reservations: own });
    } catch (error) {
      console.error("LIST_RESERVATIONS_ERROR", error);
      return res.status(500).json({ ok: false, error: "Could not load reservations." });
    }
  });

  app.get("/api/admin/flagged-questions", auth, async (req, res) => {
    try {
      const role = await profiles.getRole(req.user.id);
      if (role !== "staff") {
        return res.status(403).json({ ok: false, error: "Staff access required." });
      }
      const questions = await flaggedQuestions();
      return res.json({ ok: true, questions });
    } catch (error) {
      console.error("FLAGGED_QUESTIONS_ERROR", error);
      return res.status(500).json({ ok: false, error: "Could not load flagged questions." });
    }
  });

  app.use((err, _req, res, _next) => {
    console.error("UNHANDLED_ERROR", err);
    res.status(500).json({ ok: false, error: "Unexpected server error." });
  });

  return app;
}

async function defaultFlaggedQuestions() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("thread_messages")
    .select("id, content, created_at, thread_id, threads(user_id)")
    .eq("role", "assistant")
    .filter("assistant_envelope->>grounded", "eq", "false")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}
