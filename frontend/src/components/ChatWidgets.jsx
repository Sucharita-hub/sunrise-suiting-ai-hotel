import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Group, Image, Loader, NumberInput, Stack, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { BedDouble, CreditCard, Lock, Ruler, Search, CheckCircle2, MapPin, Phone, Wifi, Waves, Coffee, Car, CalendarClock } from "lucide-react";
import { api } from "../lib/api";
import { ROOMS, HOTEL_INFO } from "../data/staticInfo";

function isoDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DatePickerWidget({ onSubmit, disabled, resolved }) {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [adults, setAdults] = useState(2);
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (!checkIn || !checkOut) return setError("Pick both check-in and check-out dates.");
    const inIso = isoDate(checkIn);
    const outIso = isoDate(checkOut);
    if (outIso <= inIso) return setError("Check-out must be after check-in.");
    setError("");
    onSubmit({ checkIn: inIso, checkOut: outIso, adults: Number(adults) });
  }

  return (
    <Card withBorder radius="lg" padding="md" component="form" onSubmit={submit} opacity={resolved ? 0.6 : 1}>
      <Stack gap="sm">
        <Group align="flex-end" wrap="wrap" gap="sm">
          <DateInput label="Check-in" size="xs" valueFormat="YYYY-MM-DD" value={checkIn} onChange={setCheckIn} minDate={new Date()} disabled={disabled || resolved} />
          <DateInput label="Check-out" size="xs" valueFormat="YYYY-MM-DD" value={checkOut} onChange={setCheckOut} minDate={checkIn ?? new Date()} disabled={disabled || resolved} />
          <NumberInput label="Guests" size="xs" value={adults} onChange={setAdults} min={1} max={8} w={80} disabled={disabled || resolved} />
        </Group>
        {error && (
          <Alert color="red" variant="light" py={4}>
            {error}
          </Alert>
        )}
        <Button type="submit" size="xs" color="teal" leftSection={<Search size={13} />} loading={disabled} disabled={resolved}>
          Check availability
        </Button>
      </Stack>
    </Card>
  );
}

export function RoomOptionsWidget({ rooms, checkIn, checkOut, nights, adults, onSelect, disabled, resolved }) {
  if (!rooms.length) {
    return (
      <Alert color="gray" variant="light" radius="lg">
        No rooms available for {checkIn} to {checkOut}. Try a different date range.
      </Alert>
    );
  }

  return (
    <Card withBorder radius="lg" padding="md" opacity={resolved ? 0.6 : 1}>
      <Stack gap="sm">
        <Text size="xs" c="dimmed">
          {checkIn} to {checkOut} · {nights} night{nights > 1 ? "s" : ""} · {adults} guest{adults > 1 ? "s" : ""}
        </Text>
        {rooms.map((room) => (
          <Group key={room.id} wrap="nowrap" gap="sm" p="xs" style={{ border: "1px solid #eee", borderRadius: 12 }}>
            <Image src={room.image} w={72} h={54} radius="md" alt={room.name} />
            <Stack gap={2} style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                {room.name}
              </Text>
              <Group gap={8}>
                <Text size="xs" c="dimmed" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <BedDouble size={11} /> {room.beds}
                </Text>
                <Text size="xs" c="dimmed" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Ruler size={11} /> {room.size}
                </Text>
              </Group>
            </Stack>
            <Stack gap={2} align="flex-end">
              <Text size="sm" fw={700} c="teal.7">
                ₹{room.totalPrice.toLocaleString("en-IN")}
              </Text>
              <Button size="xs" color="teal" disabled={disabled || resolved} onClick={() => onSelect(room)}>
                Select
              </Button>
            </Stack>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

export function PaymentWidget({ room, checkIn, checkOut, nights, onPay, disabled, resolved }) {
  const [status, setStatus] = useState("idle"); // idle | processing | error
  const [error, setError] = useState("");

  async function pay() {
    setStatus("processing");
    setError("");
    try {
      await onPay();
    } catch (err) {
      setStatus("idle");
      setError(err.message || "Payment simulation failed.");
    }
  }

  return (
    <Card withBorder radius="lg" padding="md" opacity={resolved ? 0.6 : 1}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Room
          </Text>
          <Text size="sm" fw={600}>
            {room.name}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Dates
          </Text>
          <Text size="sm">
            {checkIn} → {checkOut} · {nights} night{nights > 1 ? "s" : ""}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Total due
          </Text>
          <Text size="sm" fw={700} c="teal.7">
            ₹{room.totalPrice.toLocaleString("en-IN")}
          </Text>
        </Group>
        {error && (
          <Alert color="red" variant="light" py={4}>
            {error}
          </Alert>
        )}
        <Button
          leftSection={resolved ? <CheckCircle2 size={14} /> : <CreditCard size={14} />}
          color="teal"
          loading={status === "processing" || disabled}
          disabled={resolved}
          onClick={pay}
        >
          {resolved ? "Payment complete" : `Pay ₹${room.totalPrice.toLocaleString("en-IN")} now`}
        </Button>
        <Group gap={4} justify="center">
          <Lock size={10} />
          <Text size="xs" c="dimmed">
            Demo payment — no card details required, nothing is charged.
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}

export function BrowseRoomsWidget({ onCheckDates, disabled }) {
  return (
    <Card withBorder radius="lg" padding="md">
      <Stack gap="sm">
        <Text size="xs" c="dimmed">
          Our room types — prices are per night, before dates are applied.
        </Text>
        {ROOMS.map((room) => (
          <Group key={room.id} wrap="nowrap" gap="sm" p="xs" style={{ border: "1px solid #eee", borderRadius: 12 }}>
            <Image src={room.image} w={72} h={54} radius="md" alt={room.name} />
            <Stack gap={2} style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                {room.name}
              </Text>
              <Group gap={8}>
                <Text size="xs" c="dimmed" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <BedDouble size={11} /> {room.beds}
                </Text>
                <Text size="xs" c="dimmed" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Ruler size={11} /> {room.size}
                </Text>
              </Group>
            </Stack>
            <Text size="sm" fw={700} c="teal.7">
              ₹{room.price.toLocaleString("en-IN")}/night
            </Text>
          </Group>
        ))}
        <Button size="xs" color="teal" leftSection={<CalendarClock size={13} />} disabled={disabled} onClick={onCheckDates}>
          Check dates for these rooms
        </Button>
      </Stack>
    </Card>
  );
}

export function HotelInfoWidget() {
  const rows = [
    { icon: MapPin, label: HOTEL_INFO.address },
    { icon: Phone, label: HOTEL_INFO.phone },
    { icon: CalendarClock, label: `Check-in ${HOTEL_INFO.checkIn} · Check-out ${HOTEL_INFO.checkOut}` },
    { icon: Coffee, label: `Breakfast ${HOTEL_INFO.breakfast}` },
    { icon: Waves, label: HOTEL_INFO.pool },
    { icon: Wifi, label: HOTEL_INFO.wifi },
    { icon: Car, label: HOTEL_INFO.parking }
  ];
  return (
    <Card withBorder radius="lg" padding="md">
      <Stack gap={6}>
        <Text size="sm" fw={600}>
          {HOTEL_INFO.name} — {HOTEL_INFO.tagline}
        </Text>
        {rows.map(({ icon: Icon, label }) => (
          <Group key={label} gap={8} wrap="nowrap">
            <Icon size={14} color="#0d9488" />
            <Text size="xs" c="dimmed">
              {label}
            </Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

const STATUS_COLOR = { paid: "green", unpaid: "yellow", refunded: "gray" };

export function ReservationsWidget({ onPay }) {
  const [reservations, setReservations] = useState(null);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState(null);

  async function load() {
    try {
      const res = await api.listReservations();
      setReservations(res.reservations);
    } catch (err) {
      setError(err.message || "Could not load reservations.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function pay(id) {
    setPayingId(id);
    try {
      await api.payReservation(id);
      await load();
      onPay?.();
    } catch (err) {
      setError(err.message || "Payment simulation failed.");
    } finally {
      setPayingId(null);
    }
  }

  if (reservations === null) {
    return (
      <Card withBorder radius="lg" padding="md">
        <Group justify="center">
          <Loader size="xs" color="teal" />
        </Group>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert color="red" variant="light" radius="lg" data-testid="reservations-widget">
        {error}
      </Alert>
    );
  }

  if (reservations.length === 0) {
    return (
      <Alert color="gray" variant="light" radius="lg" data-testid="reservations-widget">
        No reservations yet — say "book a room" to make one.
      </Alert>
    );
  }

  return (
    <Card withBorder radius="lg" padding="md" data-testid="reservations-widget">
      <Stack gap="xs">
        {reservations.map((r) => (
          <Group key={r.id} justify="space-between" wrap="nowrap" p="xs" style={{ border: "1px solid #eee", borderRadius: 10 }}>
            <Stack gap={0}>
              <Text size="sm" fw={600}>
                {r.room_name}
              </Text>
              <Text size="xs" c="dimmed">
                {r.check_in} → {r.check_out} · ₹{Number(r.total_price).toLocaleString("en-IN")}
              </Text>
            </Stack>
            {r.payment_status === "unpaid" ? (
              <Button size="xs" color="teal" loading={payingId === r.id} onClick={() => pay(r.id)}>
                Pay now
              </Button>
            ) : (
              <Badge color={STATUS_COLOR[r.payment_status]} variant="light">
                {r.payment_status}
              </Badge>
            )}
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

export function HelpWidget({ commands }) {
  return (
    <Card withBorder radius="lg" padding="md">
      <Stack gap={6}>
        <Text size="sm" fw={600}>
          Things I can do
        </Text>
        {commands.map((c) => (
          <Group key={c.cmd} gap={8} wrap="nowrap">
            <Badge variant="light" color="teal" style={{ fontFamily: "monospace" }}>
              {c.cmd}
            </Badge>
            <Text size="xs" c="dimmed">
              {c.desc}
            </Text>
          </Group>
        ))}
        <Text size="xs" c="dimmed" mt={4}>
          Or just ask a question in plain English — check-in times, breakfast, Wi-Fi, cancellation policy, and more.
        </Text>
      </Stack>
    </Card>
  );
}

export function ConfirmationWidget({ reservation }) {
  return (
    <Card withBorder radius="lg" padding="md">
      <Stack align="center" gap={6}>
        <CheckCircle2 size={28} color="#0d9488" />
        <Text size="sm" ta="center">
          {reservation.room_name}, {reservation.check_in} → {reservation.check_out}
        </Text>
        <Badge variant="light" color="teal">
          {reservation.payment_reference}
        </Badge>
        <Text size="xs" c="dimmed" ta="center">
          Demo booking — see it anytime in "My Reservations".
        </Text>
      </Stack>
    </Card>
  );
}

export default function ChatWidget({ message, onAction, disabled }) {
  const widget = message.widget;
  if (!widget) return null;

  if (widget.type === "date_picker") {
    return (
      <DatePickerWidget
        resolved={message.resolved}
        disabled={disabled}
        onSubmit={(payload) => onAction({ type: "check_availability", ...payload })}
      />
    );
  }

  if (widget.type === "room_options") {
    return (
      <RoomOptionsWidget
        {...widget}
        resolved={message.resolved}
        disabled={disabled}
        onSelect={(room) => onAction({ type: "select_room", room, checkIn: widget.checkIn, checkOut: widget.checkOut, nights: widget.nights, adults: widget.adults })}
      />
    );
  }

  if (widget.type === "payment") {
    return (
      <PaymentWidget
        {...widget}
        resolved={message.resolved}
        disabled={disabled}
        onPay={() =>
          onAction({
            type: "payment_complete",
            room: widget.room,
            checkIn: widget.checkIn,
            checkOut: widget.checkOut,
            nights: widget.nights,
            adults: widget.adults
          })
        }
      />
    );
  }

  if (widget.type === "confirmation") {
    return <ConfirmationWidget reservation={widget.reservation} />;
  }

  if (widget.type === "browse_rooms") {
    return <BrowseRoomsWidget disabled={disabled} onCheckDates={() => onAction({ type: "check_dates" })} />;
  }

  if (widget.type === "hotel_info") {
    return <HotelInfoWidget />;
  }

  if (widget.type === "reservations") {
    return <ReservationsWidget onPay={() => onAction({ type: "reservation_paid" })} />;
  }

  if (widget.type === "help") {
    return <HelpWidget commands={widget.commands} />;
  }

  return null;
}
