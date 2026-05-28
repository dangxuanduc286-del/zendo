/**
 * Mobile audit — CTV / Account (read-only).
 * node scripts/audit-mobile-ctv-account.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.CTV_AUDIT_BASE ?? "http://localhost:3000";
const IDENT = "isolation-ctv@test.local";
const PASS = "Customer@123";

const VIEWPORTS = [
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
];

const ROUTES = [
  { component: "Tổng quan CTV (overview)", path: "/tai-khoan?tab=overview", root: "#tai-khoan-ctv-content" },
  { component: "Thanh tab CTV / Affiliate", path: "/tai-khoan?tab=affiliate&sub=links", root: "#tai-khoan-ctv-content" },
  { component: "Attribution", path: "/tai-khoan/affiliate/attribution", root: "#tai-khoan-affiliate-subpage-content" },
  { component: "Analytics", path: "/tai-khoan/affiliate/analytics", root: "#tai-khoan-affiliate-subpage-content" },
  { component: "Notification", path: "/tai-khoan?tab=notifications", root: "#tai-khoan-ctv-content" },
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

function severityFromPx(px) {
  if (px >= 24) return "High";
  if (px >= 8) return "Medium";
  return "Low";
}

async function auditViewport(page, vp, route, outDir) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(4500);

  const shot = path.join(outDir, `${route.component.replace(/[^\w]+/g, "_")}-${vp.name}.png`);
  await page.screenshot({ path: shot, fullPage: false }).catch(() => {});

  return page.evaluate(
    ({ rootSel, routeComponent }) => {
      const issues = [];
      const root = document.querySelector(rootSel) ?? document.body;
      const vw = document.documentElement.clientWidth;
      const docOverflow = document.documentElement.scrollWidth - vw;

      if (docOverflow > 1) {
        const offenders = [...document.querySelectorAll("*")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > vw + 2;
          })
          .slice(0, 5)
          .map((el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${(el.className || "").toString().slice(0, 40)}`);
        issues.push({
          component: routeComponent,
          issue: `Overflow ngang trang ${Math.round(docOverflow)}px${offenders.length ? ` (${offenders.join(", ")})` : ""}`,
          severity: docOverflow > 16 ? "High" : docOverflow > 4 ? "Medium" : "Low",
        });
      }

      const pushElOverflow = (component, el, parent) => {
        if (!el || !parent) return;
        const er = el.getBoundingClientRect();
        const pr = parent.getBoundingClientRect();
        const over = Math.round(er.right - pr.right);
        if (over > 1) {
          issues.push({
            component,
            issue: `Nội dung tràn card ${over}px (text: ${(el.textContent || "").trim().slice(0, 28)})`,
            severity: over > 12 ? "High" : over > 4 ? "Medium" : "Low",
          });
        }
      };

      // KPI / metric cards
      root.querySelectorAll("article").forEach((card) => {
        const label = card.querySelector("p")?.textContent?.trim()?.slice(0, 24) ?? "KPI card";
        const value =
          card.querySelector("span.tabular-nums") ??
          card.querySelector("[class*='tabular-nums']") ??
          card.querySelector("p.mt-1, p.mt-1\\.5, p.mt-2");
        pushElOverflow(`KPI (${label})`, value, card);
        const icon = card.querySelector("[aria-hidden] svg, .lucide");
        if (icon && value) {
          const ir = icon.getBoundingClientRect();
          const vr = value.getBoundingClientRect();
          if (ir.left < vr.right - 2 && ir.top < vr.bottom && ir.bottom > vr.top) {
            issues.push({
              component: `KPI (${label})`,
              issue: "Icon chồng / sát vùng số liệu",
              severity: "Medium",
            });
          }
        }
      });

      // Cấp bậc thành viên
      const rank = document.getElementById("ctv-member-rank-heading")?.closest("section, article, div");
      if (rank) {
        const rewardRow = rank.querySelector("[class*='REWARD_ROW'], [class*='reward']") ?? rank.querySelector(".flex-nowrap");
        if (rewardRow) {
          const rr = rewardRow.getBoundingClientRect();
          if (rr.width > vw - 8) {
            issues.push({
              component: "Cấp bậc thành viên CTV",
              issue: `Hàng thưởng / footer rộng ${Math.round(rr.width)}px > viewport`,
              severity: rr.width > vw + 20 ? "High" : "Medium",
            });
          }
        }
        rank.querySelectorAll("span.tabular-nums, [class*='tabular-nums']").forEach((el) => {
          pushElOverflow("Cấp bậc thành viên CTV", el, rank);
        });
      }

      // Hoa hồng khả dụng
      const wallet = document.getElementById("ctv-wallet-heading")?.closest("section");
      if (wallet) {
        const row = wallet.querySelector("[class*='WALLET_AMOUNT'], [class*='items-baseline']");
        if (row) {
          const kids = [...row.children];
          for (let i = 0; i < kids.length; i++) {
            for (let j = i + 1; j < kids.length; j++) {
              const a = kids[i].getBoundingClientRect();
              const b = kids[j].getBoundingClientRect();
              if (a.right > b.left + 2 && a.top < b.bottom && a.bottom > b.top) {
                issues.push({
                  component: "Hoa hồng khả dụng",
                  issue: "Số khả dụng và số chờ chồng lấn nhau",
                  severity: "High",
                });
                break;
              }
            }
          }
          const wr = row.getBoundingClientRect();
          if (wr.width > vw - 16) {
            issues.push({
              component: "Hoa hồng khả dụng",
              issue: `Hàng số tiền rộng ${Math.round(wr.width)}px — có thể xuống dòng chật`,
              severity: "Medium",
            });
          }
        }
        wallet.querySelectorAll("span.tabular-nums").forEach((el) => {
          pushElOverflow("Hoa hồng khả dụng", el, wallet);
        });
      }

      // Tiến độ cấp bậc
      const tier = document.getElementById("ctv-tier-progress-heading")?.closest("section");
      if (tier) {
        tier.querySelectorAll("dd, span.tabular-nums").forEach((el) => {
          pushElOverflow("Tiến độ cấp bậc", el, el.closest("div") ?? tier);
        });
      }

      // Thanh tab CTV (segmented)
      const seg =
        root.querySelector("[class*='SEGMENTED'], [class*='segmented']") ??
        root.querySelector("nav[aria-label*='Affiliate'], nav[aria-label*='sub']");
      if (seg) {
        const sr = seg.getBoundingClientRect();
        if (sr.width > vw + 1) {
          issues.push({
            component: "Thanh tab CTV",
            issue: `Thanh tab rộng ${Math.round(sr.width)}px — overflow ngang`,
            severity: "High",
          });
        }
        const btns = [...seg.querySelectorAll("button, a")];
        let prevBottom = null;
        for (const b of btns) {
          const br = b.getBoundingClientRect();
          if (prevBottom != null && Math.abs(br.top - prevBottom) > 4 && br.top > prevBottom + 2) {
            issues.push({
              component: "Thanh tab CTV",
              issue: "Tab xuống nhiều hàng / wrap bất thường",
              severity: "Medium",
            });
            break;
          }
          prevBottom = br.bottom;
        }
      }

      // Badge
      root.querySelectorAll("[class*='rounded-full'][class*='px-'], [class*='badge']").forEach((badge) => {
        const text = (badge.textContent || "").trim();
        if (!text || text.length > 40) return;
        const br = badge.getBoundingClientRect();
        const parent = badge.parentElement;
        if (!parent) return;
        const pr = parent.getBoundingClientRect();
        if (br.right > pr.right + 2 || br.left < pr.left - 2) {
          issues.push({
            component: "Badge / chip",
            issue: `Badge «${text.slice(0, 20)}» tràn container`,
            severity: "Medium",
          });
        }
      });

      // Buttons full-width stack
      root.querySelectorAll("button, a").forEach((btn) => {
        const t = (btn.textContent || "").trim();
        if (!t || t.length > 60) return;
        const br = btn.getBoundingClientRect();
        const cs = getComputedStyle(btn);
        if (br.width > vw - 4 && cs.whiteSpace === "normal") {
          const lines = btn.scrollHeight / (parseFloat(cs.lineHeight) || 16);
          if (lines > 2.2) {
            issues.push({
              component: "Button / CTA",
              issue: `Nút «${t.slice(0, 24)}» wrap ${Math.round(lines)} dòng`,
              severity: "Low",
            });
          }
        }
      });

      // Text wrap bất thường — nowrap + ellipsis clip visible overflow
      root.querySelectorAll("p, span, dd, dt").forEach((el) => {
        const cs = getComputedStyle(el);
        const t = (el.textContent || "").trim();
        if (!t || t.length < 8) return;
        if (cs.whiteSpace === "nowrap" && el.scrollWidth > el.clientWidth + 4) {
          const clipped = cs.textOverflow === "ellipsis" || cs.overflow === "hidden";
          if (!clipped && el.getBoundingClientRect().width > vw * 0.95) {
            issues.push({
              component: routeComponent,
              issue: `Chuỗi dài không wrap: «${t.slice(0, 32)}…»`,
              severity: "Medium",
            });
          }
        }
        if (cs.wordBreak === "break-all" && t.includes(" ")) {
          issues.push({
            component: routeComponent,
            issue: `break-all trên câu có khoảng trắng: «${t.slice(0, 28)}»`,
            severity: "Low",
          });
        }
      });

      return issues;
    },
    { rootSel: route.root, routeComponent: route.component },
  );
}

function dedupeIssues(list) {
  const seen = new Set();
  return list.filter((i) => {
    const k = `${i.component}|${i.issue}|${i.severity}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function main() {
  const outDir = path.join(ROOT, "..", ".artifacts", "mobile-ctv-audit");
  await mkdir(outDir, { recursive: true });

  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(BASE);
      if (r.ok) break;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ isMobile: true, hasTouch: true });
  if (!(await login(ctx))) {
    console.error("Login failed");
    process.exit(1);
  }

  const page = await ctx.newPage();
  const all = [];

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      try {
        const found = await auditViewport(page, vp, route, outDir);
        for (const issue of found) {
          all.push({ ...issue, viewport: vp.name });
        }
      } catch (e) {
        all.push({
          component: route.component,
          issue: `Audit lỗi: ${e.message}`,
          severity: "High",
          viewport: vp.name,
        });
      }
    }
  }

  await browser.close();

  const merged = dedupeIssues(
    all.map(({ viewport, ...rest }) => ({
      ...rest,
      issue: `${rest.issue} [${viewport}]`,
    })),
  );

  console.log("\n## Mobile CTV / Account audit\n");
  console.log("| Component | Issue | Severity |");
  console.log("|-----------|-------|----------|");
  if (merged.length === 0) {
    console.log("| — | Không phát hiện issue tự động trên 3 viewport | — |");
  } else {
    for (const row of merged.sort((a, b) => {
      const o = { High: 0, Medium: 1, Low: 2 };
      return (o[a.severity] ?? 3) - (o[b.severity] ?? 3);
    })) {
      console.log(`| ${row.component} | ${row.issue} | ${row.severity} |`);
    }
  }
  console.log(`\nScreenshots: ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
