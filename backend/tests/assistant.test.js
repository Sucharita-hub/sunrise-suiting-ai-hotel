import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/server.js";

test("1. health endpoint works", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test("2. answers check-in question", async () => {
  const res = await request(app)
    .post("/api/chat")
    .send({ message: "What time is check-in?", history: [] });

  assert.equal(res.status, 200);
  assert.match(res.body.answer, /3:00 PM/i);
});

test("3. answers breakfast question", async () => {
  const res = await request(app)
    .post("/api/chat")
    .send({ message: "Is breakfast included?", history: [] });

  assert.equal(res.status, 200);
  assert.match(res.body.answer, /breakfast/i);
});

test("4. unsupported question gets a safe fallback", async () => {
  const res = await request(app)
    .post("/api/chat")
    .send({ message: "Do you have a helicopter landing pad?", history: [] });

  assert.equal(res.status, 200);
  assert.match(res.body.answer, /can help|Sunrise Suites/i);
});

test("5. follow-up question preserves conversation context", async () => {
  const res = await request(app)
    .post("/api/chat")
    .send({
      message: "And what about the pool?",
      history: [
        { role: "user", content: "Does the hotel have breakfast?" },
        { role: "assistant", content: "Yes, breakfast is available." }
      ]
    });

  assert.equal(res.status, 200);
  assert.match(res.body.answer, /pool/i);
});

test("6. availability returns matching rooms", async () => {
  const res = await request(app)
    .post("/api/availability")
    .send({
      checkIn: "2026-09-25",
      checkOut: "2026-09-28",
      adults: 2
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.data.rooms.length >= 1);
});

test("7. invalid date range is rejected", async () => {
  const res = await request(app)
    .post("/api/availability")
    .send({
      checkIn: "2026-09-28",
      checkOut: "2026-09-25",
      adults: 2
    });

  assert.equal(res.status, 400);
});

test("8. missing guest count is rejected", async () => {
  const res = await request(app)
    .post("/api/availability")
    .send({
      checkIn: "2026-09-25",
      checkOut: "2026-09-28"
    });

  assert.equal(res.status, 400);
});

test("9. unavailable mock date returns zero rooms", async () => {
  const res = await request(app)
    .post("/api/availability")
    .send({
      checkIn: "2026-09-28",
      checkOut: "2026-09-30",
      adults: 2
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.rooms.length, 0);
});

test("10. chat endpoint rejects an empty message", async () => {
  const res = await request(app)
    .post("/api/chat")
    .send({ message: "", history: [] });

  assert.equal(res.status, 400);
});
