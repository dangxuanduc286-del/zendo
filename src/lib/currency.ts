const DEFAULT_LOCALE = "vi-VN";
const DEFAULT_CURRENCY = "VND";

export function formatVnd(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(safeValue);
}
