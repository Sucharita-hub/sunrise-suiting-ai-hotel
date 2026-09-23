import { supabaseAdmin } from "./supabaseAdmin.js";

// Express has no built-in session cookie here — the frontend talks to
// Supabase directly and sends the resulting access token as a bearer
// header on every API call. This middleware is the one place that turns
// that token into a trusted req.user for every route below it.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "Missing bearer token." });
  }

  try {
    const { data, error } = await supabaseAdmin().auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid or expired session." });
    }
    req.user = { id: data.user.id, email: data.user.email };
    next();
  } catch (err) {
    console.error("AUTH_MIDDLEWARE_ERROR", err);
    return res.status(401).json({ ok: false, error: "Could not verify session." });
  }
}
