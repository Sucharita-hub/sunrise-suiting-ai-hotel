import "dotenv/config";
import express from "express";
import cors from "cors";
import { answerQuestion } from "./aiService.js";
import { checkAvailability } from "./availabilityService.js";
import { cleanHistory } from "./utils.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || true
}));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "sunrise-suites-backend" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Message is required."
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        ok: false,
        error: "Message is too long."
      });
    }

    const result = await answerQuestion({
      message: message.trim(),
      history: cleanHistory(history)
    });

    return res.json({
      ok: true,
      answer: result.answer,
      widget: result.widget || "none",
      source: result.source
    });
  } catch (error) {
    console.error("CHAT_ERROR", error);
    return res.status(500).json({
      ok: false,
      error: "The assistant is temporarily unavailable. Please try again."
    });
  }
});

app.post("/api/availability", (req, res) => {
  try {
    const result = checkAvailability(req.body || {});

    if (!result.ok) {
      return res.status(result.status).json({
        ok: false,
        error: result.error
      });
    }

    return res.json(result);
  } catch (error) {
    console.error("AVAILABILITY_ERROR", error);
    return res.status(500).json({
      ok: false,
      error: "Availability service is temporarily unavailable."
    });
  }
});

app.use((err, _req, res, _next) => {
  console.error("UNHANDLED_ERROR", err);
  res.status(500).json({
    ok: false,
    error: "Unexpected server error."
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Sunrise Suites backend running on http://localhost:${PORT}`);
  });
}

export default app;
