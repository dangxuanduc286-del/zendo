import { chromium } from "playwright";
import path from "node:path";

const BASE = "http://localhost:3000";
const out = path.join(process.cwd(), ".artifacts/mobile-ctv-audit");

const VPs = [
  [375, 812, "375"],
  [390, 844, "390"],
  [430, 932, "430"],
];

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
  for (const [w, h, n] of VPs) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/tai-khoan?tab=overview`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(5000);
    for (const id of ["ctv-wallet-heading", "ctv-performance-heading", "ctv-member-rank-heading"]) {
      const el = await page.locator(`#${id}`).first();
      if ((await el.count()) > 0) await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(out, `wallet-perf-${n}.png`) });
    const lines = await page.evaluate(() => {
      const o = [];
      const vw = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth - vw > 1) o.push(`docOverflow:${document.documentElement.scrollWidth - vw}`);
      const rank = document.getElementById("ctv-member-rank-heading")?.closest("section");
      if (rank) {
        const reward = rank.querySelector(".flex-nowrap");
        if (reward && reward.scrollWidth > reward.clientWidth + 4) {
          o.push(`rankRewardScroll:${reward.scrollWidth - reward.clientWidth}`);
        }
        rank.querySelectorAll("span").forEach((s) => {
          const t = (s.textContent || "").trim();
          if (t.length < 6) return;
          const sr = s.getBoundingClientRect();
          const pr = (s.parentElement || rank).getBoundingClientRect();
          if (sr.right > pr.right + 2) o.push(`rankText:${t.slice(0, 20)}+${Math.round(sr.right - pr.right)}`);
        });
      }
      const wallet = document.getElementById("ctv-wallet-heading")?.closest("section");
      if (wallet) {
        wallet.querySelectorAll("span").forEach((s) => {
          const t = (s.textContent || "").trim();
          if (!/₫|\+|\d/.test(t)) return;
          const sr = s.getBoundingClientRect();
          const pr = (s.parentElement || wallet).getBoundingClientRect();
          if (sr.right > pr.right + 2) o.push(`wallet:${t.slice(0, 24)}+${Math.round(sr.right - pr.right)}`);
        });
      }
      return o;
    });
    console.log(n, lines.length ? lines.join("; ") : "ok");
  }
  await browser.close();
}

main();
