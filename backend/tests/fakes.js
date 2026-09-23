import { ThreadAccessError, deriveTitle } from "../src/threadRepo.js";
import { ReservationAccessError } from "../src/reservationRepo.js";

// In-memory stand-ins for the Supabase-backed repos, same shape as the
// real ones, so the unit suite runs fully offline and fast — no live
// Supabase project or applied schema required. The real repos are only
// exercised by the Playwright e2e suite.

export function fakeAuth(req, res, next) {
  const userId = req.headers["x-test-user-id"];
  if (!userId) return res.status(401).json({ ok: false, error: "Missing bearer token." });
  req.user = { id: userId, email: `${userId}@test.local` };
  next();
}

export function createFakeThreads() {
  const store = new Map();
  let counter = 0;

  return {
    async ensureThread(threadId, userId) {
      if (threadId) {
        const t = store.get(threadId);
        if (!t || t.userId !== userId) throw new ThreadAccessError("Conversation not found.");
        return threadId;
      }
      const id = `thread-${++counter}`;
      store.set(id, { userId, turns: [], slots: {}, title: "New conversation" });
      return id;
    },
    async getHistory(threadId) {
      return store.get(threadId)?.turns.slice(-20) ?? [];
    },
    async getSlots(threadId) {
      return { ...(store.get(threadId)?.slots ?? {}) };
    },
    async mergeSlots(threadId, slots) {
      const t = store.get(threadId);
      if (!t) throw new ThreadAccessError("Conversation not found.");
      Object.assign(t.slots, slots);
      return { ...t.slots };
    },
    async appendTurn(threadId, user, assistant) {
      const t = store.get(threadId);
      if (!t) throw new ThreadAccessError("Conversation not found.");
      t.turns.push({ role: "user", content: user.content }, { role: "assistant", content: assistant.content });
      (t.messages ??= []).push(
        { role: "user", content: user.content, assistant_envelope: null },
        { role: "assistant", content: assistant.content, assistant_envelope: assistant.envelope ?? null }
      );
    },
    async getMessages(threadId) {
      const t = store.get(threadId);
      if (!t) throw new ThreadAccessError("Conversation not found.");
      return t.messages ?? [];
    },
    async titleIfUnset(threadId, title) {
      const t = store.get(threadId);
      if (t && t.title === "New conversation") t.title = title;
    },
    async listThreads(userId) {
      return [...store.entries()]
        .filter(([, t]) => t.userId === userId)
        .map(([id, t]) => ({ id, title: t.title }));
    },
    deriveTitle
  };
}

export function createFakeReservations() {
  const store = new Map();
  let counter = 0;

  return {
    async createReservation(userId, payload) {
      const id = `reservation-${++counter}`;
      const reservation = {
        id,
        user_id: userId,
        status: "confirmed",
        payment_status: "unpaid",
        payment_reference: null,
        ...payload
      };
      store.set(id, reservation);
      return reservation;
    },
    async markPaid(id, userId) {
      const r = store.get(id);
      if (!r || r.user_id !== userId) throw new ReservationAccessError("Reservation not found.");
      r.payment_status = "paid";
      r.payment_reference = `DEMO-TEST-${id}`;
      return r;
    },
    async listOwnReservations(userId) {
      return [...store.values()].filter((r) => r.user_id === userId);
    },
    async listAllReservations() {
      return [...store.values()];
    }
  };
}

export function createFakeProfiles(roles = {}) {
  return {
    async ensureProfile(userId) {
      return { user_id: userId, role: roles[userId] ?? "guest" };
    },
    async getRole(userId) {
      return roles[userId] ?? "guest";
    }
  };
}
