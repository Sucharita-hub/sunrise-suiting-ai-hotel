import { useState } from "react";
import {
  CalendarDays, Users, Search, LoaderCircle, AlertCircle,
  BedDouble, Ruler, CreditCard, CheckCircle2, Lock
} from "lucide-react";

// --- 1. Date picker widget --------------------------------------------
// Shown when the assistant decides the guest wants to check availability
// or start a booking. Submitting calls the real /api/availability endpoint
// (via onAction) so room data and prices are never invented by the AI.
export function DatePickerWidget({ onAction, disabled }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (!checkIn || !checkOut) return setError("Please select both dates.");
    if (checkOut <= checkIn) return setError("Check-out must be after check-in.");
    setError("");
    onAction({ type: "check_availability", checkIn, checkOut, adults: Number(adults) });
  }

  return (
    <form className="widget-card widget-datepicker" onSubmit={submit}>
      <label>
        <span><CalendarDays size={13} /> Check-in</span>
        <input type="date" value={checkIn} disabled={disabled} onChange={e => setCheckIn(e.target.value)} />
      </label>
      <label>
        <span><CalendarDays size={13} /> Check-out</span>
        <input type="date" value={checkOut} disabled={disabled} onChange={e => setCheckOut(e.target.value)} />
      </label>
      <label>
        <span><Users size={13} /> Guests</span>
        <select value={adults} disabled={disabled} onChange={e => setAdults(e.target.value)}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} Guest{n > 1 ? "s" : ""}</option>)}
        </select>
      </label>
      {error && <div className="widget-error"><AlertCircle size={13} /> {error}</div>}
      <button className="primary-button small widget-submit" disabled={disabled}>
        {disabled ? <LoaderCircle size={14} className="spin" /> : <Search size={14} />}
        Check availability
      </button>
    </form>
  );
}

// --- 2. Room options widget --------------------------------------------
// Rendered with real rooms returned by the availability API, so prices and
// availability shown here always match what the backend calculated.
export function RoomOptionsWidget({ widget, onAction, disabled }) {
  const { rooms = [], checkIn, checkOut, nights, adults } = widget;

  if (!rooms.length) {
    return (
      <div className="widget-card widget-empty">
        <span className="widget-empty-icon">🏨</span>
        <div>
          <strong>No rooms available</strong>
          <p>{checkIn} → {checkOut} · {adults} guest{adults > 1 ? "s" : ""}. Try different dates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-card widget-rooms">
      <div className="widget-rooms-meta">{checkIn} → {checkOut} · {nights} night{nights > 1 ? "s" : ""} · {adults} guest{adults > 1 ? "s" : ""}</div>
      {rooms.map(room => (
        <div className="widget-room" key={room.id}>
          <img src={room.image} alt={room.name} />
          <div className="widget-room-info">
            <strong>{room.name}</strong>
            <div className="widget-room-meta">
              <span><BedDouble size={12} /> {room.beds}</span>
              <span><Ruler size={12} /> {room.size}</span>
            </div>
            <div className="widget-room-footer">
              <div>
                <span className="widget-price">₹{room.totalPrice.toLocaleString("en-IN")}</span>
                <span className="widget-price-sub"> total</span>
              </div>
              <button
                className="primary-button small"
                disabled={disabled}
                onClick={() => onAction({ type: "select_room", room, checkIn, checkOut, nights })}
              >
                Select
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- 3. Payment widget --------------------------------------------------
// Demo-only: there is no real payment gateway wired up, so clicking Pay
// simulates processing and then confirms the booking locally.
export function PaymentWidget({ widget, onAction, disabled }) {
  const [status, setStatus] = useState("idle"); // idle | processing | done
  const { room, checkIn, checkOut, nights } = widget;

  function pay() {
    setStatus("processing");
    setTimeout(() => {
      setStatus("done");
      onAction({ type: "payment_complete", room, checkIn, checkOut, nights });
    }, 1100);
  }

  return (
    <div className="widget-card widget-payment">
      <div className="widget-payment-row"><span>Room</span><strong>{room.name}</strong></div>
      <div className="widget-payment-row"><span>Dates</span><strong>{checkIn} → {checkOut}</strong></div>
      <div className="widget-payment-row"><span>Nights</span><strong>{nights}</strong></div>
      <div className="widget-payment-row widget-payment-total"><span>Total due</span><strong>₹{room.totalPrice.toLocaleString("en-IN")}</strong></div>

      <button
        className="primary-button widget-pay-button"
        onClick={pay}
        disabled={disabled || status !== "idle"}
      >
        {status === "idle" && <><CreditCard size={15} /> Pay ₹{room.totalPrice.toLocaleString("en-IN")} now</>}
        {status === "processing" && <><LoaderCircle size={15} className="spin" /> Processing payment...</>}
        {status === "done" && <><CheckCircle2 size={15} /> Payment complete</>}
      </button>
      <div className="widget-secure-note"><Lock size={11} /> Demo payment — no card details required, nothing is charged.</div>
    </div>
  );
}

// --- Switcher -------------------------------------------------------------
export default function ChatWidget({ widget, onAction, disabled }) {
  if (!widget || widget.type === "none") return null;
  if (widget.type === "date_picker") return <DatePickerWidget onAction={onAction} disabled={disabled} />;
  if (widget.type === "room_options") return <RoomOptionsWidget widget={widget} onAction={onAction} disabled={disabled} />;
  if (widget.type === "payment") return <PaymentWidget widget={widget} onAction={onAction} disabled={disabled} />;
  return null;
}
