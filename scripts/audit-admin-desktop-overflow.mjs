import { chromium } from 'playwright';

const BASE = process.env.ADMIN_AUDIT_BASE ?? 'http://localhost:3000';
const url = process.argv[2] ?? `${BASE}/admin/products/new`;
const IDENT = process.env.ADMIN_AUDIT_IDENT ?? '0564162222';
const PASS = process.env.ADMIN_AUDIT_PASS ?? 'duc120897';

const requiredTexts = ['Lưu sản phẩm', 'Lưu và xem ngoài web', 'Hủy'];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const request = context.request;
const csrfToken = (await (await request.get(`${BASE}/api/auth/csrf`)).json()).csrfToken;
const loginRes = await request.post(`${BASE}/api/auth/callback/admin-credentials`, {
  form: {
    csrfToken,
    identifier: IDENT,
    password: PASS,
    callbackUrl: `${BASE}/admin/products/new`,
    json: 'true',
  },
});
if (!loginRes.ok()) {
  throw new Error(`Admin login failed: ${loginRes.status()}`);
}

const page = await context.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);

const pathname = new URL(page.url()).pathname;
if (pathname !== '/admin/products/new') {
  throw new Error(`Đang ở sai trang: ${pathname}`);
}

for (const text of requiredTexts) {
  await page.getByText(text, { exact: true }).first().waitFor({ state: 'visible', timeout: 15000 });
}

const result = await page.evaluate(() => {
  const html = document.documentElement;
  const body = document.body;
  const allElements = Array.from(document.querySelectorAll('*')).map((el, index) => {
    const rect = el.getBoundingClientRect();
    return {
      index,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: el.className || null,
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120) || null,
      bottom: rect.bottom,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      offsetHeight: el.offsetHeight,
      overflow: getComputedStyle(el).overflow,
      overflowY: getComputedStyle(el).overflowY,
    };
  });

  const top30ByBottom = allElements
    .filter((el) => Number.isFinite(el.bottom))
    .sort((a, b) => b.bottom - a.bottom || b.scrollHeight - a.scrollHeight)
    .slice(0, 30);

  return {
    html: {
      clientHeight: html.clientHeight,
      scrollHeight: html.scrollHeight,
    },
    body: {
      clientHeight: body.clientHeight,
      scrollHeight: body.scrollHeight,
    },
    top30ByBottom,
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
