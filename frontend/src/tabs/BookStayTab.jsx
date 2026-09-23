import { useState } from "react";
import { Badge, Button, Card, Group, Image, NumberInput, Paper, SimpleGrid, Stack, Text, Title, Alert, Modal } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { CreditCard, Lock, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import bookingArt from "../assets/illustrations/booking.svg";

function isoDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function BookStayTab() {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [adults, setAdults] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [paying, setPaying] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  async function search(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (!checkIn || !checkOut) {
      setError("Pick both check-in and check-out dates.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.checkAvailability({ checkIn: isoDate(checkIn), checkOut: isoDate(checkOut), adults });
      setResult(res.data);
    } catch (err) {
      setError(err.message || "Could not check availability.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmAndPay() {
    if (!selectedRoom || !result) return;
    setPaying(true);
    try {
      const created = await api.createReservation({
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        checkIn: result.checkIn,
        checkOut: result.checkOut,
        nights: result.nights,
        adults: result.adults,
        pricePerNight: selectedRoom.price,
        totalPrice: selectedRoom.totalPrice
      });
      const paid = await api.payReservation(created.reservation.id);
      setConfirmed(paid.reservation);
      setSelectedRoom(null);
    } catch (err) {
      setError(err.message || "Could not complete the reservation.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <Stack gap="lg">
      <Title order={3}>Book a Stay</Title>

      <Paper withBorder radius="lg" p="lg">
        <form onSubmit={search}>
          <Group align="flex-end" wrap="wrap">
            <DateInput label="Check-in" valueFormat="YYYY-MM-DD" value={checkIn} onChange={setCheckIn} minDate={new Date()} required />
            <DateInput label="Check-out" valueFormat="YYYY-MM-DD" value={checkOut} onChange={setCheckOut} minDate={checkIn ?? new Date()} required />
            <NumberInput label="Guests" value={adults} onChange={setAdults} min={1} max={8} w={100} />
            <Button type="submit" loading={loading} color="gold">
              Check availability
            </Button>
          </Group>
        </form>
        {error && (
          <Alert color="red" variant="light" mt="md">
            {error}
          </Alert>
        )}
      </Paper>

      {!result && !loading && (
        <Stack align="center" c="dimmed" mt="xl">
          <img src={bookingArt} alt="" style={{ width: 220 }} />
          <Text>Pick your dates above to see available rooms and pricing.</Text>
        </Stack>
      )}

      {result && (
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {result.checkIn} to {result.checkOut} · {result.nights} night{result.nights > 1 ? "s" : ""} · {result.adults}{" "}
            guest{result.adults > 1 ? "s" : ""}
          </Text>

          {result.rooms.length === 0 ? (
            <Alert color="gray" variant="light">
              No rooms available for those dates. Try a different range.
            </Alert>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {result.rooms.map((room) => (
                <Card key={room.id} withBorder radius="lg" padding="md">
                  <Card.Section>
                    <Image src={room.image} h={140} alt={room.name} />
                  </Card.Section>
                  <Stack gap={4} mt="sm">
                    <Text fw={600}>{room.name}</Text>
                    <Text size="xs" c="dimmed">
                      {room.beds} · {room.size}
                    </Text>
                    <Group justify="space-between" mt="xs">
                      <Text fw={700} c="ink.7">
                        ₹{room.totalPrice.toLocaleString("en-IN")}
                        <Text span size="xs" c="dimmed">
                          {" "}
                          total
                        </Text>
                      </Text>
                      <Button size="xs" color="gold" onClick={() => setSelectedRoom(room)}>
                        Reserve
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      )}

      <Modal opened={Boolean(selectedRoom)} onClose={() => setSelectedRoom(null)} title="Confirm & pay" centered>
        {selectedRoom && result && (
          <Stack>
            <Group justify="space-between">
              <Text c="dimmed">Room</Text>
              <Text fw={600}>{selectedRoom.name}</Text>
            </Group>
            <Group justify="space-between">
              <Text c="dimmed">Dates</Text>
              <Text>
                {result.checkIn} → {result.checkOut}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text c="dimmed">Total</Text>
              <Text fw={700}>₹{selectedRoom.totalPrice.toLocaleString("en-IN")}</Text>
            </Group>
            <Button leftSection={<CreditCard size={16} />} loading={paying} onClick={confirmAndPay} color="gold">
              Pay ₹{selectedRoom.totalPrice.toLocaleString("en-IN")} now
            </Button>
            <Group gap={4} justify="center">
              <Lock size={11} />
              <Text size="xs" c="dimmed">
                Demo payment — no card details required, nothing is charged.
              </Text>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={Boolean(confirmed)} onClose={() => setConfirmed(null)} title="Reservation confirmed" centered>
        {confirmed && (
          <Stack align="center">
            <CheckCircle2 size={40} color="#dda02c" />
            <Text ta="center">
              {confirmed.room_name}, {confirmed.check_in} → {confirmed.check_out}. Payment reference{" "}
              <Badge variant="light">{confirmed.payment_reference}</Badge>
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              This is a demo — no real charge was made. See it anytime in "My Reservations".
            </Text>
            <Button variant="light" onClick={() => setConfirmed(null)}>
              Done
            </Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
