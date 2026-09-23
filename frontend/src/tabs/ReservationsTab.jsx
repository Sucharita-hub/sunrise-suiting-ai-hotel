import { useEffect, useState } from "react";
import { Badge, Button, Paper, Stack, Table, Text, Title } from "@mantine/core";
import { api } from "../lib/api";
import noDataArt from "../assets/illustrations/no-data.svg";

const STATUS_COLOR = { paid: "green", unpaid: "yellow", refunded: "gray" };

export default function ReservationsTab() {
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
    } catch (err) {
      setError(err.message || "Payment simulation failed.");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <Stack gap="lg">
      <Title order={3}>My Reservations</Title>

      {error && <Text c="red">{error}</Text>}

      {reservations && reservations.length === 0 && (
        <Stack align="center" c="dimmed" mt="xl">
          <img src={noDataArt} alt="" style={{ width: 200 }} />
          <Text>No reservations yet — book a stay to see it here.</Text>
        </Stack>
      )}

      {reservations && reservations.length > 0 && (
        <Paper withBorder radius="lg" p="md">
          <Table.ScrollContainer minWidth={520}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Room</Table.Th>
                <Table.Th>Dates</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Payment</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reservations.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{r.room_name}</Table.Td>
                  <Table.Td>
                    {r.check_in} → {r.check_out}
                  </Table.Td>
                  <Table.Td>₹{Number(r.total_price).toLocaleString("en-IN")}</Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLOR[r.payment_status]} variant="light">
                      {r.payment_status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {r.payment_status === "unpaid" && (
                      <Button size="xs" color="gold" loading={payingId === r.id} onClick={() => pay(r.id)}>
                        Pay now
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          </Table.ScrollContainer>
        </Paper>
      )}
    </Stack>
  );
}
