import { supabase } from "./supabaseClient";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// The frontend never manages its own session cookie — it asks Supabase for
// the current access token and forwards it as a bearer header. The Express
// backend verifies that token itself on every request (authMiddleware.js);
// there is no server-rendered cookie session in this architecture.
async function request(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "Request failed.");
  }
  return body;
}

export const api = {
  signup: (email, password) => request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  bootstrapProfile: () => request("/auth/bootstrap-profile", { method: "POST" }),
  sendMessage: (message, threadId) => request("/chat", { method: "POST", body: JSON.stringify({ message, threadId }) }),
  checkAvailability: (payload) => request("/availability", { method: "POST", body: JSON.stringify(payload) }),
  createReservation: (payload) => request("/reservations", { method: "POST", body: JSON.stringify(payload) }),
  payReservation: (id) => request(`/reservations/${id}/pay`, { method: "POST" }),
  listReservations: (scope) => request(`/reservations${scope === "all" ? "?scope=all" : ""}`),
  listFlaggedQuestions: () => request("/admin/flagged-questions")
};
