import { supabaseAdmin } from "./supabaseAdmin.js";

// Lazily creates a profile row the first time a guest is seen, instead of
// a DB trigger on auth.users — keeps all app logic in this repo.
export async function ensureProfile(userId) {
  const db = supabaseAdmin();

  const { data: existing, error: selectError } = await db
    .from("profiles")
    .select("user_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (existing) return existing;

  const { data: created, error: insertError } = await db
    .from("profiles")
    .insert({ user_id: userId })
    .select("user_id, role")
    .single();

  if (insertError) throw new Error(insertError.message);
  return created;
}

export async function getRole(userId) {
  const profile = await ensureProfile(userId);
  return profile.role;
}
