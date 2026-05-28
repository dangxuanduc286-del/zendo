/**
 * Runtime audit: login → signOut → cookies + getServerSession proxy + /tai-khoan HTML.
 *
 * node scripts/audit-signout-runtime.mjs
 * CTV_SCROLL_BASE=http://localhost:3000 (optional)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.CTV_SCROLL_BASE ?? process.env.AUTH_AUDIT_BASE ?? "http://localhost:3000";
const IDENT = process.env.AUTH_AUDIT_IDENT ?? "nguyen.anh@example.com";
const PASS = process.env.AUTH_AUDIT_PASS ?? "Customer@123";
const OUT_DIR = path.join(ROOT, "..", ".artifacts", "signout-runtime-audit");

const TRACKED = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
];

function parseSetCookieHeaders(headers) {
  const raw =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [];
  const entries = [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const cleared =
      /Max-Age=0/i.test(line) ||
      /expires=Thu, 01 Jan 1970/i.test(line) ||
      value === "" ||
      value === '""';
    entries.push({ name, value: value.slice(0, 24), cleared, raw: line.slice(0, 120) });
  }
  return entries;
}

class CookieJar {
  #map = new Map();

  ingest(response) {
    const lines =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    for (const line of lines) {
      const [pair] = line.split(";");
      const eq = pair.indexOf("=");
      if (eq < 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const cleared =
        /Max-Age=0/i.test(line) ||
        /expires=Thu, 01 Jan 1970/i.test(line) ||
        value === "" ||
        value === '""';
      if (cleared) this.#map.delete(name);
      else this.#map.set(name, value);
    }
  }

  header() {
    return [...this.#map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  presentNames() {
    return [...this.#map.keys()].sort();
  }

  trackedStatus() {
    const names = this.presentNames();
    const status = Object.fromEntries(TRACKED.map((n) => [n, names.includes(n)]));
    const chunks = names.filter(
      (n) =>
        n.startsWith("next-auth.session-token.") ||
        n.startsWith("__Secure-next-auth.session-token."),
    );
    return { status, chunks, all: names };
  }
}

async function fetchJson(jar, url, init = {}) {
  const headers = new Headers(init.headers ?? {});
  const cookie = jar.header();
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(url, { ...init, headers, redirect: "manual" });
  jar.ingest(res);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  return { res, json, text };
}

async function getCsrf(jar) {
  const { json } = await fetchJson(jar, `${BASE}/api/auth/csrf`);
  return json?.csrfToken ?? null;
}

async function loginCustomer(jar) {
  const csrfToken = await getCsrf(jar);
  const headers = new Headers({ "Content-Type": "application/x-www-form-urlencoded" });
  const cookie = jar.header();
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(`${BASE}/api/auth/callback/customer-credentials`, {
    method: "POST",
    headers,
    body: new URLSearchParams({
      csrfToken,
      identifier: IDENT,
      password: PASS,
      callbackUrl: `${BASE}/tai-khoan`,
      json: "true",
    }),
    redirect: "follow",
  });
  jar.ingest(res);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  const hasSessionCookie = jar.presentNames().some((n) => n.includes("session-token"));
  return {
    ok: hasSessionCookie && Boolean(json?.url?.includes("/tai-khoan")),
    status: res.status,
    json,
    hasSessionCookie,
  };
}

async function clientSession(jar) {
  const { json } = await fetchJson(jar, `${BASE}/api/auth/session`);
  return json;
}

async function serverSnapshot(jar) {
  const { json, res } = await fetchJson(jar, `${BASE}/api/auth/session-snapshot`);
  return { status: res.status, json };
}

async function signOut(jar, { redirectUrl = `${BASE}/` } = {}) {
  const csrfToken = await getCsrf(jar);
  const { res, json, text } = await fetchJson(jar, `${BASE}/api/auth/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl: redirectUrl,
      json: "true",
    }),
  });
  return {
    status: res.status,
    json,
    setCookies: parseSetCookieHeaders(res.headers),
    text: text.slice(0, 300),
  };
}

function classifyTaiKhoanHtml(html) {
  const hasSavedPicker = html.includes("Tài khoản đã lưu");
  const hasAuthHeading =
    html.includes("Đăng nhập") && html.includes("customer-auth") === false
      ? html.includes("Đăng nhập tài khoản") || html.includes("Đăng nhập")
      : html.includes("Đăng nhập");
  const hasDashboard =
    html.includes("data-account-page-header") ||
    html.includes("id=\"tai-khoan-ctv-content\"") ||
    html.includes("CustomerAccountDashboard");
  return { hasSavedPicker, hasAuthHeading, hasDashboard };
}

async function fetchTaiKhoan(jar) {
  const headers = new Headers();
  const cookie = jar.header();
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(`${BASE}/tai-khoan`, { headers, redirect: "follow" });
  jar.ingest(res);
  const html = await res.text();
  return { status: res.status, ...classifyTaiKhoanHtml(html), url: res.url };
}

function verdict(report) {
  const after = report.phases.afterSignOut;
  const tracked = after.jar?.status ?? {};
  const sessionRemains =
    after.clientSession?.user?.id ||
    after.serverSnapshot?.hasServerSession ||
    tracked["next-auth.session-token"] ||
    tracked["__Secure-next-auth.session-token"] ||
    (after.jar?.chunks?.length ?? 0) > 0;

  if (sessionRemains) {
    return {
      hypothesis: "A",
      summary:
        "signOut POST không xóa sạch session cookie hoặc getServerSession vẫn thấy user ngay sau signOut.",
    };
  }
  if (after.taiKhoan.hasDashboard) {
    return {
      hypothesis: "A",
      summary: "Cookie/session đã clear nhưng /tai-khoan SSR vẫn render dashboard — kiểm tra cache hoặc cookie jar script.",
    };
  }
  return {
    hypothesis: "B",
    summary:
      "signOut xóa session thành công (HTTP). Nếu UI vẫn auto-login khi chọn tài khoản đã lưu → luồng signIn khác (client), không phải cookie còn sau signOut.",
  };
}

async function main() {
  const jar = new CookieJar();
  const report = {
    base: BASE,
    ident: IDENT,
    at: new Date().toISOString(),
    phases: {},
  };

  console.log(`[signout-audit] BASE=${BASE}`);

  const login = await loginCustomer(jar);
  report.phases.afterLogin = {
    login,
    jar: jar.trackedStatus(),
    clientSession: await clientSession(jar),
    serverSnapshot: (await serverSnapshot(jar)).json,
    taiKhoan: await fetchTaiKhoan(jar),
  };

  const signout = await signOut(jar, { redirectUrl: `${BASE}/` });
  report.phases.signOutResponse = signout;

  report.phases.afterSignOut = {
    jar: jar.trackedStatus(),
    clientSession: await clientSession(jar),
    serverSnapshot: (await serverSnapshot(jar)).json,
    taiKhoan: await fetchTaiKhoan(jar),
  };

  report.verdict = verdict(report);

  await mkdir(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "report.json");
  await writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== AFTER LOGIN ===");
  console.log("cookies:", report.phases.afterLogin.jar);
  console.log("client /api/auth/session user:", report.phases.afterLogin.clientSession?.user?.id ?? null);
  console.log("server snapshot:", report.phases.afterLogin.serverSnapshot);

  console.log("\n=== SIGNOUT Set-Cookie ===");
  for (const c of signout.setCookies) {
    console.log(`  ${c.name}: cleared=${c.cleared}`);
  }

  console.log("\n=== AFTER SIGNOUT ===");
  console.log("cookies:", report.phases.afterSignOut.jar);
  console.log("client /api/auth/session:", report.phases.afterSignOut.clientSession);
  console.log("server snapshot:", report.phases.afterSignOut.serverSnapshot);
  console.log("/tai-khoan:", report.phases.afterSignOut.taiKhoan);

  console.log("\n=== VERDICT ===");
  console.log(`Hypothesis ${report.verdict.hypothesis}: ${report.verdict.summary}`);
  console.log(`Report: ${outPath}`);

  if (!report.phases.afterLogin.login?.hasSessionCookie) {
    console.error("\n[signout-audit] LOGIN FAILED — no next-auth.session-token after login.");
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
