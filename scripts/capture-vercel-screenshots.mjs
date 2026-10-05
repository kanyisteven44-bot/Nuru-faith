import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.NURU_QA_BASE ?? "https://nuru-faith-vortiqora.vercel.app").replace(
  /\/$/,
  "",
);
const OUT = "screenshots-vercel";
await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  locale: "en-KE",
  timezoneId: "Africa/Nairobi",
});
const page = await context.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[browser error]", msg.text());
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

async function capture(name, route, waitMs = 2200) {
  const target = BASE + route;
  console.log("CAPTURE", name, target);
  try {
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(waitMs);
    await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true });
    await fs.writeFile(path.join(OUT, name + ".url.txt"), page.url() + "\n");
    return true;
  } catch (err) {
    console.log("CAPTURE_FAILED", name, err?.message ?? String(err));
    try {
      await page.screenshot({ path: path.join(OUT, name + "-failed.png"), fullPage: true });
    } catch {}
    await fs.writeFile(path.join(OUT, name + ".error.txt"), String(err) + "\n");
    return false;
  }
}

// Public production screens.
await capture("01-welcome", "/");
await capture("02-auth-login", "/auth?mode=login");
await capture("03-auth-signup", "/auth?mode=signup");
await capture("04-auth-forgot", "/auth?mode=forgot");
await capture("05-reset-password", "/reset-password");

// Protected-route captures require ephemeral credentials supplied by CI/local env.
const email = process.env.NURU_QA_EMAIL;
const password = process.env.NURU_QA_PASSWORD;
if (!email || !password) {
  console.log(
    "SKIP_PROTECTED: set NURU_QA_EMAIL and NURU_QA_PASSWORD to capture signed-in screens",
  );
  await browser.close();
  process.exit(2);
}

await page.goto(BASE + "/auth?mode=login", { waitUntil: "domcontentloaded", timeout: 45000 });
await page.waitForTimeout(1200);
await page.getByPlaceholder("you@email.com").fill(email);
await page.locator('input[type="password"]').fill(password);
await page.getByRole("button", { name: "Sign In" }).click();
await page
  .waitForFunction(() => location.pathname === "/onboarding" || location.pathname === "/home", {
    timeout: 30000,
  })
  .catch(() => {});
await page.waitForTimeout(1500);

if (!page.url().includes("/onboarding") && !page.url().includes("/home")) {
  console.log("AUTH_UNEXPECTED_URL", page.url());
  await page.screenshot({ path: path.join(OUT, "06-login-unexpected-state.png"), fullPage: true });
  await fs.writeFile(
    path.join(OUT, "AUTH_FAILED.txt"),
    "Unexpected post-login URL: " + page.url() + "\\n",
  );
  await browser.close();
  process.exit(1);
}

// Capture real onboarding before completing it.
if (page.url().includes("/onboarding")) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "06-onboarding-step-1.png"), fullPage: true });

  const nameInput = page.locator("#ob-name");
  if (await nameInput.count()) await nameInput.fill("Nuru Vercel QA");
  const userInput = page.locator("#ob-user");
  if (await userInput.count()) await userInput.fill("nuru_vercel_qa_" + Date.now().toString(36));

  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(500);

  const interestButtons = page.locator("button[aria-pressed]");
  const count = await interestButtons.count();
  for (let i = 0; i < Math.min(3, count); i++) await interestButtons.nth(i).click();

  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Enter Nuru Faith" }).click();
  await page.waitForURL(/\/home/, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

const protectedRoutes = [
  ["07-home", "/home", 2800],
  ["08-reels", "/reels", 5000],
  ["09-devotionals", "/devotionals", 2800],
  ["10-series", "/series", 2800],
  ["11-series-detail", "/series/finding-your-purpose", 2800],
  ["12-series-session", "/series/finding-your-purpose/1", 2800],
  ["13-bible", "/bible", 2500],
  ["14-music", "/music", 4500],
  ["15-nuru-ai", "/ai", 2500],
  ["16-community", "/community", 2800],
  ["17-groups", "/groups", 2800],
  ["18-mentors", "/mentors", 2800],
  ["19-events", "/events", 2800],
  ["20-church", "/church", 2800],
  ["21-profile", "/profile", 2800],
  ["22-settings", "/settings", 2200],
  ["23-explore", "/explore", 2800],
  ["24-hub", "/hub", 2800],
  ["25-serve", "/serve", 2800],
  ["26-podcasts", "/podcasts", 3000],
  ["27-messages", "/messages", 2200],
  ["28-notifications", "/notifications", 2200],
  ["29-create", "/create", 2200],
  ["31-grow", "/grow", 2800],
  ["32-faith-courses", "/faith-courses", 2800],
  ["33-faith-course-lesson", "/faith-courses/understanding-baptism", 2800],
];

let failed = false;
for (const [name, route, wait] of protectedRoutes) {
  const captured = await capture(name, route, wait);
  if (!captured || new URL(page.url()).pathname !== route) {
    console.log("PROTECTED_ROUTE_FAILED", name, page.url());
    failed = true;
  } else if (!(await page.locator("body").innerText()).trim()) {
    console.log("PROTECTED_ROUTE_EMPTY", name);
    failed = true;
  }
}

// Verify lesson progress survives a reload, then restore the QA account's state.
await page.goto(BASE + "/faith-courses/understanding-baptism", { waitUntil: "domcontentloaded" });
try {
  const mark = page.getByRole("button", { name: "Mark lesson complete" });
  const complete = page.getByRole("button", { name: "Lesson completed ✓" });
  await page.getByText("Course progress").waitFor();
  const wasCompleted = await complete.isVisible();
  await (wasCompleted ? complete : mark).click();
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: "domcontentloaded" });
  await (wasCompleted ? mark : complete).waitFor({ timeout: 15000 });
  await (wasCompleted ? mark : complete).click();
  console.log("COURSE_PROGRESS_PERSISTS_AFTER_RELOAD");
} catch (error) {
  console.log("COURSE_PROGRESS_FAILED", error?.message ?? String(error));
  failed = true;
}

await browser.close();
console.log("DONE", OUT);
if (failed) process.exitCode = 1;
