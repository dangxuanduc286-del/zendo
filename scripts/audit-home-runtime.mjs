import { chromium } from "playwright";

const BASE = process.env.HOME_AUDIT_BASE ?? "http://127.0.0.1:3000";
const VIEWPORT_WIDTH = Number(process.env.HOME_AUDIT_WIDTH ?? 1440);
const VIEWPORT_HEIGHT = Number(process.env.HOME_AUDIT_HEIGHT ?? 1400);
const HEADLESS = (process.env.HOME_AUDIT_HEADLESS ?? "true") !== "false";

function kb(bytes) {
  return Math.round((bytes / 1024) * 100) / 100;
}

function pickHeader(headers, name) {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : null;
}

async function main() {
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const imageRequests = [];
  const blockedResources = [];

  page.on("requestfinished", async (request) => {
    const url = request.url();
    const type = request.resourceType();
    if (type !== "image" && !url.includes("_next/image") && !url.includes("media.zendo.vn") && !url.includes("image")) {
      return;
    }

    const response = await request.response();
    if (!response) return;

    const headers = await response.allHeaders().catch(() => ({}));
    const timing = request.timing();
    const bodySize = await response
      .body()
      .then((buf) => buf.length)
      .catch(() => null);

    imageRequests.push({
      url,
      type,
      status: response.status(),
      requestStartMs: Math.round(timing.startTime),
      responseEndMs: Math.round(timing.responseEnd),
      durationMs: timing.responseEnd > 0 ? Math.round(timing.responseEnd) : null,
      transferSizeKb: bodySize == null ? null : kb(bodySize),
      contentType: pickHeader(headers, "content-type"),
      cacheControl: pickHeader(headers, "cache-control"),
      age: pickHeader(headers, "age"),
      etag: pickHeader(headers, "etag"),
      cfCacheStatus: pickHeader(headers, "cf-cache-status"),
      contentLength: pickHeader(headers, "content-length"),
      headers,
    });
  });

  page.on("requestfailed", (request) => {
    blockedResources.push({ url: request.url(), type: request.resourceType(), failure: request.failure()?.errorText ?? null });
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForLoadState("load", { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(8000);

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(performance.getEntriesByType("paint").map((p) => [p.name, Math.round(p.startTime)]));
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    const lcp = lcpEntries.length ? lcpEntries[lcpEntries.length - 1] : null;
    const resourceEntries = performance.getEntriesByType("resource").map((r) => ({
      name: r.name,
      initiatorType: r.initiatorType,
      startTime: Math.round(r.startTime),
      responseEnd: Math.round(r.responseEnd),
      duration: Math.round(r.duration),
      transferSize: r.transferSize || 0,
      encodedBodySize: r.encodedBodySize || 0,
      decodedBodySize: r.decodedBodySize || 0,
    }));
    const longTasks = performance.getEntriesByType("longtask").map((t) => ({
      startTime: Math.round(t.startTime),
      duration: Math.round(t.duration),
    }));
    const kb = (bytes) => Math.round((bytes / 1024) * 100) / 100;
    return {
      navigation: nav
        ? {
            requestStart: Math.round(nav.requestStart),
            responseStart: Math.round(nav.responseStart),
            domContentLoadedEventEnd: Math.round(nav.domContentLoadedEventEnd),
            loadEventEnd: Math.round(nav.loadEventEnd),
            transferSizeKb: kb(nav.transferSize || 0),
            encodedBodySizeKb: kb(nav.encodedBodySize || 0),
          }
        : null,
      paints,
      lcp: lcp
        ? {
            startTime: Math.round(lcp.startTime),
            renderTime: Math.round(lcp.renderTime || 0),
            loadTime: Math.round(lcp.loadTime || 0),
            size: lcp.size,
            element: lcp.element?.outerHTML?.slice(0, 300) ?? null,
          }
        : null,
      resources: resourceEntries,
      longTasks,
      images: Array.from(document.images).map((img) => ({
        src: img.currentSrc || img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        alt: img.alt,
      })),
      heroCandidates: Array.from(document.querySelectorAll("img")).map((img) => ({
        src: img.currentSrc || img.src,
        width: img.getBoundingClientRect().width,
        height: img.getBoundingClientRect().height,
        loading: img.getAttribute("loading"),
        priority: img.getAttribute("fetchpriority"),
        alt: img.alt,
      })),
    };
  });

  const relevantImages = imageRequests
    .filter((r) => r.url.includes("_next/image") || r.url.includes("media.zendo.vn") || r.type === "image")
    .sort((a, b) => a.requestStartMs - b.requestStartMs);

  console.log(JSON.stringify({ perf, imageRequests: relevantImages, blockedResources }, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
