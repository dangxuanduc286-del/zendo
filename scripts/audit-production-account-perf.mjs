/**
 * Đo hiệu năng production (npm run start) — không sửa app.
 * node scripts/audit-production-account-perf.mjs
 *
 * Env: PERF_BASE (default http://127.0.0.1:3001), PERF_IDENT, PERF_PASS
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, "..", ".artifacts", "production-account-perf");
const BASE = process.env.PERF_BASE ?? "http://127.0.0.1:3001";
const IDENT = process.env.PERF_IDENT ?? "isolation-ctv@test.local";
const PASS = process.env.PERF_PASS ?? "Customer@123";
const SETTLE_MS = Number(process.env.PERF_SETTLE_MS ?? 6000);

const ROUTES = [
  { label: "/tai-khoan", path: "/tai-khoan" },
  { label: "/tai-khoan?tab=affiliate", path: "/tai-khoan?tab=affiliate" },
  { label: "/tai-khoan/affiliate/analytics", path: "/tai-khoan/affiliate/analytics" },
  { label: "/tai-khoan/affiliate/campaign", path: "/tai-khoan/affiliate/campaign" },
  { label: "/tai-khoan/affiliate/attribution", path: "/tai-khoan/affiliate/attribution" },
];

async function login(ctx) {
  const { csrfToken } = await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json();
  return (
    await ctx.request.post(`${BASE}/api/auth/callback/customer-credentials`, {
      form: {
        csrfToken,
        identifier: IDENT,
        password: PASS,
        callbackUrl: `${BASE}/tai-khoan`,
        json: "true",
      },
    })
  ).ok();
}

function isRscResponse(res) {
  const ct = (res.contentType || "").toLowerCase();
  const url = res.url;
  return (
    ct.includes("text/x-component") ||
    url.includes("_rsc=") ||
    url.includes("__rsc") ||
    res.headers?.["rsc"] === "1" ||
    res.headers?.["next-router-state-tree"] != null
  );
}

function isApiUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function kb(n) {
  return Math.round((n / 1024) * 100) / 100;
}

async function measureRoute(browser, route) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: "vi-VN",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

  const requests = [];
  const t0 = Date.now();
  const cdpTimings = new Map();

  cdp.on("Network.requestWillBeSent", (e) => {
    cdpTimings.set(e.requestId, { url: e.request.url, startMs: Date.now() - t0 });
  });
  cdp.on("Network.responseReceived", (e) => {
    const row = cdpTimings.get(e.requestId);
    if (row) row.responseMs = Date.now() - t0;
  });
  cdp.on("Network.loadingFinished", (e) => {
    const row = cdpTimings.get(e.requestId);
    if (row) row.endMs = Date.now() - t0;
  });

  page.on("response", async (response) => {
    const req = response.request();
    const timing = req.timing();
    const start = timing.startTime;
    const end = start + timing.responseEnd;
    const durationMs = timing.responseEnd > 0 ? Math.round(timing.responseEnd) : null;
    let size = 0;
    try {
      const headers = response.headers();
      const cl = headers["content-length"];
      if (cl) size = Number(cl);
      else {
        const body = await response.body().catch(() => null);
        if (body) size = body.length;
      }
    } catch {
      /* ignore */
    }
    requests.push({
      url: response.url(),
      method: req.method(),
      status: response.status(),
      resourceType: req.resourceType(),
      contentType: response.headers()["content-type"] ?? "",
      sizeBytes: size,
      durationMs,
      startOffsetMs: Math.round(start),
      endOffsetMs: end != null ? Math.round(end) : null,
      isApi: isApiUrl(response.url()),
      isRsc:
        isRscResponse({
          url: response.url(),
          contentType: response.headers()["content-type"] ?? "",
          headers: response.headers(),
        }) || req.resourceType() === "fetch" && response.url().includes("?_rsc"),
    });
  });

  const navStart = Date.now();
  let navError = null;
  try {
    await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  } catch (e) {
    navError = String(e?.message || e);
  }
  await page.waitForTimeout(SETTLE_MS);

  const finalUrl = page.url();
  const affiliateSubpageLoaded = await page
    .locator("#tai-khoan-affiliate-subpage-content")
    .isVisible()
    .catch(() => false);

  for (const row of requests) {
    for (const [, cdpRow] of cdpTimings) {
      if (cdpRow.url === row.url && cdpRow.startMs != null && cdpRow.endMs != null) {
        row.durationMs = Math.round(cdpRow.endMs - cdpRow.startMs);
        row.ttfbMs = cdpRow.responseMs != null ? Math.round(cdpRow.responseMs - cdpRow.startMs) : null;
        row.startOffsetMs = Math.round(cdpRow.startMs);
        break;
      }
    }
  }

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(performance.getEntriesByType("paint").map((p) => [p.name, Math.round(p.startTime)]));
    const measures = performance
      .getEntriesByType("measure")
      .filter((m) => /next|hydrat|react/i.test(m.name))
      .map((m) => ({ name: m.name, durationMs: Math.round(m.duration), startMs: Math.round(m.startTime) }));
    const longTasks = performance
      .getEntriesByType("longtask")
      .map((t) => ({
        durationMs: Math.round(t.duration),
        startMs: Math.round(t.startTime),
        attribution: (t.attribution || []).map((a) => a.containerSrc || a.containerName || a.name).filter(Boolean),
      }));
    const resources = performance
      .getEntriesByType("resource")
      .filter((r) => r.initiatorType === "script" || r.initiatorType === "link")
      .map((r) => ({
        name: r.name.split("/").pop()?.slice(0, 80) || r.name,
        durationMs: Math.round(r.duration),
        transferKb: Math.round((r.transferSize || 0) / 1024 * 100) / 100,
        url: r.name,
      }))
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 15);

    const hydrationMeasures = measures.filter((m) => /hydrat/i.test(m.name));

    return {
      navigation: nav
        ? {
            ttfbMs: Math.round(nav.responseStart - nav.requestStart),
            dnsMs: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
            connectMs: Math.round(nav.connectEnd - nav.connectStart),
            domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
            loadEventMs: Math.round(nav.loadEventEnd - nav.startTime),
            transferSizeKb: Math.round(((nav.transferSize || 0) / 1024) * 100) / 100,
            encodedBodySizeKb: Math.round(((nav.encodedBodySize || 0) / 1024) * 100) / 100,
          }
        : null,
      paints,
      nextMeasures: measures,
      hydrationMeasureMs: hydrationMeasures.length
        ? hydrationMeasures.reduce((s, m) => s + m.durationMs, 0)
        : null,
      longTasks,
      longTaskTotalMs: longTasks.reduce((s, t) => s + t.durationMs, 0),
      scriptResourcesTop: resources,
    };
  });

  const totalMs = Date.now() - t0;
  const docReq = requests.find((r) => r.resourceType === "document" || r.url === `${BASE}${route.path}` || r.url.startsWith(`${BASE}${route.path}`));
  const sortedByDuration = [...requests].filter((r) => r.durationMs != null).sort((a, b) => b.durationMs - a.durationMs);
  const apis = requests.filter((r) => r.isApi).sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0));
  const sortedBySize = [...requests].sort((a, b) => b.sizeBytes - a.sizeBytes);
  const rscReqs = requests.filter((r) => r.isRsc).sort((a, b) => b.sizeBytes - a.sizeBytes);

  await context.close();

  return {
    route: route.label,
    path: route.path,
    finalUrl,
    affiliateSubpageLoaded,
    navError,
    wallClockMs: totalMs,
    navigationMs: Date.now() - navStart,
    perf,
    documentRequest: docReq ?? null,
    ttfbMs: perf.navigation?.ttfbMs ?? docReq?.durationMs ?? null,
    slowestRequests: sortedByDuration.slice(0, 20),
    slowestApis: apis.slice(0, 25),
    largestRequests: sortedBySize.slice(0, 15),
    largestRsc: rscReqs.slice(0, 10),
    requestCount: requests.length,
    apiCount: apis.length,
    waterfall: requests
      .filter((r) => r.startOffsetMs != null)
      .sort((a, b) => a.startOffsetMs - b.startOffsetMs)
      .map((r) => ({
        startMs: r.startOffsetMs,
        durationMs: r.durationMs,
        sizeKb: kb(r.sizeBytes),
        url: r.url.replace(BASE, ""),
        type: r.resourceType,
        api: r.isApi,
        rsc: r.isRsc,
      })),
  };
}

function rankBottlenecks(allRoutes) {
  const items = [];
  for (const r of allRoutes) {
    if (r.ttfbMs != null) {
      items.push({
        kind: "TTFB (document/navigation)",
        route: r.route,
        target: r.path,
        ms: r.ttfbMs,
      });
    }
    for (const api of r.slowestApis.slice(0, 5)) {
      items.push({
        kind: "API",
        route: r.route,
        target: api.url.replace(BASE, ""),
        ms: api.durationMs ?? 0,
      });
    }
    for (const req of r.largestRequests.slice(0, 3)) {
      if (req.sizeBytes > 50_000) {
        items.push({
          kind: "Transfer size",
          route: r.route,
          target: req.url.replace(BASE, ""),
          ms: req.sizeBytes,
          unit: "bytes",
        });
      }
    }
    if (r.perf.longTaskTotalMs > 50) {
      items.push({
        kind: "Main-thread long tasks",
        route: r.route,
        target: "longtask sum",
        ms: r.perf.longTaskTotalMs,
      });
    }
    const topScript = r.perf.scriptResourcesTop?.[0];
    if (topScript?.durationMs > 100) {
      items.push({
        kind: "Script resource",
        route: r.route,
        target: topScript.url,
        ms: topScript.durationMs,
      });
    }
  }
  return items
    .sort((a, b) => {
      const am = a.unit === "bytes" ? a.ms / 1000 : a.ms;
      const bm = b.unit === "bytes" ? b.ms / 1000 : b.ms;
      return bm - am;
    })
    .slice(0, 10);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const loginCtx = await browser.newContext();
  if (!(await login(loginCtx))) {
    console.error(`Login failed for ${IDENT} at ${BASE}`);
    process.exit(1);
  }
  await loginCtx.close();

  const results = [];
  for (const route of ROUTES) {
    console.log(`Measuring ${route.label}...`);
    results.push(await measureRoute(browser, route));
  }
  await browser.close();

  const bottlenecks = rankBottlenecks(results);
  const report = {
    capturedAt: new Date().toISOString(),
    mode: "production",
    base: BASE,
    settleMs: SETTLE_MS,
    viewport: "1366x900",
    cache: "disabled (CDP)",
    routes: results,
    top10Bottlenecks: bottlenecks,
  };

  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
