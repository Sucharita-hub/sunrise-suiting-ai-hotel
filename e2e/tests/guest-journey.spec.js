import { test, expect } from "@playwright/test";

const GUEST = { email: "qa.guest@sunrisesuites.test", password: "QaGuestPass123!" };
const STAFF = { email: "qa.staff@sunrisesuites.test", password: "QaStaffPass123!" };

function futureIsoDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  // Availability is intentionally blocked whenever the check-in day-of-month
  // is a multiple of 7 (see backend/src/availabilityService.js) — nudge
  // forward a day if we'd land on one so the search always returns rooms.
  if (d.getDate() % 7 === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function signIn(page, { email, password }) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("nav-chat")).toBeVisible({ timeout: 15_000 });
}

async function signOut(page) {
  await page.getByLabel("Sign out").click();
  await expect(page.getByLabel("Email")).toBeVisible();
}

test("guest can chat, book a stay, pay, and see it in My Reservations; staff sees it in Admin", async ({ page }) => {
  const checkIn = futureIsoDate(5);
  const checkOut = futureIsoDate(8);

  await signIn(page, GUEST);

  // --- Chat: grounded knowledge-base answer -------------------------------
  await page.getByPlaceholder("Ask a question, or type / to see commands...").fill("What time is check-in?");
  await page.getByLabel("Send message").click();
  await expect(page.getByText(/3:00 PM/i)).toBeVisible({ timeout: 15_000 });

  // --- Book a Stay ---------------------------------------------------------
  await page.getByTestId("nav-book").click();
  await page.getByLabel("Check-in").fill(checkIn);
  await page.keyboard.press("Escape");
  await page.getByLabel("Check-out").fill(checkOut);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Check availability" }).click();

  await expect(page.getByRole("button", { name: "Reserve" }).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Reserve" }).first().click();

  await page.getByRole("button", { name: /Pay ₹.*now/ }).click();
  await expect(page.getByText("Reservation confirmed")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Done" }).click();

  // --- My Reservations -----------------------------------------------------
  await page.getByTestId("nav-reservations").click();
  await expect(page.getByText("paid", { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  await signOut(page);

  // --- Staff sees it in Admin ----------------------------------------------
  await signIn(page, STAFF);
  await page.getByTestId("nav-admin").click();
  await expect(page.getByRole("cell", { name: checkIn, exact: false }).first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole("tab", { name: "Unanswered questions" }).click();
  await expect(page.getByRole("tabpanel")).toBeVisible();
});
