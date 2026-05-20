import { chromium } from "playwright";

const base = "http://localhost:3000";
const IDENT = "isolation-ctv@test.local";
const PASS = "Customer@123";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${base}/tai-khoan`, { waitUntil: "networkidle" });
const loginTab = page.getByRole("button", { name: /đăng nhập/i }).first();
if ((await loginTab.count()) > 0) await loginTab.click();
await page.locator('input[placeholder*="email"], input[placeholder*="điện thoại"]').first().fill(IDENT);
await page.locator('input[type="password"]').first().fill(PASS);
await page.locator('form button[type="submit"]').first().click();
await page.waitForTimeout(8000);
const text = await page.locator("body").innerText();
console.log("URL:", page.url());
console.log("HAS_CTV:", text.includes("Trung tâm CTV"));
console.log("HAS_AUTH:", text.includes("Đăng nhập") || text.includes("đăng nhập"));
console.log("SNIP:", text.slice(0, 500));
await browser.close();
