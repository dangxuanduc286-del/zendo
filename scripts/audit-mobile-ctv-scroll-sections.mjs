/**
 * Scroll overview sections on mobile — audit only.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const IDENT = "isolation-ctv@test.local";
const PASS = "Customer@123";
const VPs = [
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
];

async function login(ctx) {
  const { csrfToken } = await (await ctx.request.get(`${BASE}/api/auth/csrf`)).json();
  return (
    await ctx.request.post(`${BASE}/api/auth/callback/customer-credentials`, {
      form: {
        csrfToken,
        identifier: IDENT,
        password: PASS,
        callbackUrl: `${BASE}/tai-khoan?tab=overview`,
        json: "true",
      },
    })
  ).ok();
}

async function auditSection(page, id, component) {
  const el = await page.$(`#${id}`);
  if (!el) return [{ component, issue: `Không tìm thấy #${id} trên trang`, severity: "Low" }];
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  return page.evaluate(
    ({ id, component }) => {
      const issues = [];
      const vw = document.documentElement.clientWidth;
      const doc = document.documentElement.scrollWidth - vw;
      if (doc > 2) {
        issues.push({
          component: "Page (overview)",
          issue: `Overflow ngang ${Math.round(doc)}px khi xem ${component}`,
          severity: doc > 12 ? "High" : "Medium",
        });
      }
      const heading = document.getElementById(id);
      const sec = heading?.closest("section") ?? heading?.parentElement;
      if (!sec) return issues;
      const sr = sec.getBoundingClientRect();
      if (sr.left < -2 || sr.right > vw + 2) {
        issues.push({
          component,
          issue: `Section lệch/vượt viewport (left=${Math.round(sr.left)}, right=${Math.round(sr.right)})`,
          severity: "High",
        });
      }
      sec.querySelectorAll("span, p, strong, dd").forEach((node) => {
        const cs = getComputedStyle(node);
        if (!/(tabular-nums|font-bold)/.test(cs.fontWeight + node.className) && !node.className.includes("tabular")) {
          const t = (node.textContent || "").trim();
          if (!/₫|%|\d/.test(t) || t.length < 4) return;
        }
        const t = (node.textContent || "").trim();
        if (!t || t.length < 3) return;
        const nr = node.getBoundingClientRect();
        const pr = (node.parentElement ?? sec).getBoundingClientRect();
        if (nr.right > pr.right + 3 && /₫|\.|,|\d/.test(t)) {
          issues.push({
            component,
            issue: `Giá trị tràn: «${t.slice(0, 24)}» (+${Math.round(nr.right - pr.right)}px)`,
            severity: nr.right - pr.right > 10 ? "High" : "Medium",
          });
        }
      });
      const row = sec.querySelector("[class*='items-baseline'], [class*='flex-wrap']");
      if (row) {
        const kids = [...row.children].filter((c) => c.getBoundingClientRect().width > 0);
        for (let i = 0; i < kids.length; i++) {
          for (let j = i + 1; j < kids.length; j++) {
            const a = kids[i].getBoundingClientRect();
            const b = kids[j].getBoundingClientRect();
            if (a.right > b.left + 1 && a.top < b.bottom - 2 && a.bottom > b.top + 2) {
              issues.push({
                component,
                issue: "Hai khối số tiền chồng lấn trên cùng hàng",
                severity: "High",
              });
              break;
            }
          }
        }
      }
      const icon = sec.querySelector("svg");
      const bigNum = sec.querySelector("[class*='tabular-nums']");
      if (icon && bigNum) {
        const ir = icon.getBoundingClientRect();
        const vr = bigNum.getBoundingClientRect();
        if (ir.right > vr.left + 4 && ir.top < vr.bottom && ir.bottom > vr.top) {
          issues.push({ component, issue: "Icon chồng vùng số liệu", severity: "Medium" });
        }
      }
      return issues;
    },
    { id, component },
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ isMobile: true, hasTouch: true });
  if (!(await login(ctx))) process.exit(1);
  const page = await ctx.newPage();
  const all = [];

  const sections = [
    ["ctv-member-rank-heading", "Cấp bậc thành viên CTV"],
    ["ctv-wallet-heading", "Hoa hồng khả dụng"],
    ["ctv-tier-progress-heading", "Tiến độ cấp bậc"],
    ["ctv-performance-heading", "Hiệu suất (KPI)"],
  ];

  for (const vp of VPs) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE}/tai-khoan?tab=overview`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(5000);
    for (const [id, comp] of sections) {
      const found = await auditSection(page, id, comp);
      for (const f of found) all.push({ ...f, viewport: vp.name });
    }
    // Segmented on affiliate mobile
    await page.goto(`${BASE}/tai-khoan?tab=affiliate&sub=links`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(3000);
    const tabIssues = await page.evaluate(({ vpName }) => {
      const issues = [];
      const vw = document.documentElement.clientWidth;
      const nav = document.querySelector("nav") ?? document.querySelector("[role='tablist']");
      const scrollers = [...document.querySelectorAll("*")].filter((el) => {
        const cs = getComputedStyle(el);
        return (cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 8;
      });
      scrollers.slice(0, 3).forEach((el) => {
        issues.push({
          component: "Thanh tab CTV",
          issue: `Vùng scroll ngang ${el.scrollWidth - el.clientWidth}px (cần vuốt)`,
          severity: "Low",
        });
      });
      const tabs = [...document.querySelectorAll("button, a")].filter((b) =>
        /Trung tâm|Tạo link|Đơn|Hoa hồng|Thống kê/i.test(b.textContent || ""),
      );
      const cut = tabs.filter((b) => {
        const r = b.getBoundingClientRect();
        return r.right > vw + 1 || r.width < 20;
      });
      if (cut.length) {
        issues.push({
          component: "Thanh tab CTV",
          issue: `${cut.length} tab bị cắt / ngoài viewport`,
          severity: "Medium",
        });
      }
      return issues;
    }, { vpName: vp.name });
    for (const f of tabIssues) all.push({ ...f, viewport: vp.name });
  }

  await browser.close();
  const seen = new Set();
  for (const row of all) {
    const k = `${row.component}|${row.issue}|${row.viewport}`;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`| ${row.component} | ${row.issue} [${row.viewport}] | ${row.severity} |`);
  }
}

main();
