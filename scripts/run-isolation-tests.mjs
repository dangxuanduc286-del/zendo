/**
 * Run isolation TEST1-5 sequentially; prints PASS/FAIL per test.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const IDENT = process.env.ISOLATION_LOGIN_ID ?? "isolation-ctv@test.local";
const PASSWORD = process.env.ISOLATION_LOGIN_PW ?? "Customer@123";

const paths = {
  keepAlive: "src/components/storefront/account-tab-keep-alive.tsx",
  affiliateView: "src/components/storefront/affiliate-only-account-view.tsx",
  bleedPortal: "src/components/storefront/storefront-campaign-bleed-portal.tsx",
  supportDm: "src/components/support/support-dm-panel.tsx",
  layout: "src/app/(storefront)/(with-chrome)/layout.tsx",
};

function read(p) {
  return readFileSync(p, "utf8");
}
function write(p, s) {
  writeFileSync(p, s, "utf8");
}
function revert(files) {
  for (const f of files) {
    try {
      execSync(`git checkout -- "${f}"`, { stdio: "pipe" });
    } catch {
      /* ignore */
    }
  }
}

async function probe(phase) {
  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e.message)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const { csrfToken } = await (await ctx.request.get(`${base}/api/auth/csrf`)).json();
  await ctx.request.post(`${base}/api/auth/callback/customer-credentials`, {
    form: {
      csrfToken,
      identifier: IDENT,
      password: PASSWORD,
      callbackUrl: `${base}/tai-khoan`,
      json: "true",
    },
  });
  for (const tab of ["overview", "affiliate", "notifications", "orders", "overview", "affiliate"]) {
    await page.goto(`${base}/tai-khoan?tab=${tab}`, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(3000);
  }
  const hit = errors.some((e) => e.includes("removeChild"));
  await browser.close();
  return { phase, crash: hit, pass: !hit };
}

const tests = [];

try {
  // Baseline
  await new Promise((r) => setTimeout(r, 4000));
  const baseline = await probe("baseline");
  console.error("baseline", JSON.stringify(baseline));

  // TEST1
  {
    const p = paths.keepAlive;
    const orig = read(p);
    const patched = orig.replace(
      /  if \(!enabled \|\| !mounted\) return null;\n\n  return \(/,
      `  if (!enabled || !mounted) return null;\n  if (!isActive) return null;\n\n  return (`,
    ).replace(
      /      className=\{\[className, !isActive \? "hidden" : ""\]\.filter\(Boolean\)\.join\(" "\)\}\n      hidden=\{!isActive\}\n      aria-hidden=\{!isActive\}\n      inert=\{!isActive \? true : undefined\}\n      data-account-tab=\{tabKey\}\n      data-account-tab-active=\{isActive \? "1" : "0"\}/,
      `      className={className}\n      data-account-tab={tabKey}\n      data-account-tab-active="1"`,
    );
    write(p, patched);
    await new Promise((r) => setTimeout(r, 5000));
    const r = await probe("TEST1");
    tests.push({ id: "TEST1", ...r });
    write(p, orig);
  }

  // TEST2
  {
    const p = paths.affiliateView;
    const orig = read(p);
    let s = orig
      .replace("<CtvOverviewDashboard {...overviewDashboardProps} />", "{false ? <CtvOverviewDashboard {...overviewDashboardProps} /> : null}")
      .replace("<CtvAffiliateWorkspaceDesktop {...affiliateWorkspaceProps} />", "{false ? <CtvAffiliateWorkspaceDesktop {...affiliateWorkspaceProps} /> : null}")
      .replace(
        /(\s+<div className="lg:hidden">\s+)<AffiliateAccountDashboardTab/,
        "$1{false ? <AffiliateAccountDashboardTab",
      )
      .replace(/(uiShell="ctv"\s*\/>)(\s*<\/div>)/, "$1 : null}$2");
    write(p, s);
    await new Promise((r) => setTimeout(r, 5000));
    const r = await probe("TEST2");
    tests.push({ id: "TEST2", ...r });
    write(p, orig);
  }

  // TEST3
  {
    const p = paths.bleedPortal;
    const orig = read(p);
    const patched = orig.replace(
      "export function StorefrontCampaignBleedPortal(): JSX.Element | null {",
      "export function StorefrontCampaignBleedPortal(): JSX.Element | null {\n  return null; // ISOLATION TEST3",
    );
    write(p, patched);
    await new Promise((r) => setTimeout(r, 5000));
    const r = await probe("TEST3");
    tests.push({ id: "TEST3", ...r });
    write(p, orig);
  }

  // TEST4
  {
    const p = paths.supportDm;
    const orig = read(p);
    const patched = orig.replace(
      "}): JSX.Element | null {",
      "}): JSX.Element | null {\n  return null; // ISOLATION TEST4",
    );
    write(p, patched);
    await new Promise((r) => setTimeout(r, 5000));
    const r = await probe("TEST4");
    tests.push({ id: "TEST4", ...r });
    write(p, orig);
  }

  // TEST5
  {
    const p = paths.layout;
    const orig = read(p);
    let s = orig.replace(
      "{trackingEnabled && websiteSettings.headScripts.trim() ?",
      "{false && trackingEnabled && websiteSettings.headScripts.trim() ?",
    );
    s = s.replace(
      "{trackingEnabled && websiteSettings.bodyScripts.trim() ?",
      "{false && trackingEnabled && websiteSettings.bodyScripts.trim() ?",
    );
    write(p, s);
    await new Promise((r) => setTimeout(r, 5000));
    const r = await probe("TEST5");
    tests.push({ id: "TEST5", ...r });
    write(p, orig);
  }
} finally {
  revert(Object.values(paths));
}

for (const t of tests) {
  console.log(`${t.id}: ${t.pass ? "PASS" : "FAIL"}`);
}
