import { supabaseAdmin } from "./supabaseAdmin.js";

const MAX_HISTORY_TURNS = 20;

export class ThreadAccessError extends Error {}

// A serverless Express instance can't hold conversation state in memory
// between requests, so the DB is the only source of truth for both message
// history and remembered slots (check-in/out, guests) the assistant has
// picked up mid-conversation.
export async function ensureThread(threadId, userId) {
  const db = supabaseAdmin();

  if (threadId) {
    const { data, error } = await db
      .from("threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new ThreadAccessError("Conversation not found.");
    return data.id;
  }

  const { data, error } = await db
    .from("threads")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function getHistory(threadId) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("thread_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_TURNS);
  if (error) throw new Error(error.message);
  return (data ?? []).reverse();
}

export async function getSlots(threadId) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("threads")
    .select("guest_slots")
    .eq("id", threadId)
    .single();
  if (error) throw new Error(error.message);
  return data?.guest_slots ?? {};
}

export async function mergeSlots(threadId, slots) {
  const current = await getSlots(threadId);
  const merged = { ...current };
  for (const [key, value] of Object.entries(slots)) {
    if (value !== undefined && value !== null) merged[key] = value;
  }
  const db = supabaseAdmin();
  const { error } = await db.from("threads").update({ guest_slots: merged }).eq("id", threadId);
  if (error) throw new Error(error.message);
  return merged;
}

export async function appendTurn(threadId, userMessage, assistantMessage) {
  const db = supabaseAdmin();
  const { error } = await db.from("thread_messages").insert([
    { thread_id: threadId, role: "user", content: userMessage.content },
    {
      thread_id: threadId,
      role: "assistant",
      content: assistantMessage.content,
      assistant_envelope: assistantMessage.envelope ?? null
    }
  ]);
  if (error) throw new Error(error.message);
  await db.from("threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
}

export async function titleIfUnset(threadId, title) {
  const db = supabaseAdmin();
  await db.from("threads").update({ title }).eq("id", threadId).eq("title", "New conversation");
}

export async function listThreads(userId) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("threads")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function deriveTitle(text) {
  const collapsed = text.trim().replace(/\s+/g, " ");
  return collapsed.length <= 60 ? collapsed : `${collapsed.slice(0, 57)}...`;
}
