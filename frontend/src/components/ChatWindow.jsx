import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, LoaderCircle, Paperclip, RotateCcw } from "lucide-react";
import { askAssistant, checkAvailability } from "../api";
import ChatMessage from "./ChatMessage";
import QuickQuestions from "./QuickQuestions";

function timeNow() {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

const initialMessages = [
  {
    role: "assistant",
    content: "Hello! I'm your Sunrise Suites concierge. Ask me anything about our rooms, amenities, policies, or say \"I'd like to book a room\" to get started.",
    time: timeNow()
  }
];

export default function ChatWindow() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [widgetBusy, setWidgetBusy] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  function appendAssistant(content, widget = null) {
    setMessages(prev => [...prev, { role: "assistant", content, widget, time: timeNow() }]);
  }

  function appendUser(content) {
    setMessages(prev => [...prev, { role: "user", content, time: timeNow() }]);
  }

  async function sendMessage(text = input) {
    const message = text.trim();
    if (!message || loading) return;

    const history = messages.map(({ role, content }) => ({ role, content }));

    appendUser(message);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const result = await askAssistant(message, history);
      appendAssistant(result.answer, result.widget && result.widget !== "none" ? { type: result.widget } : null);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Every booking step (dates -> rooms -> payment) is driven by widgets
  // embedded directly in the chat, not by separate page sections. Real
  // availability/pricing always comes from the backend, never invented.
  async function handleWidgetAction(action) {
    if (widgetBusy) return;

    if (action.type === "check_availability") {
      const { checkIn, checkOut, adults } = action;
      appendUser(`📅 ${checkIn} → ${checkOut} · ${adults} guest${adults > 1 ? "s" : ""}`);
      setWidgetBusy(true);
      setError("");
      try {
        const result = await checkAvailability({ checkIn, checkOut, adults });
        const { rooms, nights } = result.data;
        appendAssistant(
          rooms.length ? "Here are the rooms available for those dates:" : "Sorry, nothing is available for those dates.",
          { type: "room_options", rooms, checkIn, checkOut, nights, adults }
        );
      } catch (err) {
        setError(err.message || "Could not check availability.");
      } finally {
        setWidgetBusy(false);
      }
      return;
    }

    if (action.type === "select_room") {
      const { room, checkIn, checkOut, nights } = action;
      appendUser(`Selected: ${room.name}`);
      appendAssistant(
        `Great choice! Review your booking and pay below to confirm.`,
        { type: "payment", room, checkIn, checkOut, nights }
      );
      return;
    }

    if (action.type === "payment_complete") {
      const { room, checkIn, checkOut, nights } = action;
      appendUser(`💳 Paid ₹${room.totalPrice.toLocaleString("en-IN")}`);
      appendAssistant(
        `🎉 Booking confirmed! ${room.name}, ${checkIn} → ${checkOut} (${nights} night${nights > 1 ? "s" : ""}). A confirmation would be emailed to you — this is a demo, so no real charge was made.`
      );
      return;
    }
  }

  function reset() {
    setMessages(initialMessages);
    setInput("");
    setError("");
  }

  return (
    <section className="chat-section" id="assistant">
      <div className="chat-hero">
        <div className="hero-overlay">
          <span className="hero-pill"><Bot size={14} /> AI Concierge</span>
          <h1>Relax. Your stay starts here.</h1>
          <p>Get instant answers about Sunrise Suites, or let us help you find and book the right room.</p>
        </div>
      </div>

      <div className="chat-shell">
        <div className="chat-header">
          <div className="chat-agent">
            <div className="avatar bot-avatar"><Bot size={18} /></div>
            <div>
              <strong>Sunrise Concierge</strong>
              <span><i /> Online</span>
            </div>
          </div>
          <button className="reset-button" onClick={reset} title="New conversation">
            <RotateCcw size={16} /> New chat
          </button>
        </div>

        <div className="messages">
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              onWidgetAction={handleWidgetAction}
              widgetDisabled={widgetBusy}
            />
          ))}

          {loading && (
            <div className="message-row assistant-row">
              <div className="avatar bot-avatar"><Bot size={17} /></div>
              <div className="typing-bubble">
                <LoaderCircle size={16} className="spin" />
                <span>Checking that for you...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="chat-error">
              <div>
                <strong>Something went wrong</strong>
                <span>{error}</span>
              </div>
              <button onClick={() => sendMessage(messages[messages.length - 1]?.content || "")}>
                Try again
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && <QuickQuestions onSelect={sendMessage} />}

        <form className="message-composer" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
          <button type="button" className="composer-icon" title="Attachment is not required for this demo">
            <Paperclip size={18} />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about rooms, breakfast, check-in, or say 'book a room'..."
            disabled={loading}
          />
          <button className="send-button" disabled={!input.trim() || loading} aria-label="Send message">
            {loading ? <LoaderCircle size={18} className="spin" /> : <ArrowUp size={19} />}
          </button>
        </form>
      </div>
    </section>
  );
}
