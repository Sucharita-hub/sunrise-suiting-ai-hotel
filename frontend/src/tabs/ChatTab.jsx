import { useCallback, useEffect, useRef, useState } from "react";
import { ActionIcon, Avatar, Box, Button, Group, Loader, Paper, ScrollArea, Stack, Text, TextInput, Title, UnstyledButton } from "@mantine/core";
import { Plus, Send, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import beginChatArt from "../assets/illustrations/begin-chat.svg";

const SUGGESTIONS = ["What time is check-in?", "Is breakfast included?", "Do you have a pool?", "What's the cancellation policy?"];

export default function ChatTab() {
  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
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
  }

  async function openThread(id) {
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
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer, grounded: result.grounded }]);
      if (isNewThread) loadThreads();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  const isEmpty = !historyLoading && messages.length === 0;

  return (
    <Group align="stretch" gap="md" h="calc(100vh - 3rem)" wrap="nowrap">
      <Paper withBorder radius="lg" w={220} p="sm" style={{ display: "flex", flexDirection: "column" }}>
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
      </Paper>

      <Stack style={{ flex: 1, minWidth: 0 }} gap="md">
        <Title order={3}>Chat</Title>

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
                  I'm the Sunrise Suites concierge — ask about rooms, check-in/out, breakfast, Wi-Fi, parking, or the
                  cancellation policy. For dates and pricing, use "Book a Stay".
                </Text>
                <Group justify="center" gap="xs" mt="sm" maw={440} style={{ flexWrap: "wrap" }}>
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} size="xs" variant="outline" color="ink.6" radius="xl" onClick={() => sendText(s)}>
                      {s}
                    </Button>
                  ))}
                </Group>
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
                    <Box maw="72%">
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

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendText(input.trim());
            }}
          >
            <Group p="md" style={{ borderTop: "1px solid #eee" }}>
              <TextInput
                style={{ flex: 1 }}
                placeholder="Ask about rooms, breakfast, check-in..."
                value={input}
                disabled={sending}
                onChange={(e) => setInput(e.currentTarget.value)}
              />
              <ActionIcon type="submit" size="lg" radius="xl" color="gold" disabled={!input.trim() || sending} aria-label="Send message">
                <Send size={16} />
              </ActionIcon>
            </Group>
          </form>
        </Paper>
      </Stack>
    </Group>
  );
}
