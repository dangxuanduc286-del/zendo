import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function ensureDatabaseUrlFromEnv(): void {
  if (process.env.DATABASE_URL?.trim()) return;
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (key !== "DATABASE_URL") continue;
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const unquoted =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
    if (unquoted) {
      process.env.DATABASE_URL = unquoted;
    }
    break;
  }
}

ensureDatabaseUrlFromEnv();

function stripLegacyOgDefault(value: unknown): { next: Record<string, unknown>; changed: boolean } {
  const base =
    value && typeof value === "object" && !Array.isArray(value)
      ? ({ ...(value as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  let changed = false;

  const defaultOgImage =
    typeof base.defaultOgImage === "string" ? base.defaultOgImage.trim() : "";
  if (/og-default\.jpg/i.test(defaultOgImage) || /\/images\/seo\//i.test(defaultOgImage)) {
    base.defaultOgImage = "";
    changed = true;
  }

  const seoDefault =
    base.seoDefault && typeof base.seoDefault === "object" && !Array.isArray(base.seoDefault)
      ? ({ ...(base.seoDefault as Record<string, unknown>) } as Record<string, unknown>)
      : null;
  const seoOgImage = seoDefault && typeof seoDefault.ogImage === "string" ? seoDefault.ogImage.trim() : "";
  if (seoDefault && (/og-default\.jpg/i.test(seoOgImage) || /\/images\/seo\//i.test(seoOgImage))) {
    seoDefault.ogImage = "";
    base.seoDefault = seoDefault;
    changed = true;
  }

  return { next: base, changed };
}

async function main() {
  let dbClient: { $disconnect?: () => Promise<void> } | null = null;
  try {
    const { db } = await import("../src/lib/db");
    dbClient = db;
    const row = await db.setting.findUnique({
      where: { key: "website_settings" },
      select: { id: true, value: true },
    });

    if (!row) {
      console.log("Không tìm thấy website_settings. Không cần dọn.");
      return;
    }

    const { next, changed } = stripLegacyOgDefault(row.value);
    if (!changed) {
      console.log("Không cần dọn.");
      return;
    }

    await db.setting.update({
      where: { id: row.id },
      data: { value: JSON.parse(JSON.stringify(next)) },
    });
    console.log("Đã dọn defaultOgImage cũ chứa og-default.");
  } catch (error) {
    console.error("Failed to clear legacy default OG image:", error);
    process.exitCode = 1;
  } finally {
    if (dbClient && typeof dbClient.$disconnect === "function") {
      await dbClient.$disconnect();
    }
  }
}

void main();
