import { spawn } from "node:child_process";

const BASE = process.env.PRODUCT_CARD_AUDIT_BASE ?? "http://localhost:3000";
const BROWSER =
  process.env.PRODUCT_CARD_AUDIT_BROWSER ??
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = Number(process.env.PRODUCT_CARD_AUDIT_DEBUG_PORT ?? 9231);
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
];
const ROUTES = [
  { key: "home", path: "/", selector: "#featured-products-heading" },
  { key: "category", path: "/danh-muc/dien-tu", selector: null },
  { key: "shop", path: "/cua-hang", selector: null },
  ...(process.env.PRODUCT_CARD_AUDIT_RELATED_PATH
    ? [{ key: "related", path: process.env.PRODUCT_CARD_AUDIT_RELATED_PATH, selector: "__related_products__" }]
    : []),
];

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
  let lastValue = null;
  for (let i = 0; i < 80; i += 1) {
    const result = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    lastValue = result.result?.value;
    if (lastValue) return;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${expression}. Last value: ${JSON.stringify(lastValue)}`);
}

function measurementExpression(routeKey, viewportName, selector) {
  return `(() => {
    const roundRect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
      };
    };
    const sectionFromHeading = ${selector === "__related_products__"
      ? `Array.from(document.querySelectorAll("section")).find((section) => section.textContent?.includes("Sản phẩm lien quan"))`
      : selector ? `document.querySelector(${JSON.stringify(selector)})?.closest("section")` : "null"};
    const scope = sectionFromHeading || document;
    const card = scope.querySelector("article.group");
    const image = card?.querySelector("a.relative.block");
    const title = card?.querySelector("h3");
    const price = card?.querySelector("div.flex.flex-wrap.items-end span");
    const cta = card?.querySelector("[data-product-card-cta='true']");
    const grid = card?.parentElement || null;
    const styleOf = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        borderRadius: s.borderRadius,
        padding: s.padding,
        gap: s.gap,
        boxShadow: s.boxShadow,
      };
    };
    return {
      route: ${JSON.stringify(routeKey)},
      viewport: ${JSON.stringify(viewportName)},
      url: location.href,
      doc: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      },
      grid: roundRect(grid),
      gridTemplateColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      card: roundRect(card),
      image: roundRect(image),
      title: roundRect(title),
      price: roundRect(price),
      cta: roundRect(cta),
      cardStyle: styleOf(card),
      imageStyle: styleOf(image),
      titleStyle: styleOf(title),
      priceStyle: styleOf(price),
      ctaStyle: styleOf(cta),
      articleCount: scope.querySelectorAll("article.group").length,
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
      runId: process.env.PRODUCT_CARD_RUN_ID ?? "product-card-parity",
      hypothesisId: "H1,H2,H3,H4",
      location: "scripts/audit-product-card-parity.mjs",
      message: "Product card rendered parity metrics",
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
    `--user-data-dir=${process.cwd()}\\.artifacts\\product-card-cdp-profile`,
    "about:blank",
  ], { stdio: "ignore" });

  await waitForJsonVersion();
  const rows = [];
  let target;
  let cdp;
  try {
    target = await createPageTarget("about:blank");
    cdp = createCdpClient(target.webSocketDebuggerUrl);
    await cdp.opened;
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    for (const viewport of VIEWPORTS) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.mobile,
      });
      for (const route of ROUTES) {
        await cdp.send("Page.navigate", { url: `${BASE}${route.path}` });
        await waitForExpression(cdp, "document.readyState !== 'loading' && Boolean(document.querySelector('article.group'))");
        await sleep(800);
        const measured = await cdp.send("Runtime.evaluate", {
          expression: measurementExpression(route.key, viewport.name, route.selector),
          returnByValue: true,
          awaitPromise: true,
        });
        rows.push(measured.result.value);
        await sendMeasurementLog(measured.result.value);
      }
    }
  } finally {
    if (target) await closePageTarget(target.id);
    if (cdp) cdp.close();
    browser.kill();
  }

  console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
