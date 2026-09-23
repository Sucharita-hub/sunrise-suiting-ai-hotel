import { test } from "@playwright/test";
import path from "node:path";

const GUEST = { email: "qa.guest@sunrisesuites.test", password: "QaGuestPass123!" };
const STAFF = { email: "qa.staff@sunrisesuites.test", password: "QaStaffPass123!" };
const SHOTS = path.resolve(import.meta.dirname, "../design-review");

function futureIsoDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  if (d.getDate() % 7 === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function signIn(page, { email, password }) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByTestId("nav-chat").waitFor({ timeout: 15_000 });
}

test.describe.configure({ mode: "serial" });

test("shot: auth sign-in", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/01-auth-signin.png`, fullPage: true });
});

test("shot: auth sign-up", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Create account", { exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/02-auth-signup.png`, fullPage: true });
});

test("shot: chat with a message", async ({ page }) => {
  await signIn(page, GUEST);
  await page.getByPlaceholder("Ask about rooms, breakfast, check-in...").fill("What time is check-in?");
  await page.getByLabel("Send message").click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOTS}/03-chat.png`, fullPage: true });
});

test("shot: book a stay empty and results", async ({ page }) => {
  await signIn(page, GUEST);
  await page.getByTestId("nav-book").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/04-book-empty.png`, fullPage: true });

  const checkIn = futureIsoDate(5);
  const checkOut = futureIsoDate(8);
  await page.getByLabel("Check-in").fill(checkIn);
  await page.keyboard.press("Escape");
  await page.getByLabel("Check-out").fill(checkOut);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Check availability" }).click();
  await page.getByRole("button", { name: "Reserve" }).first().waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/05-book-results.png`, fullPage: true });

  await page.getByRole("button", { name: "Reserve" }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/06-book-confirm-modal.png`, fullPage: true });

  await page.getByRole("button", { name: /Pay ₹.*now/ }).click();
  await page.getByText("Reservation confirmed").waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/07-book-confirmed-modal.png`, fullPage: true });
  await page.getByRole("button", { name: "Done" }).click();
});

test("shot: my reservations", async ({ page }) => {
  await signIn(page, GUEST);
  await page.getByTestId("nav-reservations").click();
  await page.getByRole("table").or(page.getByText("No reservations yet")).first().waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/08-reservations.png`, fullPage: true });
});

test("shot: admin", async ({ page }) => {
  await signIn(page, STAFF);
  await page.getByTestId("nav-admin").click();
  await page.getByRole("cell", { name: "Deluxe Room" }).or(page.getByText("No reservations yet")).first().waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/09-admin-reservations.png`, fullPage: true });

  await page.getByRole("tab", { name: "Unanswered questions" }).click();
  await page
    .getByTestId("flagged-item")
    .first()
    .or(page.getByText("No knowledge-base gaps recorded", { exact: false }))
    .waitFor({ timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/10-admin-flagged.png`, fullPage: true });
});
