import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";
import { retrieveSections, isGrounded } from "../src/aiService.js";
import { fakeAuth, createFakeThreads, createFakeReservations, createFakeProfiles } from "./fakes.js";

function buildApp(roles = {}) {
  return createApp({
    auth: fakeAuth,
    threads: createFakeThreads(),
    reservations: createFakeReservations(),
    profiles: createFakeProfiles(roles),
    flaggedQuestions: async () => []
  });
}

const GUEST = { "x-test-user-id": "guest-1" };
const STAFF = { "x-test-user-id": "staff-1" };

test("1. health endpoint works", async () => {
  const res = await request(buildApp()).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test("2. chat requires auth", async () => {
  const res = await request(buildApp())
    .post("/api/chat")
    .send({ message: "What time is check-in?" });
  assert.equal(res.status, 401);
});

test("3. answers check-in question", async () => {
  const res = await request(buildApp())
    .post("/api/chat")
    .set(GUEST)
    .send({ message: "What time is check-in?" });

  assert.equal(res.status, 200);
  assert.match(res.body.answer, /3:00 PM/i);
  assert.equal(res.body.grounded, true);
});

test("4. answers breakfast question", async () => {
  const res = await request(buildApp())
    .post("/api/chat")
    .set(GUEST)
    .send({ message: "Is breakfast included?" });

  assert.equal(res.status, 200);
  assert.match(res.body.answer, /breakfast/i);
});

test("5. unsupported question is flagged as ungrounded", async () => {
  const res = await request(buildApp())
    .post("/api/chat")
    .set(GUEST)
    .send({ message: "Do you have a helicopter landing pad?" });

  assert.equal(res.status, 200);
  assert.equal(res.body.grounded, false);
});

test("6. follow-up question in the same thread preserves context", async () => {
  const app = buildApp();
  const first = await request(app).post("/api/chat").set(GUEST).send({ message: "Tell me about breakfast" });
  const threadId = first.body.threadId;

  const res = await request(app)
    .post("/api/chat")
    .set(GUEST)
    .send({ message: "What about the pool?", threadId });

  assert.equal(res.status, 200);
  assert.match(res.body.answer, /pool/i);
});

test("7. availability returns matching rooms", async () => {
  const res = await request(buildApp())
    .post("/api/availability")
    .set(GUEST)
    .send({ checkIn: "2026-09-25", checkOut: "2026-09-28", adults: 2 });

  assert.equal(res.status, 200);
  assert.ok(res.body.data.rooms.length >= 1);
});

test("8. invalid date range is rejected", async () => {
  const res = await request(buildApp())
    .post("/api/availability")
    .set(GUEST)
    .send({ checkIn: "2026-09-28", checkOut: "2026-09-25", adults: 2 });
  assert.equal(res.status, 400);
});

test("9. missing guest count is rejected", async () => {
  const res = await request(buildApp())
    .post("/api/availability")
    .set(GUEST)
    .send({ checkIn: "2026-09-25", checkOut: "2026-09-28" });
  assert.equal(res.status, 400);
});

test("10. unavailable mock date returns zero rooms", async () => {
  const res = await request(buildApp())
    .post("/api/availability")
    .set(GUEST)
    .send({ checkIn: "2026-09-28", checkOut: "2026-09-30", adults: 2 });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.rooms.length, 0);
});

test("11. chat endpoint rejects an empty message", async () => {
  const res = await request(buildApp())
    .post("/api/chat")
    .set(GUEST)
    .send({ message: "" });
  assert.equal(res.status, 400);
});

test("12. reservation create-then-pay flow", async () => {
  const app = buildApp();
  const create = await request(app)
    .post("/api/reservations")
    .set(GUEST)
    .send({
      roomId: "deluxe",
      roomName: "Deluxe Room",
      checkIn: "2026-09-25",
      checkOut: "2026-09-28",
      nights: 3,
      adults: 2,
      pricePerNight: 8000,
      totalPrice: 24000
    });
  assert.equal(create.status, 201);
  assert.equal(create.body.reservation.payment_status, "unpaid");

  const pay = await request(app)
    .post(`/api/reservations/${create.body.reservation.id}/pay`)
    .set(GUEST)
    .send({});
  assert.equal(pay.status, 200);
  assert.equal(pay.body.reservation.payment_status, "paid");
  assert.ok(pay.body.reservation.payment_reference);
});

test("13. only staff can list all reservations", async () => {
  const app = buildApp({ "staff-1": "staff" });
  await request(app)
    .post("/api/reservations")
    .set(GUEST)
    .send({
      roomId: "deluxe", roomName: "Deluxe Room", checkIn: "2026-09-25", checkOut: "2026-09-28",
      nights: 3, adults: 2, pricePerNight: 8000, totalPrice: 24000
    });

  const asGuest = await request(app).get("/api/reservations?scope=all").set(GUEST);
  assert.equal(asGuest.status, 403);

  const asStaff = await request(app).get("/api/reservations?scope=all").set(STAFF);
  assert.equal(asStaff.status, 200);
  assert.ok(asStaff.body.reservations.length >= 1);
});

test("14. hallucination guard rejects a number absent from retrieved sections", () => {
  const sections = retrieveSections("What time is check-in?");
  assert.equal(isGrounded("Check-in is at 3:00 PM.", sections), true);
  assert.equal(isGrounded("Check-in is at 3:00 PM and a late fee of ₹5,000 applies.", sections), false);
});
