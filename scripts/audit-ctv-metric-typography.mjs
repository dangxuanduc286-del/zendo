/**
 * Kiểm tra typography số CTV — không tràn card, không wrap, chiều cao card ổn định.
 *
 * Offline fixture:
 *   node scripts/audit-ctv-metric-typography.mjs --fixture
 *
 * Live overview (cần dev server + isolation-ctv@test.local):
 *   node scripts/audit-ctv-metric-typography.mjs --live
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(ROOT, "ctv-metric-typography-fixture.html");
const BASE = process.env.CTV_TYPO_BASE ?? "http://localhost:3000";
const IDENT = "isolation-ctv@test.local";
const PASS = "Customer@123";

const VIEWPORTS = [
  { name: "1366", width: 1366, height: 900 },
  { name: "1440", width: 1440, height: 900 },
  { name: "1920", width: 1920, height: 900 },
];

const ZOOMS = [1, 1.25];

async function measureOverflow(page, selector) {
  return page.evaluate((sel) => {
    const cards = [...document.querySelectorAll(sel)];
    return cards.map((card) => {
      const value =
        card.querySelector("[data-value]") ??
        card.querySelector(".ctv-value") ??
        card.querySelector("[class*='tabular-nums']") ??
        card;
      const cardRect = card.getBoundingClientRect();
      const valueRect = value.getBoundingClientRect();
      const cs = getComputedStyle(value);
      const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      return {
        label: card.querySelector("p")?.textContent?.trim() ?? card.getAttribute("aria-label") ?? "",
        text: (value.textContent ?? "").trim(),
        cardW: Math.round(cardRect.width),
        cardH: Math.round(cardRect.height),
        valueW: Math.round(valueRect.width),
        overflowX: valueRect.right > cardRect.right + 1,
        wrapped: cs.whiteSpace !== "nowrap" || value.scrollHeight > lineHeight * 1.35,
        fontSize: cs.fontSize,
      };
    });
  }, selector);
}

async function runFixture(browser, outDir) {
  const rows = [];
  for (const vp of VIEWPORTS) {
    for (const zoom of ZOOMS) {
      const page = await browser.newPage();
      await page.setViewportSize(vp);
      await page.goto(`file:///${FIXTURE.replace(/\\/g, "/")}`);
      if (zoom !== 1) {
        await page.evaluate((z) => {
          document.documentElement.style.zoom = String(z);
        }, zoom);
      }
      await page.waitForTimeout(200);
      const file = path.join(outDir, `fixture-${vp.name}-z${Math.round(zoom * 100)}.png`);
      await page.screenshot({ path: file, fullPage: false });
      const measures = await measureOverflow(page, "[data-testid='ctv-money-card']");
      const bad = measures.filter((m) => m.overflowX || m.wrapped);
      rows.push({
        mode: "fixture",
        viewport: vp.name,
        zoom: `${Math.round(zoom * 100)}%`,
        ok: bad.length === 0,
        bad,
        screenshot: file,
      });
      await page.close();
    }
  }
  return rows;
}

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

async function runLive(browser, outDir) {
  const ctx = await browser.newContext();
  if (!(await login(ctx))) {
    throw new Error("Login failed — start dev server and use isolation-ctv@test.local");
  }
  const page = await ctx.newPage();
  const rows = [];
  const paths = [
    { label: "overview", path: "/tai-khoan?tab=overview", sel: "#tai-khoan-ctv-content [class*='@container/metric'], #tai-khoan-ctv-content article" },
    { label: "analytics", path: "/tai-khoan/affiliate/analytics", sel: "#tai-khoan-affiliate-subpage-content .@container\\/metric, #tai-khoan-affiliate-subpage-content article" },
  ];

  for (const vp of VIEWPORTS.slice(0, 1)) {
    await page.setViewportSize(vp);
    for (const route of paths) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForTimeout(5000);
      const file = path.join(outDir, `live-${route.label}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      const measures = await page.evaluate(() => {
        const articles = [
          ...document.querySelectorAll("#tai-khoan-ctv-content article, #tai-khoan-affiliate-subpage-content article"),
        ].slice(0, 12);
        return articles.map((card) => {
          const value =
            card.querySelector("span[class*='tabular-nums']") ??
            card.querySelector("p[class*='tabular-nums']") ??
            card.querySelector("span.block") ??
            card.querySelector("p.mt-1") ??
            card;
          const cardRect = card.getBoundingClientRect();
          const valueRect = value.getBoundingClientRect();
          const cs = getComputedStyle(value);
          return {
            label: card.querySelector("p")?.textContent?.trim()?.slice(0, 40) ?? "",
            text: (value.textContent ?? "").trim().slice(0, 32),
            overflowX: valueRect.right > cardRect.right + 1,
            wrapped: cs.whiteSpace !== "nowrap" && value.scrollHeight > parseFloat(cs.fontSize) * 1.8,
            fontSize: cs.fontSize,
          };
        });
      });
      const bad = measures.filter((m) => m.overflowX || m.wrapped);
      rows.push({ mode: "live", route: route.label, viewport: vp.name, ok: bad.length === 0, bad, screenshot: file });
    }
  }
  await browser.close();
  return rows;
}

async function main() {
  const mode = process.argv.includes("--live") ? "live" : "fixture";
  const outDir = path.join(ROOT, "..", ".artifacts", "ctv-metric-typography");
  await import("node:fs/promises").then((fs) => fs.mkdir(outDir, { recursive: true }));

  const browser = await chromium.launch({ headless: true });
  const rows = mode === "live" ? await runLive(browser, outDir) : await runFixture(browser, outDir);
  if (mode === "fixture") await browser.close();

  console.log("\n## CTV metric typography audit\n");
  console.log("| Mode | Viewport | Zoom | OK | Issues | Screenshot |");
  console.log("|------|----------|------|----|--------|------------|");
  for (const r of rows) {
    const issues = r.bad?.length ? r.bad.map((b) => `${b.text || b.label}: overflow=${b.overflowX}`).join("; ") : "—";
    console.log(`| ${r.mode} | ${r.viewport ?? r.route} | ${r.zoom ?? "—"} | ${r.ok ? "✓" : "✗"} | ${issues} | ${r.screenshot} |`);
  }

  const failed = rows.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`\n${failed.length} check(s) failed. See screenshots in ${outDir}`);
    process.exit(1);
  }
  console.log(`\nAll checks passed. Artifacts: ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
