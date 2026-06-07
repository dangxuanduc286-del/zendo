import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Severity = "SAFE" | "LOW" | "MEDIUM" | "HIGH";
type EntityType = "post" | "product" | "category" | "page" | "policy" | "route";

type AuditIssue = {
  severity: Severity;
  check: string;
  entityType: EntityType;
  title: string;
  path?: string;
  detail: string;
  safeFixAllowed: boolean;
};

type ContentEntity = {
  type: EntityType;
  id: string;
  title: string;
  slug: string;
  path: string;
  description: string;
  content: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  image?: string | null;
  tags: string[];
  category?: string | null;
  brand?: string | null;
  status?: string | boolean | null;
};

type RouteAudit = {
  routePath: string;
  file: string;
  hasMetadata: boolean;
  hasCanonical: boolean;
  hasOpenGraph: boolean;
  hasTwitter: boolean;
  h1Count: number;
  h2Count: number;
  missingAltCount: number;
  internalLinks: string[];
  externalLinks: string[];
};

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "docs", "seo-audit-report.md");
const STOREFRONT_DIR = path.join(ROOT, "src", "app", "(storefront)");
const PUBLIC_ROUTES = new Set([
  "/",
  "/bai-viet",
  "/ban-chay",
  "/chat",
  "/cong-tac-vien",
  "/cua-hang",
  "/dang-nhap",
  "/dat-lai-mat-khau",
  "/flash-deal",
  "/gio-hang",
  "/quen-mat-khau",
  "/san-pham-moi",
  "/tai-khoan",
  "/thanh-toan",
  "/thanh-toan/cam-on",
  "/tra-cuu-don-hang",
  "/uu-dai",
]);

function stripHtml(value: string): string {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(value: string): number {
  const stripped = stripHtml(value);
  if (!stripped) return 0;
  return stripped.split(/\s+/g).filter(Boolean).length;
}

function normalizeText(value: string): string[] {
  return stripHtml(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/g)
    .filter((token) => token.length >= 4 && !["zendo", "trang", "pham", "viet", "danh", "hang", "chinh", "sach"].includes(token));
}

function similarity(a: ContentEntity, b: ContentEntity): number {
  const aTokens = new Set(normalizeText(`${a.title} ${a.description} ${a.content} ${a.tags.join(" ")} ${a.category ?? ""} ${a.brand ?? ""}`));
  const bTokens = new Set(normalizeText(`${b.title} ${b.description} ${b.content} ${b.tags.join(" ")} ${b.category ?? ""} ${b.brand ?? ""}`));
  if (!aTokens.size || !bTokens.size) return 0;
  let overlap = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1;
  });
  return overlap / Math.sqrt(aTokens.size * bTokens.size);
}

function addIssue(issues: AuditIssue[], issue: AuditIssue): void {
  issues.push(issue);
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

function routePathFromFile(file: string): string {
  const relative = path.relative(STOREFRONT_DIR, file).replace(/\\/g, "/");
  const withoutChrome = relative.replace(/^\(with-chrome\)\//, "");
  const route = withoutChrome.replace(/\/page\.tsx$/, "").replace(/\/page\.ts$/, "");
  if (route === "page.tsx" || route === "page.ts" || route === "") return "/";
  return `/${route.replace(/\/page\.tsx$/, "").replace(/\/page\.ts$/, "")}`.replace(/\/index$/, "");
}

async function auditRoutes(): Promise<RouteAudit[]> {
  const files = (await walk(STOREFRONT_DIR)).filter((file) => /page\.tsx?$/.test(file));
  const audits: RouteAudit[] = [];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    const internalLinks = [...source.matchAll(/href=\{?["`]([^"`#][^"`]*)["`]/g)]
      .map((match) => match[1])
      .filter((href) => href.startsWith("/"));
    const externalLinks = [...source.matchAll(/href=\{?["`](https?:\/\/[^"`]+)["`]/g)].map((match) => match[1]);
    audits.push({
      routePath: routePathFromFile(file),
      file: path.relative(ROOT, file).replace(/\\/g, "/"),
      hasMetadata: /export\s+(async\s+function\s+generateMetadata|const\s+metadata)\b/.test(source),
      hasCanonical: /canonical|buildDynamicMetadata|buildMetadata/.test(source),
      hasOpenGraph: /openGraph|buildDynamicMetadata|buildMetadata/.test(source),
      hasTwitter: /twitter|buildDynamicMetadata|buildMetadata/.test(source),
      h1Count: (source.match(/<h1\b/g) ?? []).length,
      h2Count: (source.match(/<h2\b/g) ?? []).length,
      missingAltCount: (source.match(/<(Image|img)\b(?![^>]*\balt=)/g) ?? []).length,
      internalLinks,
      externalLinks,
    });
  }
  return audits;
}

async function loadDbEntities(): Promise<ContentEntity[]> {
  if (!process.env.DATABASE_URL) return [];
  const dbModule = await import(pathToFileURL(path.join(ROOT, "src", "lib", "db.ts")).href) as { db: any };
  const db = dbModule.db;
  const [posts, products, categories, pages, policies] = await Promise.all([
    db.post.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, slug: true, excerpt: true, content: true, thumbnailUrl: true, seoTitle: true, seoDescription: true, tags: true } }),
    db.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, slug: true, shortDescription: true, description: true, seoTitle: true, seoDescription: true, images: { select: { url: true, altText: true, isPrimary: true, sortOrder: true }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] }, category: { select: { name: true, slug: true } }, brand: { select: { name: true } } } }),
    db.category.findMany({ select: { id: true, name: true, slug: true, description: true, imageUrl: true, seoTitle: true, seoDescription: true } }),
    db.page.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true, slug: true, content: true, seoTitle: true, seoDescription: true } }),
    db.sitePolicy.findMany({ where: { isPublished: true, deletedAt: null }, select: { id: true, title: true, slug: true, content: true, excerpt: true } }),
  ]);

  return [
    ...posts.map((p: any): ContentEntity => ({ type: "post", id: p.id, title: p.title, slug: p.slug, path: `/bai-viet/${p.slug}`, description: p.excerpt ?? "", content: p.content ?? "", seoTitle: p.seoTitle, seoDescription: p.seoDescription, image: p.thumbnailUrl, tags: p.tags ?? [] })),
    ...products.map((p: any): ContentEntity => ({ type: "product", id: p.id, title: p.name, slug: p.slug, path: `/san-pham/${p.slug}`, description: p.shortDescription ?? "", content: p.description ?? "", seoTitle: p.seoTitle, seoDescription: p.seoDescription, image: p.images?.[0]?.url ?? null, tags: [], category: p.category?.name, brand: p.brand?.name })),
    ...categories.map((c: any): ContentEntity => ({ type: "category", id: c.id, title: c.name, slug: c.slug, path: `/danh-muc/${c.slug}`, description: c.description ?? "", content: c.description ?? "", seoTitle: c.seoTitle, seoDescription: c.seoDescription, image: c.imageUrl, tags: [] })),
    ...pages.map((p: any): ContentEntity => ({ type: "page", id: p.id, title: p.title, slug: p.slug, path: `/${p.slug}`, description: p.seoDescription ?? "", content: p.content ?? "", seoTitle: p.seoTitle, seoDescription: p.seoDescription, tags: [] })),
    ...policies.map((p: any): ContentEntity => ({ type: "policy", id: p.id, title: p.title, slug: p.slug, path: `/chinh-sach/${p.slug}`, description: p.excerpt ?? "", content: p.content ?? "", tags: [] })),
  ];
}

function auditEntities(entities: ContentEntity[], routeAudits: RouteAudit[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const titleMap = new Map<string, ContentEntity[]>();
  const slugMap = new Map<string, ContentEntity[]>();
  for (const entity of entities) {
    const titleKey = (entity.seoTitle || entity.title).trim().toLowerCase();
    titleMap.set(titleKey, [...(titleMap.get(titleKey) ?? []), entity]);
    slugMap.set(entity.slug.trim().toLowerCase(), [...(slugMap.get(entity.slug.trim().toLowerCase()) ?? []), entity]);

    if (!entity.seoTitle || !entity.seoDescription) addIssue(issues, { severity: "SAFE", check: "missing metadata", entityType: entity.type, title: entity.title, path: entity.path, detail: "Thiếu seoTitle hoặc seoDescription trong dữ liệu nội dung; runtime có fallback nhưng dữ liệu gốc chưa đầy đủ.", safeFixAllowed: true });
    if (!entity.description && !entity.content) addIssue(issues, { severity: "MEDIUM", check: "missing schema inputs", entityType: entity.type, title: entity.title, path: entity.path, detail: "Thiếu description/content để sinh schema mô tả có chất lượng.", safeFixAllowed: false });
    if (["post", "product", "category"].includes(entity.type) && !entity.image) addIssue(issues, { severity: "SAFE", check: "image rỗng trong schema", entityType: entity.type, title: entity.title, path: entity.path, detail: "Không có ảnh đại diện/ảnh chính cho schema/OpenGraph.", safeFixAllowed: true });
    if (wordCount(entity.content || entity.description) < 120) addIssue(issues, { severity: "LOW", check: "thin content", entityType: entity.type, title: entity.title, path: entity.path, detail: `Nội dung mỏng: ${wordCount(entity.content || entity.description)} từ.`, safeFixAllowed: false });
  }

  for (const [title, items] of titleMap.entries()) {
    if (title && items.length > 1) addIssue(issues, { severity: "LOW", check: "duplicate title", entityType: items[0].type, title, detail: items.map((item) => item.path).join(", "), safeFixAllowed: false });
  }
  for (const [slug, items] of slugMap.entries()) {
    if (slug && items.length > 1) addIssue(issues, { severity: "MEDIUM", check: "duplicate slug cross-type", entityType: items[0].type, title: slug, detail: items.map((item) => `${item.type}:${item.path}`).join(", "), safeFixAllowed: false });
  }

  for (const route of routeAudits) {
    if (!route.hasMetadata) addIssue(issues, { severity: "SAFE", check: "missing metadata", entityType: "route", title: route.routePath, path: route.file, detail: "Route storefront không khai báo metadata/generateMetadata trực tiếp.", safeFixAllowed: true });
    if (!route.hasCanonical) addIssue(issues, { severity: "SAFE", check: "missing canonical", entityType: "route", title: route.routePath, path: route.file, detail: "Không phát hiện canonical hoặc helper metadata có canonical.", safeFixAllowed: true });
    if (!route.hasOpenGraph) addIssue(issues, { severity: "SAFE", check: "missing OpenGraph", entityType: "route", title: route.routePath, path: route.file, detail: "Không phát hiện OpenGraph hoặc helper metadata có OpenGraph.", safeFixAllowed: true });
    if (!route.hasTwitter) addIssue(issues, { severity: "SAFE", check: "missing Twitter metadata", entityType: "route", title: route.routePath, path: route.file, detail: "Không phát hiện Twitter metadata hoặc helper metadata có Twitter.", safeFixAllowed: true });
    if (route.h1Count > 1) addIssue(issues, { severity: "LOW", check: "multiple H1", entityType: "route", title: route.routePath, path: route.file, detail: `Có ${route.h1Count} H1 tĩnh trong source.`, safeFixAllowed: false });
    if (route.h2Count < 1) addIssue(issues, { severity: "LOW", check: "missing H2", entityType: "route", title: route.routePath, path: route.file, detail: "Không phát hiện H2 tĩnh trong source.", safeFixAllowed: false });
    if (route.missingAltCount > 0) addIssue(issues, { severity: "SAFE", check: "image alt missing", entityType: "route", title: route.routePath, path: route.file, detail: `Có ${route.missingAltCount} Image/img thiếu alt trong source.`, safeFixAllowed: true });
    for (const href of route.internalLinks) {
      const clean = href.split("?")[0].replace(/\/$/, "") || "/";
      if (!PUBLIC_ROUTES.has(clean) && !clean.includes("${") && !clean.includes("[")) {
        addIssue(issues, { severity: "SAFE", check: "broken internal links", entityType: "route", title: route.routePath, path: route.file, detail: `Link nội bộ tĩnh chưa map được route: ${href}`, safeFixAllowed: true });
      }
    }
  }
  return issues;
}

function buildRelatedOpportunities(entities: ContentEntity[]): string[] {
  const groups: Array<[string, ContentEntity[]]> = [
    ["Bài viết liên quan có thể ghép", entities.filter((item) => item.type === "post")],
    ["Sản phẩm liên quan có thể ghép", entities.filter((item) => item.type === "product")],
    ["Danh mục liên quan có thể ghép", entities.filter((item) => item.type === "category")],
  ];
  const lines: string[] = [];
  for (const [label, items] of groups) {
    lines.push(`### ${label}`);
    const suggestions: string[] = [];
    for (const item of items) {
      const related = items
        .filter((candidate) => candidate.id !== item.id)
        .map((candidate) => ({ candidate, score: similarity(item, candidate) }))
        .filter(({ score }) => score >= 0.12)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      if (related.length) suggestions.push(`- ${item.title} (${item.path}) → ${related.map(({ candidate, score }) => `${candidate.title} (${candidate.path}, score ${score.toFixed(2)})`).join("; ")}`);
    }
    lines.push(suggestions.length ? suggestions.join("\n") : "- Chưa có đề xuất đủ ngưỡng.");
  }
  return lines;
}

function buildInternalLinkOpportunities(entities: ContentEntity[]): string[] {
  const posts = entities.filter((item) => item.type === "post" || item.type === "page" || item.type === "policy");
  const targets = entities.filter((item) => item.type === "product" || item.type === "category" || item.type === "post");
  const lines: string[] = [];
  for (const source of posts) {
    const suggestions = targets
      .filter((target) => target.id !== source.id && !source.content.includes(target.path))
      .map((target) => ({ target, score: similarity(source, target) }))
      .filter(({ score }) => score >= 0.14)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    if (suggestions.length) lines.push(`- Từ ${source.title} (${source.path}) → ${suggestions.map(({ target, score }) => `${target.title} (${target.path}, score ${score.toFixed(2)})`).join("; ")}`);
  }
  return lines.length ? lines : ["- Chưa có cơ hội internal linking đủ ngưỡng."];
}

async function main(): Promise<void> {
  const [entities, routeAudits] = await Promise.all([loadDbEntities(), auditRoutes()]);
  const issues = auditEntities(entities, routeAudits);
  const bySeverity = (severity: Severity) => issues.filter((issue) => issue.severity === severity);
  const brokenExternal = routeAudits.flatMap((route) => route.externalLinks.map((href) => ({ route: route.routePath, file: route.file, href })));

  const report = `# SEO Audit Report - Zendo.vn\n\nGenerated: ${new Date().toISOString()}\n\n## Scope & Safety\n\n- Mode: READ ONLY audit pipeline.\n- Database writes: none.\n- API/business logic/functionality changes: none.\n- External broken-link network probing: skipped to avoid flaky build/runtime side effects; external links are inventoried for manual verification.\n\n## Summary\n\n- Content entities audited: ${entities.length}\n- Storefront routes audited: ${routeAudits.length}\n- SAFE issues: ${bySeverity("SAFE").length}\n- LOW issues: ${bySeverity("LOW").length}\n- MEDIUM issues: ${bySeverity("MEDIUM").length}\n- HIGH issues: ${bySeverity("HIGH").length}\n\n## Issues\n\n${issues.length ? issues.map((issue) => `- [${issue.severity}] ${issue.check} | ${issue.entityType} | ${issue.title}${issue.path ? ` | ${issue.path}` : ""} | ${issue.detail} | Safe fix allowed: ${issue.safeFixAllowed ? "yes" : "no"}`).join("\n") : "- Không phát hiện issue."}\n\n## Route Metadata Matrix\n\n| Route | File | Metadata | Canonical | OpenGraph | Twitter | H1 | H2 | Missing Alt |\n|---|---|---:|---:|---:|---:|---:|---:|---:|\n${routeAudits.map((route) => `| ${route.routePath} | ${route.file} | ${route.hasMetadata ? "yes" : "no"} | ${route.hasCanonical ? "yes" : "no"} | ${route.hasOpenGraph ? "yes" : "no"} | ${route.hasTwitter ? "yes" : "no"} | ${route.h1Count} | ${route.h2Count} | ${route.missingAltCount} |`).join("\n")}\n\n## Broken External Links Inventory\n\n${brokenExternal.length ? brokenExternal.map((item) => `- ${item.route} (${item.file}) → ${item.href}`).join("\n") : "- Không phát hiện external link tĩnh trong storefront pages."}\n\n## Internal Linking Opportunities\n\n${buildInternalLinkOpportunities(entities).join("\n")}\n\n## Related Content Opportunities\n\n${buildRelatedOpportunities(entities).join("\n\n")}\n\n## Impact / Dependency / Regression Analysis\n\n- Audit script là công cụ offline trong thư mục scripts, không được import bởi runtime Next.js.\n- Report Markdown trong docs không ảnh hưởng render, database, API, hoặc business logic.\n- SAFE fixes dữ liệu/runtime chỉ nên thực hiện khi chứng minh được không đổi hành vi người dùng; audit hiện chỉ tạo báo cáo.\n`;

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, report, "utf8");
  console.log(`SEO audit report written to ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, "/")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
