/**
 * Load /tai-khoan with session and detect removeChild errors (tab switching stress).
 */
import { chromium } from "playwright";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const TARGET = "removeChild";
const IDENT = process.env.ISOLATION_LOGIN_ID ?? "isolation-ctv@test.local";
const PASS = process.env.ISOLATION_LOGIN_PW ?? "Customer@123";

const errors = [];

async function loginViaNextAuth(request) {
  const { csrfToken } = await (await request.get(`${base}/api/auth/csrf`)).json();
  const res = await request.post(`${base}/api/auth/callback/customer-credentials`, {
    form: {
      csrfToken,
      identifier: IDENT,
      password: PASS,
      callbackUrl: `${base}/tai-khoan?tab=overview`,
      json: "true",
    },
    maxRedirects: 0,
  });
  return res.status() === 200 || res.status() === 302;
}

async function stressTabs(page) {
  const tabs = ["overview", "affiliate", "notifications", "orders", "profile"];
  for (const tab of tabs) {
    await page.goto(`${base}/tai-khoan?tab=${tab}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
  }
  await page.goto(`${base}/tai-khoan?tab=overview`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(4000);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (err) => errors.push(String(err?.message ?? err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  try {
    const loginOk = await loginViaNextAuth(context.request);
    await page.goto(`${base}/tai-khoan?tab=overview`, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(3000);
    await stressTabs(page);
    const html = await page.content();
    const loggedIn = html.includes("Trung tâm CTV") || html.includes("data-account-tab");
    const hit = errors.some((e) => e.includes(TARGET));
    console.log(
      JSON.stringify({
        phase: process.env.ISOLATION_PHASE ?? "?",
        crash: hit,
        loggedIn,
        loginOk,
        errorCount: errors.length,
        removeChildErrors: errors.filter((e) => e.includes(TARGET)),
      }),
    );
    process.exitCode = hit ? 1 : 0;
  } catch (e) {
    console.log(JSON.stringify({ phase: process.env.ISOLATION_PHASE ?? "?", crash: true, fatal: String(e) }));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
