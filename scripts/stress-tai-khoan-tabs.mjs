/**
 * Stress /tai-khoan tab switches (default 100 cycles).
 * Usage: node scripts/stress-tai-khoan-tabs.mjs [baseUrl] [cycles]
 */
import { chromium } from "playwright";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const cycles = Number(process.argv[3] ?? 100);
const IDENT = process.env.ISOLATION_LOGIN_ID ?? "isolation-ctv@test.local";
const PASSWORD = process.env.ISOLATION_LOGIN_PW ?? "Customer@123";
const tabs = ["overview", "affiliate", "notifications", "orders", "profile"];

const errors = [];

async function login(request) {
  const { csrfToken } = await (await request.get(`${base}/api/auth/csrf`)).json();
  await request.post(`${base}/api/auth/callback/customer-credentials`, {
    form: {
      csrfToken,
      identifier: IDENT,
      password: PASSWORD,
      callbackUrl: `${base}/tai-khoan`,
      json: "true",
    },
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e.message)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await login(ctx.request);
  await page.goto(`${base}/tai-khoan?tab=overview`, { waitUntil: "networkidle", timeout: 120000 });

  for (let i = 0; i < cycles; i++) {
    const tab = tabs[i % tabs.length];
    await page.goto(`${base}/tai-khoan?tab=${tab}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(150);
  }

  const removeChildHits = errors.filter((e) => e.includes("removeChild"));
  const appErrors = errors.filter((e) => /application error|client-side exception/i.test(e));

  console.log(
    JSON.stringify({
      cycles,
      totalErrors: errors.length,
      removeChildCount: removeChildHits.length,
      applicationErrorCount: appErrors.length,
      pass: removeChildHits.length === 0 && appErrors.length === 0,
      samples: removeChildHits.slice(0, 3),
    }),
  );

  await browser.close();
  process.exitCode = removeChildHits.length > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
