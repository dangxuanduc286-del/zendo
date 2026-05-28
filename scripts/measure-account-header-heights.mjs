/**
 * Đo chiều cao header + contentTop cho các tab /tai-khoan (desktop).
 * node scripts/measure-account-header-heights.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const VP = { width: 1366, height: 900 };
const IDENT = "isolation-ctv@test.local";
const PASS = "Customer@123";

const TABS = [
  { key: "overview", label: "Tổng quan", path: "/tai-khoan?tab=overview" },
  { key: "promo", label: "Quảng bá", path: "/tai-khoan/affiliate/campaign" },
  { key: "analytics", label: "Thống kê hiệu suất", path: "/tai-khoan/affiliate/analytics" },
  { key: "attribution", label: "Attribution", path: "/tai-khoan/affiliate/attribution" },
  { key: "notifications", label: "Thông báo", path: "/tai-khoan?tab=notifications" },
  { key: "profile", label: "Thông tin cá nhân", path: "/tai-khoan?tab=profile" },
  { key: "security", label: "Bảo mật tài khoản", path: "/tai-khoan?tab=security" },
  { key: "affiliate", label: "CTV / Affiliate", path: "/tai-khoan?tab=affiliate&sub=links" },
];

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

async function measure(page, tab) {
  await page.setViewportSize(VP);
  await page.goto(`${BASE}${tab.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const mainSel =
    tab.path.includes("/affiliate/") ? "#tai-khoan-affiliate-subpage-content" : "#tai-khoan-ctv-content";
  await page.waitForSelector(mainSel, { timeout: 60000 }).catch(() => {});
  await page
    .waitForSelector(`${mainSel} [data-account-page-header]`, { timeout: 90000 })
    .catch(() => {});
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const main =
      document.querySelector("#tai-khoan-ctv-content") ??
      document.querySelector("#tai-khoan-affiliate-subpage-content");
    const header = main?.querySelector("[data-account-page-header]") ?? document.querySelector("[data-account-page-header]");
    const content =
      main?.querySelector("[data-account-page-content]") ?? document.querySelector("[data-account-page-content]");
    const h = header?.getBoundingClientRect();
    const c = content?.getBoundingClientRect();
    return {
      url: location.href,
      lg: matchMedia("(min-width: 1024px)").matches,
      headerHeight: h ? Math.round(h.height * 100) / 100 : null,
      contentTop: c ? Math.round(c.top * 100) / 100 : null,
      foundHeader: Boolean(header),
      foundContent: Boolean(content),
    };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  if (!(await login(ctx))) {
    console.error("Login failed");
    process.exit(1);
  }
  const page = await ctx.newPage();
  const rows = [];
  for (const tab of TABS) {
    rows.push({ tab: tab.label, ...(await measure(page, tab)) });
  }
  await browser.close();

  const heights = rows.map((r) => r.headerHeight).filter((v) => v != null);
  const tops = rows.map((r) => r.contentTop).filter((v) => v != null);
  const heightOk = heights.length > 0 && heights.every((h) => h === heights[0]);
  const topOk = tops.length > 0 && tops.every((t) => t === tops[0]);

  console.log("\n| Tab | Header Height |");
  console.log("|-----|---------------|");
  for (const r of rows) {
    console.log(`| ${r.tab} | ${r.headerHeight ?? "N/A"} |`);
  }
  console.log("\n| Tab | Content Start Y |");
  console.log("|-----|-------------------|");
  for (const r of rows) {
    console.log(`| ${r.tab} | ${r.contentTop ?? "N/A"} |`);
  }
  console.log(
    JSON.stringify(
      { heightOk, topOk, uniqueHeights: [...new Set(heights)], uniqueTops: [...new Set(tops)], rows },
      null,
      2,
    ),
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
