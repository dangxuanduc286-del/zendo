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
    if (unquoted) process.env.DATABASE_URL = unquoted;
    break;
  }
}

function shouldConvertToAddToCart(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return value.trim().toLocaleLowerCase("vi-VN") === "xem chi tiết";
}

ensureDatabaseUrlFromEnv();

async function main() {
  let dbClient: { $disconnect?: () => Promise<void> } | null = null;
  try {
    const { db } = await import("../src/lib/db");
    dbClient = db;
    const row = await db.setting.findUnique({
      where: { key: "theme_settings" },
      select: { id: true, value: true },
    });

    if (!row) {
      console.log("Không cần dọn.");
      return;
    }

    const current =
      row.value && typeof row.value === "object" && !Array.isArray(row.value)
        ? ({ ...(row.value as Record<string, unknown>) } as Record<string, unknown>)
        : {};

    if (!shouldConvertToAddToCart(current.productCardButtonText)) {
      console.log("Không cần dọn.");
      return;
    }

    current.productCardButtonText = "Thêm giỏ";
    await db.setting.update({
      where: { id: row.id },
      data: { value: JSON.parse(JSON.stringify(current)) },
    });
    console.log("Đã cập nhật productCardButtonText từ Xem chi tiết sang Thêm giỏ.");
  } catch (error) {
    console.error("Không thể dọn productCardButtonText:", error);
    process.exitCode = 1;
  } finally {
    if (dbClient && typeof dbClient.$disconnect === "function") {
      await dbClient.$disconnect();
    }
  }
}

void main();
