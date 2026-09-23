import { useEffect, useState } from "react";
import { Badge, Paper, Stack, Table, Tabs, Text, Title } from "@mantine/core";
import { api } from "../lib/api";

const STATUS_COLOR = { paid: "green", unpaid: "yellow", refunded: "gray" };

export default function AdminTab() {
  const [reservations, setReservations] = useState(null);
  const [flagged, setFlagged] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listReservations("all")
      .then((res) => setReservations(res.reservations))
      .catch((err) => setError(err.message));
    api
      .listFlaggedQuestions()
      .then((res) => setFlagged(res.questions))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Stack gap="lg">
      <Title order={3}>Admin</Title>
      {error && <Text c="red">{error}</Text>}

      <Tabs defaultValue="reservations">
        <Tabs.List>
          <Tabs.Tab value="reservations">All reservations</Tabs.Tab>
          <Tabs.Tab value="flagged">Unanswered questions</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="reservations" pt="md">
          <Paper withBorder radius="lg" p="md">
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Guest</Table.Th>
                  <Table.Th>Room</Table.Th>
                  <Table.Th>Dates</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th>Payment</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(reservations ?? []).map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td>{r.user_id.slice(0, 8)}…</Table.Td>
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
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {reservations && reservations.length === 0 && (
              <Text c="dimmed" ta="center" py="md">
                No reservations yet across any guest.
              </Text>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="flagged" pt="md">
          <Paper withBorder radius="lg" p="md">
            <Stack gap="sm">
              {(flagged ?? []).map((q) => (
                <Paper key={q.id} withBorder radius="md" p="sm" bg="gray.0">
                  <Text size="sm">{q.content}</Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    {new Date(q.created_at).toLocaleString()}
                  </Text>
                </Paper>
              ))}
              {flagged && flagged.length === 0 && (
                <Text c="dimmed" ta="center" py="md">
                  No knowledge-base gaps recorded — every question so far has been answered from the hotel data.
                </Text>
              )}
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
