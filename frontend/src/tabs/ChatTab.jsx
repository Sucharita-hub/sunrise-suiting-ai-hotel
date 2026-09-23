import { useEffect, useRef, useState } from "react";
import { ActionIcon, Avatar, Box, Group, Paper, ScrollArea, Stack, Text, TextInput, Title, Badge } from "@mantine/core";
import { Send, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import beginChatArt from "../assets/illustrations/begin-chat.svg";

const GREETING = {
  role: "assistant",
  content:
    "Good evening. I'm the Sunrise Suites concierge — ask me about rooms, check-in/out, breakfast, Wi-Fi, parking, or cancellation policy. For dates and pricing, use the \"Book a Stay\" tab.",
  grounded: true
};

export default function ChatTab() {
  const [messages, setMessages] = useState([GREETING]);
  const [threadId, setThreadId] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const result = await api.sendMessage(text, threadId);
      setThreadId(result.threadId);
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer, grounded: result.grounded }]);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Stack h="calc(100vh - 3rem)" gap="md">
      <Title order={3}>Chat</Title>

      <Paper withBorder radius="lg" p={0} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ScrollArea style={{ flex: 1 }} p="lg">
          {messages.length === 1 && (
            <Stack align="center" mt="xl" c="dimmed">
              <img src={beginChatArt} alt="" style={{ width: 180 }} />
              <Text size="sm">Start a conversation below.</Text>
            </Stack>
          )}

          <Stack gap="md">
            {messages.map((message, index) => (
              <Group key={index} align="flex-start" justify={message.role === "user" ? "flex-end" : "flex-start"}>
                {message.role === "assistant" && (
                  <Avatar size={28} radius="xl" color="ink.6">
                    <Sparkles size={14} />
                  </Avatar>
                )}
                <Box maw="70%">
                  <Paper
                    p="sm"
                    radius="lg"
                    style={{
                      background: message.role === "user" ? "#1b1730" : "white",
                      color: message.role === "user" ? "white" : "black",
                      border: message.role === "assistant" ? "1px solid #eee" : "none"
                    }}
                  >
                    <Text size="sm">{message.content}</Text>
                  </Paper>
                  {message.role === "assistant" && message.grounded === false && (
                    <Badge mt={4} size="xs" color="gray" variant="light">
                      not in knowledge base
                    </Badge>
                  )}
                </Box>
              </Group>
            ))}
            {error && (
              <Text size="sm" c="red">
                {error}
              </Text>
            )}
            <div ref={bottomRef} />
          </Stack>
        </ScrollArea>

        <form onSubmit={send}>
          <Group p="md" style={{ borderTop: "1px solid #eee" }}>
            <TextInput
              style={{ flex: 1 }}
              placeholder="Ask about rooms, breakfast, check-in..."
              value={input}
              disabled={sending}
              onChange={(e) => setInput(e.currentTarget.value)}
            />
            <ActionIcon
              type="submit"
              size="lg"
              radius="xl"
              color="gold"
              disabled={!input.trim() || sending}
              aria-label="Send message"
            >
              <Send size={16} />
            </ActionIcon>
          </Group>
        </form>
      </Paper>
    </Stack>
  );
}
