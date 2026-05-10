import type { KhoangThoiGianAnalytics } from "./date-range";
import { MUI_GIO_VIET_NAM } from "./timezone";

function taoBoDinhDangNgayGio(tuyChon?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: MUI_GIO_VIET_NAM,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...tuyChon,
  });
}

export function dinhDangMocThoiGianAnalytics(
  moc: Date,
  tuyChon?: Intl.DateTimeFormatOptions,
): string {
  return taoBoDinhDangNgayGio(tuyChon).format(moc);
}

export function dinhDangKhoangThoiGianAnalytics(
  khoang: KhoangThoiGianAnalytics,
  tuyChon?: Intl.DateTimeFormatOptions,
): string {
  const batDau = dinhDangMocThoiGianAnalytics(khoang.batDau, tuyChon);
  const ketThuc = dinhDangMocThoiGianAnalytics(khoang.ketThuc, tuyChon);
  return `${batDau} - ${ketThuc}`;
}

export function chuanHoaKhoangThoiGianDangIsoAnalytics(
  khoang: KhoangThoiGianAnalytics,
): { batDauIso: string; ketThucIso: string } {
  return {
    batDauIso: khoang.batDau.toISOString(),
    ketThucIso: khoang.ketThuc.toISOString(),
  };
}

export function formatPercentChange(value: number, fractionDigits = 1): string {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe > 0 ? "+" : "";
  const rounded = Number(safe.toFixed(fractionDigits));
  return `${sign}${rounded}%`;
}
