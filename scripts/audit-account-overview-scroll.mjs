/**
 * Đo window.scrollY sau khi mở /tai-khoan?tab=overview (yêu cầu <= 5px).
 *
 * node scripts/audit-account-overview-scroll.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.CTV_SCROLL_BASE ?? "http://localhost:3000";
const IDENT = "isolation-ctv@test.local";
const PASS = "Customer@123";
const MAX_SCROLL_Y = 5;

async function login(ctx) {
  const { csrfToken } = await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json();
  return (
    await ctx.request.post(`${BASE}/api/auth/callback/customer-credentials`, {
      form: {
        csrfToken,
        identifier: IDENT,
        password: PASS,
        callbackUrl: `${BASE}/tai-khoan?tab=overview`,
        json: "true",
      },
    })
  ).ok();
}

async function measureOverviewScroll(page, label) {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${BASE}/tai-khoan?tab=overview`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("#tai-khoan-ctv-content", { timeout: 90000 }).catch(() => {});
  await page.waitForSelector("[data-account-page-header]", { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3500);

  const metrics = await page.evaluate(() => {
    const header = document.querySelector("[data-account-page-header]");
    const hubTitle = document.getElementById("ctv-hub");
    const accountHeading = document.getElementById("ctv-account-card-heading");
    const headerRect = header?.getBoundingClientRect();
    const hubRect = hubTitle?.getBoundingClientRect();
    const accountRect = accountHeading?.getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY * 100) / 100,
      headerTop: headerRect ? Math.round(headerRect.top * 100) / 100 : null,
      hubTop: hubRect ? Math.round(hubRect.top * 100) / 100 : null,
      accountTop: accountRect ? Math.round(accountRect.top * 100) / 100 : null,
      hasHub: Boolean(hubTitle),
      hasAccount: Boolean(accountHeading),
    };
  });

  return { label, ...metrics, ok: metrics.scrollY <= MAX_SCROLL_Y };
}

async function measureTabSwitch(page, outDir) {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${BASE}/tai-khoan?tab=notifications`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(300);

  const overviewBtn = page.getByRole("button", { name: "Tổng quan" }).first();
  await overviewBtn.click({ timeout: 15000 });
  await page.waitForTimeout(2500);

  const metrics = await page.evaluate(() => ({
    scrollY: Math.round(window.scrollY * 100) / 100,
    hubTop: document.getElementById("ctv-hub")?.getBoundingClientRect().top ?? null,
  }));

  await page.screenshot({ path: path.join(outDir, "tab-switch-overview.png") });
  return {
    label: "notifications→overview (sau scroll 800)",
    ...metrics,
    ok: metrics.scrollY <= MAX_SCROLL_Y,
  };
}

async function main() {
  const outDir = path.join(ROOT, "..", ".artifacts", "account-overview-scroll");
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  if (!(await login(ctx))) {
    console.error("Login failed");
    process.exit(1);
  }
  const page = await ctx.newPage();

  const rows = [];
  rows.push(await measureOverviewScroll(page, "direct ?tab=overview"));
  await page.screenshot({ path: path.join(outDir, "direct-overview.png") });

  try {
    rows.push(await measureTabSwitch(page, outDir));
  } catch (e) {
    rows.push({ label: "tab switch", ok: false, error: String(e), scrollY: null });
  }

  await browser.close();

  console.log("\n## Account overview scroll audit\n");
  console.log(`Threshold: scrollY <= ${MAX_SCROLL_Y}px\n`);
  console.log("| Case | scrollY | hubTop | accountTop | OK |");
  console.log("|------|---------|--------|------------|-----|");
  for (const r of rows) {
    console.log(
      `| ${r.label} | ${r.scrollY ?? "—"} | ${r.hubTop ?? "—"} | ${r.accountTop ?? "—"} | ${r.ok ? "✓" : "✗"} |`,
    );
  }

  const failed = rows.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n${failed.length} failed. Screenshots: ${outDir}`);
    process.exit(1);
  }
  console.log(`\nAll passed. Screenshots: ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
