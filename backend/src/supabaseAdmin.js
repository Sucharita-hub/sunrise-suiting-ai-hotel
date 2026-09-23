import { createClient } from "@supabase/supabase-js";

// Service-role client: bypasses row-level security. Never sent to the
// browser. Every query built with it filters by the authenticated user's
// id explicitly (see threadRepo.js / reservationRepo.js) — RLS in
// scripts/schema.sql is defense-in-depth, not the only gate.
let cached = null;

export function supabaseAdmin() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return cached;
}
