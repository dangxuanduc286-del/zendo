/**
 * Browser runtime: signOut qua account-menu → chọn tài khoản đã lưu → theo dõi Network.
 *
 * node scripts/audit-signout-browser.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.CTV_SCROLL_BASE ?? "http://localhost:3000";
const IDENT = process.env.AUTH_AUDIT_IDENT ?? "nguyen.anh@example.com";
const PASS = process.env.AUTH_AUDIT_PASS ?? "Customer@123";
const OUT_DIR = path.join(ROOT, "..", ".artifacts", "signout-runtime-audit");

const STORAGE_KEY = "zendo.storefront.savedLoginProfiles";

async function apiLogin(request) {
  const { csrfToken } = await (await request.get(`${BASE}/api/auth/csrf`)).json();
  const res = await request.post(`${BASE}/api/auth/callback/customer-credentials`, {
    form: {
      csrfToken,
      identifier: IDENT,
      password: PASS,
      callbackUrl: `${BASE}/tai-khoan`,
      json: "true",
    },
  });
  return res.ok();
}

async function snapshot(request) {
  const res = await request.get(`${BASE}/api/auth/session-snapshot`);
  return res.json();
}

async function main() {
  const report = {
    base: BASE,
    ident: IDENT,
    at: new Date().toISOString(),
    steps: {},
    networkAfterProfileClick: [],
    verdict: null,
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: "vi-VN",
  });
  const request = context.request;

  if (!(await apiLogin(request))) {
    throw new Error("API login failed");
  }

  const storage = await request.storageState();
  await context.addCookies(storage.cookies);

  report.steps.afterLoginSnapshot = await snapshot(request);
  report.steps.afterLoginSession = await (
    await request.get(`${BASE}/api/auth/session`)
  ).json();

  const page = await context.newPage();
  const authCalls = [];
  page.on("request", (req) => {
    const url = req.url();
    if (
      url.includes("/api/auth/callback/") ||
      url.includes("/api/auth/signin") ||
      url.includes("/api/auth/session")
    ) {
      authCalls.push({ method: req.method(), url });
    }
  });

  await page.goto(`${BASE}/tai-khoan`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  report.steps.onAccountBeforeLogout = {
    url: page.url(),
    hasDashboard: (await page.locator("#tai-khoan-ctv-content").count()) > 0,
    hasAuthCard: (await page.getByText("Tài khoản đã lưu").count()) > 0,
  };

  report.steps.signOutMethod =
    "page.evaluate fetch /api/auth/signout (same POST body as next-auth signOut + redirect /)";

  await page.evaluate(async (origin) => {
    const csrfRes = await fetch(`${origin}/api/auth/csrf`, { credentials: "include" });
    const { csrfToken } = await csrfRes.json();
    await fetch(`${origin}/api/auth/signout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken,
        callbackUrl: `${origin}/`,
        json: "true",
      }),
    });
    window.location.href = `${origin}/`;
  }, BASE);
  await page.waitForURL((url) => url.pathname === "/" || url.href.startsWith(`${BASE}/`), {
    timeout: 30000,
  });
  await page.waitForTimeout(1200);

  report.steps.afterSignOutSnapshot = await snapshot(request);
  report.steps.afterSignOutSession = await (
    await request.get(`${BASE}/api/auth/session`)
  ).json();
  report.steps.afterSignOutUrl = page.url();

  authCalls.length = 0;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ({ key, profiles }) => {
      localStorage.setItem(key, JSON.stringify(profiles));
    },
    {
      key: STORAGE_KEY,
      profiles: [
        {
          id: IDENT.toLowerCase(),
          identifier: IDENT,
          displayName: "Audit Saved",
          lastUsedAt: Date.now(),
        },
      ],
    },
  );
  await page.goto(`${BASE}/tai-khoan`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);

  const savedVisible = (await page.getByText("Tài khoản đã lưu").count()) > 0;
  report.steps.onAuthAfterLogout = {
    url: page.url(),
    savedVisible,
    hasDashboard: (await page.locator("#tai-khoan-ctv-content").count()) > 0,
    hasLoginButton: (await page.getByRole("button", { name: "Đăng nhập" }).count()) > 0,
  };

  if (savedVisible) {
    await page.locator('button[type="button"]').filter({ hasText: "Audit Saved" }).first().click();
    await page.waitForTimeout(3500);
  }

  report.networkAfterProfileClick = [...authCalls];
  report.steps.afterProfileClick = {
    url: page.url(),
    hasDashboard: (await page.locator("#tai-khoan-ctv-content").count()) > 0,
    hasLoginButton: (await page.getByRole("button", { name: "Đăng nhập" }).count()) > 0,
  };
  report.steps.afterProfileClickSnapshot = await snapshot(request);

  const sessionLeaked = Boolean(report.steps.afterSignOutSnapshot?.hasServerSession);
  const signInCalled = report.networkAfterProfileClick.some((r) =>
    r.url.includes("/api/auth/callback/customer-credentials"),
  );
  const autoDashboard =
    report.steps.afterProfileClick?.hasDashboard &&
    !report.steps.onAuthAfterLogout?.hasDashboard;

  if (sessionLeaked) {
    report.verdict = {
      hypothesis: "A",
      summary: "Sau signOut UI, session-snapshot vẫn thấy server session.",
    };
  } else if (signInCalled || autoDashboard) {
    report.verdict = {
      hypothesis: "B",
      summary:
        "signOut đã xóa session-token; chọn profile đã lưu kích hoạt signIn hoặc vào dashboard mà không cần bấm Đăng nhập.",
    };
  } else {
    report.verdict = {
      hypothesis: "B-negative",
      summary:
        "signOut sạch; chọn profile chỉ đổi form, không gọi callback credentials (không tái hiện auto-login trong run này).",
    };
  }

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "browser-report.json");
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nBrowser report: ${outPath}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
