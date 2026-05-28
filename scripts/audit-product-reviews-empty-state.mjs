import { spawn } from "node:child_process";

const BASE = process.env.REVIEW_AUDIT_BASE ?? "http://localhost:3000";
const BROWSER =
  process.env.REVIEW_AUDIT_BROWSER ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = Number(process.env.REVIEW_AUDIT_DEBUG_PORT ?? 9232);
const PRODUCT_PATH =
  process.env.REVIEW_AUDIT_PRODUCT_PATH ??
  "/san-pham/may-chieu-westinghouse-wi-fi-home-theater-chieu-truc-tiep-tu-t-loa-kep-giai-tri-a-phuong-tien";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJsonVersion() {
  const url = `http://127.0.0.1:${DEBUG_PORT}/json/version`;
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Browser is still starting.
    }
    await sleep(250);
  }
  throw new Error("Chromium DevTools endpoint did not become ready.");
}

async function createPageTarget(url) {
  const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`Failed to create target: ${response.status}`);
  return response.json();
}

async function closePageTarget(id) {
  await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${id}`).catch(() => {});
}

function createCdpClient(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result ?? {});
    }
  });

  return {
    opened: new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    }),
    close: () => ws.close(),
    send(method, params = {}) {
      id += 1;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
  };
}

async function waitForExpression(cdp, expression) {
  for (let i = 0; i < 80; i += 1) {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.result?.value) return;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

function measurementExpression(viewportName) {
  return `(() => {
    const reviewSection = Array.from(document.querySelectorAll("section"))
      .find((section) => section.querySelector("h2")?.textContent?.includes("Nhận xét"));
    const ratingSummary = reviewSection?.querySelector(".grid.grid-cols-1.gap-4") || null;
    const distributionRows = Array.from(reviewSection?.querySelectorAll(".grid.grid-cols-\\\\[40px_1fr_48px\\\\]") || []);
    const emptyCard = Array.from(reviewSection?.children || [])
      .find((child) => child.textContent?.includes("chưa có") || child.textContent?.includes("Chưa có"));
    const topMeta = Array.from(document.querySelectorAll("article section header div span"))
      .map((node) => node.textContent?.trim() || "")
      .find((text) => text.includes("đánh giá") || text.includes("danh gia")) || "";
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left) };
    };
    return {
      viewport: ${JSON.stringify(viewportName)},
      url: location.href,
      reviewSection: rect(reviewSection),
      ratingSummary: rect(ratingSummary),
      emptyCard: rect(emptyCard),
      topMetaText: topMeta,
      reviewSectionText: reviewSection?.innerText || "",
      hasZeroAverageInPanel: Boolean(reviewSection?.innerText.includes("0.0")),
      hasZeroAverageInTopMeta: topMeta.includes("0.0"),
      distributionRowCount: distributionRows.length,
      doc: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      },
    };
  })()`;
}

async function sendMeasurementLog(data) {
  // #region agent log
  await fetch("http://127.0.0.1:7654/ingest/82606ee0-71b9-4847-888d-ebf0b793b9d3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "00d8fe" },
    body: JSON.stringify({
      sessionId: "00d8fe",
      runId: process.env.REVIEW_AUDIT_RUN_ID ?? "product-review-empty-state",
      hypothesisId: "R1,R2,R3,R4",
      location: "scripts/audit-product-reviews-empty-state.mjs",
      message: "Product review empty-state runtime metrics",
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

async function main() {
  const browser = spawn(BROWSER, [
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${process.cwd()}\\.artifacts\\product-review-cdp-profile`,
    "about:blank",
  ], { stdio: "ignore" });

  await waitForJsonVersion();
  const target = await createPageTarget("about:blank");
  const cdp = createCdpClient(target.webSocketDebuggerUrl);
  const rows = [];
  try {
    await cdp.opened;
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    for (const viewport of [
      { name: "desktop", width: 1440, height: 1200, mobile: false },
      { name: "tablet", width: 768, height: 1024, mobile: true },
      { name: "mobile", width: 390, height: 844, mobile: true },
    ]) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      });
      await cdp.send("Page.navigate", { url: `${BASE}${PRODUCT_PATH}` });
      await waitForExpression(cdp, "document.readyState !== 'loading' && Boolean(document.querySelector('section h2'))");
      await sleep(800);
      const measured = await cdp.send("Runtime.evaluate", {
        expression: measurementExpression(viewport.name),
        returnByValue: true,
        awaitPromise: true,
      });
      rows.push(measured.result.value);
      await sendMeasurementLog(measured.result.value);
    }
  } finally {
    await closePageTarget(target.id);
    cdp.close();
    browser.kill();
  }
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
