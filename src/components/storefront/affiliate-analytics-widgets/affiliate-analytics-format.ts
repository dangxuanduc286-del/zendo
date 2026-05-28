/** Format helpers — không phải component hiển thị. */
export function fmtVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
}

export function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
}

export function formatRelativeVi(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  let diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 0) diffSec = 0;
  if (diffSec < 45) return "vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  return new Date(iso).toLocaleString("vi-VN");
}

export function rangeViLabel(r: "today" | "7d" | "30d" | "month"): string {
  if (r === "today") return "Hôm nay";
  if (r === "7d") return "7 ngày";
  if (r === "30d") return "30 ngày";
  return "Tháng này";
}
