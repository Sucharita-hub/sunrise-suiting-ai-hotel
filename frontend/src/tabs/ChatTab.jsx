import { useCallback, useEffect, useRef, useState } from "react";
import { ActionIcon, Avatar, Box, Button, Drawer, Group, Loader, Paper, ScrollArea, Stack, Text, TextInput, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { MessageSquareText, Plus, Send, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import ChatWidget from "../components/ChatWidgets";
import beginChatArt from "../assets/illustrations/begin-chat.svg";

const SUGGESTIONS = ["What time is check-in?", "Is breakfast included?", "Do you have a pool?", "I'd like to book a room"];

// Slash commands short-circuit the assistant entirely and drop a widget
// straight into the conversation — for when a guest knows exactly what they
// want and doesn't need a round trip through the LLM/retrieval pipeline.
const SLASH_COMMANDS = [
  { cmd: "/book", desc: "Check availability and reserve a room inline", widget: { type: "date_picker" } },
  { cmd: "/rooms", desc: "Browse room types and per-night pricing", widget: { type: "browse_rooms" } },
  { cmd: "/reservations", desc: "View your bookings and pay if unpaid", widget: { type: "reservations" } },
  { cmd: "/info", desc: "Address, phone, check-in/out, amenities", widget: { type: "hotel_info" } },
  { cmd: "/help", desc: "List everything this assistant can do", widget: { type: "help", commands: [] } }
];
SLASH_COMMANDS.find((c) => c.cmd === "/help").widget.commands = SLASH_COMMANDS;

export default function ChatTab() {
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [widgetBusyIndex, setWidgetBusyIndex] = useState(null);
  const [threadsOpened, { open: openThreadsDrawer, close: closeThreadsDrawer }] = useDisclosure(false);
  const bottomRef = useRef(null);

  const loadThreads = useCallback(async () => {
    try {
      const result = await api.listThreads();
      setThreads(result.threads ?? []);
    } catch {
      // sidebar list is a convenience; leave it empty on failure
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function startNewChat() {
    setThreadId(null);
    setMessages([]);
    setError("");
    closeThreadsDrawer();
  }

  async function openThread(id) {
    closeThreadsDrawer();
    if (id === threadId) return;
    setThreadId(id);
    setError("");
    setHistoryLoading(true);
    try {
      const result = await api.getThreadMessages(id);
      setMessages(
        (result.messages ?? []).map((m) => ({
          role: m.role,
          content: m.content,
          grounded: m.assistant_envelope?.grounded
        }))
      );
    } catch (err) {
      setError(err.message || "Could not load that conversation.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function sendText(text) {
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const isNewThread = !threadId;
      const result = await api.sendMessage(text, threadId);
      setThreadId(result.threadId);
      const widget = result.intent === "booking" ? { type: "date_picker" } : null;
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer, grounded: result.grounded, widget }]);
      if (isNewThread) loadThreads();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function resolveWidget(index) {
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, resolved: true } : m)));
  }

  function pushAssistant(content, widget = null) {
    setMessages((prev) => [...prev, { role: "assistant", content, widget }]);
  }

  function runSlashCommand(command) {
    setMessages((prev) => [...prev, { role: "user", content: command.cmd }]);
    pushAssistant(command.desc, command.widget);
    setInput("");
  }

  async function handleWidgetAction(index, action) {
    if (widgetBusyIndex !== null) return;

    if (action.type === "check_dates") {
      resolveWidget(index);
      pushAssistant("Sure — pick your dates and guest count below.", { type: "date_picker" });
      return;
    }

    if (action.type === "reservation_paid") {
      return;
    }

    if (action.type === "check_availability") {
      const { checkIn, checkOut, adults } = action;
      setMessages((prev) => [...prev, { role: "user", content: `${checkIn} → ${checkOut} · ${adults} guest${adults > 1 ? "s" : ""}` }]);
      setWidgetBusyIndex(index);
      setError("");
      try {
        const result = await api.checkAvailability({ checkIn, checkOut, adults, threadId });
        resolveWidget(index);
        pushAssistant(
          result.data.rooms.length ? "Here are the rooms available for those dates:" : "Sorry, nothing is available for those dates.",
          { type: "room_options", rooms: result.data.rooms, checkIn, checkOut, nights: result.data.nights, adults }
        );
      } catch (err) {
        setError(err.message || "Could not check availability.");
      } finally {
        setWidgetBusyIndex(null);
      }
      return;
    }

    if (action.type === "select_room") {
      const { room, checkIn, checkOut, nights, adults } = action;
      resolveWidget(index);
      setMessages((prev) => [...prev, { role: "user", content: `Selected: ${room.name}` }]);
      pushAssistant("Great choice! Review your booking and pay below to confirm.", { type: "payment", room, checkIn, checkOut, nights, adults });
      return;
    }

    if (action.type === "payment_complete") {
      const { room, checkIn, checkOut, nights, adults } = action;
      setWidgetBusyIndex(index);
      setError("");
      try {
        const created = await api.createReservation({
          roomId: room.id,
          roomName: room.name,
          checkIn,
          checkOut,
          nights,
          adults,
          pricePerNight: room.price,
          totalPrice: room.totalPrice,
          threadId
        });
        const paid = await api.payReservation(created.reservation.id);
        resolveWidget(index);
        pushAssistant(`Booking confirmed! This is a demo, so no real charge was made.`, { type: "confirmation", reservation: paid.reservation });
      } catch (err) {
        setError(err.message || "Could not complete the reservation.");
        throw err;
      } finally {
        setWidgetBusyIndex(null);
      }
    }
  }

  const isEmpty = !historyLoading && messages.length === 0;
  const slashMatches = input.startsWith("/") ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith(input.trim())) : [];

  const threadListBody = (
    <>
      <Button leftSection={<Plus size={16} />} variant="light" color="gold" fullWidth onClick={startNewChat} data-testid="new-chat">
        New chat
      </Button>
      <ScrollArea mt="sm" style={{ flex: 1 }}>
        <Stack gap={4}>
          {threadsLoading && (
            <Text size="xs" c="dimmed" ta="center" mt="md">
              Loading…
            </Text>
          )}
          {!threadsLoading && threads.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" mt="md">
              No conversations yet.
            </Text>
          )}
          {threads.map((t) => (
            <UnstyledButton
              key={t.id}
              data-testid="thread-item"
              onClick={() => openThread(t.id)}
              p="xs"
              style={{
                borderRadius: 8,
                background: t.id === threadId ? "#ccfbf1" : "transparent",
                fontWeight: t.id === threadId ? 600 : 400
              }}
            >
              <Text size="sm" truncate>
                {t.title || "New conversation"}
              </Text>
            </UnstyledButton>
          ))}
        </Stack>
      </ScrollArea>
    </>
  );

  return (
    <Group align="stretch" gap="md" className="chat-shell" wrap="nowrap">
      <Paper withBorder radius="lg" w={220} p="sm" visibleFrom="sm" style={{ display: "flex", flexDirection: "column" }}>
        {threadListBody}
      </Paper>

      <Drawer opened={threadsOpened} onClose={closeThreadsDrawer} title="Conversations" hiddenFrom="sm" size="80%">
        <Stack h="calc(100vh - 80px)" style={{ display: "flex", flexDirection: "column" }}>
          {threadListBody}
        </Stack>
      </Drawer>

      <Stack style={{ flex: 1, minWidth: 0 }} gap="md">
        <Group justify="space-between">
          <Title order={3}>Chat</Title>
          <Button
            hiddenFrom="sm"
            size="xs"
            variant="light"
            color="gold"
            leftSection={<MessageSquareText size={14} />}
            onClick={openThreadsDrawer}
            data-testid="open-threads"
          >
            Chats
          </Button>
        </Group>

        <Paper withBorder radius="lg" p={0} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <ScrollArea style={{ flex: 1 }} p="lg">
            {historyLoading && (
              <Group justify="center" mt="xl">
                <Loader color="gold" size="sm" />
              </Group>
            )}

            {isEmpty && (
              <Stack align="center" mt="lg" gap="xs">
                <img src={beginChatArt} alt="" style={{ width: 140 }} />
                <Title order={4} ta="center" mt="xs">
                  Good evening.
                </Title>
                <Text size="sm" c="dimmed" ta="center" maw={380}>
                  I'm the Sunrise Suites concierge — ask about rooms, check-in/out, breakfast, Wi-Fi, parking, the
                  cancellation policy, or say "book a room" to check dates and pay right here.
                </Text>
                <Group justify="center" gap="xs" mt="sm" maw={440} style={{ flexWrap: "wrap" }}>
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} size="xs" variant="outline" color="ink.6" radius="xl" onClick={() => sendText(s)}>
                      {s}
                    </Button>
                  ))}
                </Group>
                <Button
                  size="xs"
                  color="teal"
                  radius="xl"
                  mt={4}
                  onClick={() => {
                    setMessages([{ role: "assistant", content: "Sure — pick your dates and I'll check availability.", widget: { type: "date_picker" } }]);
                  }}
                >
                  Book a room
                </Button>
                <Text size="xs" c="dimmed" mt={2}>
                  Tip: type <Text span style={{ fontFamily: "monospace" }}>/</Text> to see quick commands like{" "}
                  <Text span style={{ fontFamily: "monospace" }}>/rooms</Text> or <Text span style={{ fontFamily: "monospace" }}>/reservations</Text>.
                </Text>
              </Stack>
            )}

            {!historyLoading && !isEmpty && (
              <Stack gap="md">
                {messages.map((message, index) => (
                  <Group key={index} align="flex-start" justify={message.role === "user" ? "flex-end" : "flex-start"} wrap="nowrap">
                    {message.role === "assistant" && (
                      <Avatar size={28} radius="xl" color="ink.6">
                        <Sparkles size={14} />
                      </Avatar>
                    )}
                    <Box maw={message.widget ? "min(480px, 94%)" : "72%"} style={{ minWidth: 0 }}>
                      <Paper
                        p="sm"
                        radius="lg"
                        style={{
                          background: message.role === "user" ? "#0f172a" : "white",
                          color: message.role === "user" ? "white" : "#0f172a",
                          border: message.role === "assistant" ? "1px solid #eee" : "none",
                          borderBottomRightRadius: message.role === "user" ? 4 : undefined,
                          borderBottomLeftRadius: message.role === "assistant" ? 4 : undefined,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                        }}
                      >
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                          {message.content}
                        </Text>
                      </Paper>
                      {message.widget && (
                        <Box mt="xs">
                          <ChatWidget
                            message={message}
                            disabled={widgetBusyIndex === index}
                            onAction={(action) => handleWidgetAction(index, action)}
                          />
                        </Box>
                      )}
                    </Box>
                  </Group>
                ))}
                {sending && (
                  <Group align="flex-start" justify="flex-start" wrap="nowrap">
                    <Avatar size={28} radius="xl" color="ink.6">
                      <Sparkles size={14} />
                    </Avatar>
                    <Paper p="sm" radius="lg" style={{ border: "1px solid #eee", borderBottomLeftRadius: 4 }}>
                      <Group gap={4}>
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </Group>
                    </Paper>
                  </Group>
                )}
                {error && (
                  <Text size="sm" c="red">
                    {error}
                  </Text>
                )}
                <div ref={bottomRef} />
              </Stack>
            )}
          </ScrollArea>

          <Box style={{ position: "relative" }}>
            {slashMatches.length > 0 && (
              <Paper withBorder radius="md" shadow="md" p={4} style={{ position: "absolute", bottom: "100%", left: 16, right: 16, marginBottom: 8, zIndex: 10 }}>
                <Stack gap={2}>
                  {slashMatches.map((c) => (
                    <UnstyledButton
                      key={c.cmd}
                      p="xs"
                      style={{ borderRadius: 6 }}
                      onClick={() => runSlashCommand(c)}
                    >
                      <Group gap={8} wrap="nowrap">
                        <Text size="sm" fw={600} style={{ fontFamily: "monospace" }} c="teal.7">
                          {c.cmd}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {c.desc}
                        </Text>
                      </Group>
                    </UnstyledButton>
                  ))}
                </Stack>
              </Paper>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = input.trim();
                const exact = SLASH_COMMANDS.find((c) => c.cmd === trimmed);
                if (exact) {
                  runSlashCommand(exact);
                } else {
                  sendText(trimmed);
                }
              }}
            >
              <Group p="md" style={{ borderTop: "1px solid #eee" }}>
                <TextInput
                  style={{ flex: 1 }}
                  placeholder="Ask a question, or type / to see commands..."
                  value={input}
                  disabled={sending}
                  onChange={(e) => setInput(e.currentTarget.value)}
                />
                <ActionIcon type="submit" size="lg" radius="xl" color="gold" disabled={!input.trim() || sending} aria-label="Send message">
                  <Send size={16} />
                </ActionIcon>
              </Group>
            </form>
          </Box>
        </Paper>
      </Stack>
    </Group>
  );
}
