import { test } from "@playwright/test";
import path from "node:path";

const GUEST = { email: "qa.guest@sunrisesuites.test", password: "QaGuestPass123!" };
const STAFF = { email: "qa.staff@sunrisesuites.test", password: "QaStaffPass123!" };
const SHOTS = path.resolve(import.meta.dirname, "../design-review");

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 }
};

async function signIn(page, { email, password }) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(500);
}

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test.describe(`responsive: ${name}`, () => {
    test.use({ viewport: size });

    test(`${name}: auth screen`, async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${SHOTS}/resp-${name}-01-auth.png`, fullPage: true });
    });

    test(`${name}: chat + burger nav + nested threads`, async ({ page }) => {
      await signIn(page, GUEST);
      await page.screenshot({ path: `${SHOTS}/resp-${name}-02-chat.png`, fullPage: true });

      if (name === "mobile") {
        await page.getByTestId("nav-burger").click();
        await page.waitForTimeout(300);
        await page.getByTestId("nav-chat").waitFor();
        await page.getByTestId("new-chat").waitFor();
        await page.screenshot({ path: `${SHOTS}/resp-${name}-03-nav-drawer.png`, fullPage: true });

        // Chat nav item toggles the nested thread list open/closed.
        await page.getByTestId("nav-chat").click();
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${SHOTS}/resp-${name}-04-threads-collapsed.png`, fullPage: true });
        await page.getByTestId("nav-chat").click();
        await page.waitForTimeout(200);

        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }

      await page.getByPlaceholder("Ask a question, or type / to see commands...").fill("/rooms");
      await page.keyboard.press("Enter");
      await page.getByText("Deluxe Room").waitFor({ timeout: 10_000 });
      await page.screenshot({ path: `${SHOTS}/resp-${name}-05-browse-rooms.png`, fullPage: true });
    });

    test(`${name}: book a stay`, async ({ page }) => {
      await signIn(page, GUEST);
      if (name === "mobile") {
        await page.getByTestId("nav-burger").click();
        await page.waitForTimeout(200);
      }
      await page.getByTestId("nav-book").click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/resp-${name}-06-book.png`, fullPage: true });
    });

    test(`${name}: reservations`, async ({ page }) => {
      await signIn(page, GUEST);
      if (name === "mobile") {
        await page.getByTestId("nav-burger").click();
        await page.waitForTimeout(200);
      }
      await page.getByTestId("nav-reservations").click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/resp-${name}-07-reservations.png`, fullPage: true });
    });

    test(`${name}: admin`, async ({ page }) => {
      await signIn(page, STAFF);
      if (name === "mobile") {
        await page.getByTestId("nav-burger").click();
        await page.waitForTimeout(200);
      }
      await page.getByTestId("nav-admin").click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/resp-${name}-08-admin.png`, fullPage: true });
    });
  });
}
