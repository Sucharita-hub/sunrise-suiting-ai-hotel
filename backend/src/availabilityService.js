import hotel from "../data/hotel.json" with { type: "json" };
import { daysBetween, isValidISODate } from "./utils.js";

export function checkAvailability({ checkIn, checkOut, adults }) {
  if (!isValidISODate(checkIn) || !isValidISODate(checkOut)) {
    return { ok: false, status: 400, error: "Please provide valid check-in and check-out dates." };
  }

  if (!Number.isInteger(adults) || adults < 1 || adults > 8) {
    return { ok: false, status: 400, error: "Guests must be a whole number between 1 and 8." };
  }

  const nights = daysBetween(checkIn, checkOut);

  if (nights <= 0) {
    return { ok: false, status: 400, error: "Check-out must be after check-in." };
  }

  if (nights > 30) {
    return { ok: false, status: 400, error: "For this demo, stays can be up to 30 nights." };
  }

  // Mock inventory rule:
  // Every room is available for most dates. Some dates are intentionally
  // unavailable so the UI can demonstrate the empty-results state.
  const dayOfMonth = Number(checkIn.slice(-2));
  const blocked = dayOfMonth % 7 === 0;

  const rooms = blocked
    ? []
    : hotel.rooms
        .filter(room => room.maxGuests >= adults)
        .map(room => ({
          ...room,
          totalPrice: room.price * nights,
          available: true
        }));

  return {
    ok: true,
    status: 200,
    data: {
      checkIn,
      checkOut,
      adults,
      nights,
      rooms
    }
  };
}
