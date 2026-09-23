import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "./supabaseAdmin.js";

export class ReservationAccessError extends Error {}

export async function createReservation(userId, payload) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("reservations")
    .insert({
      user_id: userId,
      thread_id: payload.threadId ?? null,
      room_id: payload.roomId,
      room_name: payload.roomName,
      check_in: payload.checkIn,
      check_out: payload.checkOut,
      nights: payload.nights,
      adults: payload.adults,
      price_per_night: payload.pricePerNight,
      total_price: payload.totalPrice,
      currency: payload.currency ?? "INR"
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Demo-only: there is no real payment gateway, so "paying" just marks the
// reservation paid and stamps a fake reference so the UI has something to
// show. Never charges anything.
export async function markPaid(reservationId, userId) {
  const db = supabaseAdmin();
  const { data: existing, error: selectError } = await db
    .from("reservations")
    .select("id")
    .eq("id", reservationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (!existing) throw new ReservationAccessError("Reservation not found.");

  const reference = `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
  const { data, error } = await db
    .from("reservations")
    .update({ payment_status: "paid", payment_reference: reference })
    .eq("id", reservationId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listOwnReservations(userId) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("reservations")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAllReservations() {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("reservations")
    .select()
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
