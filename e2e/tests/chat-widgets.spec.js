import { test, expect } from "@playwright/test";
import path from "node:path";

const GUEST = { email: "qa.guest@sunrisesuites.test", password: "QaGuestPass123!" };
const SHOTS = path.resolve(import.meta.dirname, "../design-review");

function futureIsoDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  if (d.getDate() % 7 === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

test("inline chat widgets: booking intent, availability, room select, payment", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill(GUEST.email);
  await page.getByLabel("Password").fill(GUEST.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByTestId("nav-chat").waitFor({ timeout: 15_000 });

  await page.getByRole("button", { name: "New chat" }).click();

  await page.getByPlaceholder("Ask a question, or type / to see commands...").fill("I'd like to book a room");
  await page.getByLabel("Send message").click();

  await page.getByRole("button", { name: "Check availability" }).waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/widget-01-date-picker.png`, fullPage: true });

  const checkIn = futureIsoDate(5);
  const checkOut = futureIsoDate(8);
  await page.getByLabel("Check-in").fill(checkIn);
  await page.keyboard.press("Escape");
  await page.getByLabel("Check-out").fill(checkOut);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Check availability" }).click();

  await page.getByRole("button", { name: "Select" }).first().waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/widget-02-room-options.png`, fullPage: true });

  await page.getByRole("button", { name: "Select" }).first().click();
  await page.getByRole("button", { name: /Pay ₹.*now/ }).waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/widget-03-payment.png`, fullPage: true });

  await page.getByRole("button", { name: /Pay ₹.*now/ }).click();
  await page.getByText("Booking confirmed").waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/widget-04-confirmation.png`, fullPage: true });

  await expect(page.getByText("Payment complete")).toBeVisible();
});

test("slash commands: /rooms, /info, /reservations, /help", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill(GUEST.email);
  await page.getByLabel("Password").fill(GUEST.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByTestId("nav-chat").waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "New chat" }).click();

  const input = page.getByPlaceholder("Ask a question, or type / to see commands...");

  await input.fill("/");
  await page.getByText("Browse room types").waitFor({ timeout: 5_000 });
  await page.screenshot({ path: `${SHOTS}/widget-05-slash-menu.png`, fullPage: true });

  await input.fill("/rooms");
  await input.press("Enter");
  await page.getByText("Deluxe Room").waitFor({ timeout: 10_000 });
  await page.getByText("Check dates for these rooms").waitFor();
  await page.screenshot({ path: `${SHOTS}/widget-06-browse-rooms.png`, fullPage: true });

  await input.fill("/info");
  await input.press("Enter");
  await page.getByText("12 Lakeview Road").waitFor({ timeout: 10_000 });
  await page.screenshot({ path: `${SHOTS}/widget-07-hotel-info.png`, fullPage: true });

  await input.fill("/reservations");
  await input.press("Enter");
  await page.getByTestId("reservations-widget").waitFor({ timeout: 10_000 });
  await page.screenshot({ path: `${SHOTS}/widget-08-reservations.png`, fullPage: true });

  await input.fill("/help");
  await input.press("Enter");
  await page.getByText("Things I can do").waitFor({ timeout: 10_000 });
  await page.screenshot({ path: `${SHOTS}/widget-09-help.png`, fullPage: true });
});
