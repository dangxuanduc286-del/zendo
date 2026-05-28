import type { CtvFormattedValueVariant } from "./ctv-formatted-value";

/** Suy luận variant hiển thị từ chuỗi đã format — không đổi dữ liệu. */
export function ctvInferFormattedVariant(value: string): CtvFormattedValueVariant {
  const v = value.trim();
  if (/%\s*$/.test(v) || /％\s*$/.test(v)) return "percent";
  if (/[₫đ]\s*$/i.test(v) || /^\+?[\d.,\s]+[₫đ]/i.test(v)) return "money";
  return "metric";
}
