import { chromium } from "playwright";
import path from "node:path";

const BASE = "http://localhost:3000";
const out = path.join(process.cwd(), ".artifacts/mobile-ctv-audit");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ isMobile: true });
  const { csrfToken } = await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json();
  await ctx.request.post(`${BASE}/api/auth/callback/customer-credentials`, {
    form: {
      csrfToken,
      identifier: "isolation-ctv@test.local",
      password: "Customer@123",
      callbackUrl: `${BASE}/tai-khoan?tab=overview`,
      json: "true",
    },
  });
  const page = await ctx.newPage();
  for (const [w, h, n] of [
    [375, 812, "375"],
    [390, 844, "390"],
    [430, 932, "430"],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/tai-khoan?tab=overview`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(5000);
    const wallet = page.locator("#ctv-wallet-heading");
    if ((await wallet.count()) > 0) {
      await wallet.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(out, `commission-${n}.png`) });
    } else console.log(n, "wallet missing");
    const perf = page.locator("#ctv-performance-heading");
    if ((await perf.count()) > 0) {
      await perf.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(out, `performance-${n}.png`) });
    } else console.log(n, "perf missing");
  }
  await browser.close();
}

main();
