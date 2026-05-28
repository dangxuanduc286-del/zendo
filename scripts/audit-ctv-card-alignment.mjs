/**
 * Audit card alignment — cần đăng nhập CTV.
 * node scripts/audit-ctv-card-alignment.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const VP = { width: 1366, height: 900 };

function chain(el) {
  const out = [];
  let n = el;
  while (n && n !== document.body) {
    const s = getComputedStyle(n);
    out.push({
      tag: n.tagName.toLowerCase(),
      id: n.id || null,
      aria: n.getAttribute("aria-label") || null,
      mt: s.marginTop,
      pt: s.paddingTop,
      transform: s.transform,
      position: s.position,
      top: s.top,
      gap: s.gap,
      rowGap: s.rowGap,
    });
    n = n.parentElement;
  }
  return out;
}

async function measurePage(page, tabKey) {
  await page.setViewportSize(VP);
  await page.goto(`${BASE}/tai-khoan?tab=${tabKey}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(4000);

  return page.evaluate((tab) => {
    const grid = document.querySelector('section[aria-label="Bố cục tài khoản CTV"]');
    const aside = grid?.querySelector(":scope > aside") ?? null;
    const main = grid?.querySelector(":scope > main") ?? null;
    const sidebarCard = aside?.querySelector(":scope > div") ?? null;
    const hubCard =
      document.querySelector('main[aria-label="Trung tâm CTV — kiếm tiền và hiệu suất"] section') ?? null;
    const workspaceSection = document.querySelector('section[aria-label="Không gian làm việc CTV"]');
    const workspaceCard =
      workspaceSection?.querySelector(":scope > div") ?? null;

    const activePanel = main?.querySelector('[data-account-tab-active="1"]');
    const mainCard =
      hubCard ??
      activePanel?.querySelector("section") ??
      activePanel?.querySelector(":scope > div") ??
      null;

    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const rSidebar = rect(sidebarCard);
    const rHub = rect(hubCard);
    const rWorkspace = rect(workspaceCard);
    const rMainCard = rect(mainCard);

    const delta = (a, b) =>
      a && b ? Math.round((a.top - b.top) * 100) / 100 : null;

    return {
      tab,
      url: location.href,
      lg: matchMedia("(min-width: 1024px)").matches,
      tops: {
        sidebarCard: rSidebar?.top ?? null,
        mainCard: rMainCard?.top ?? null,
        hubCard: rHub?.top ?? null,
        workspaceCard: rWorkspace?.top ?? null,
      },
      deltas: {
        sidebar_minus_mainCard: delta(rSidebar, rMainCard),
        sidebar_minus_hub: delta(rSidebar, rHub),
        sidebar_minus_workspace: delta(rSidebar, rWorkspace),
      },
      found: {
        grid: Boolean(grid),
        sidebarCard: Boolean(sidebarCard),
        hubCard: Boolean(hubCard),
        workspaceCard: Boolean(workspaceCard),
        mainCard: Boolean(mainCard),
      },
      ancestorChain: {
        sidebarCard: sidebarCard ? chain(sidebarCard).slice(0, 12) : null,
        hubCard: hubCard ? chain(hubCard).slice(0, 12) : null,
        workspaceCard: workspaceCard ? chain(workspaceCard).slice(0, 12) : null,
      },
    };
  }, tabKey);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const overview = await measurePage(page, "overview");
  const affiliate = await measurePage(page, "affiliate");
  await browser.close();
  console.log(JSON.stringify({ viewport: VP, overview, affiliate }, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
