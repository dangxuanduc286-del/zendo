/** Chỉ phân loại độ dài chuỗi hiển thị — không đụng dữ liệu / logic nghiệp vụ. */

export type CtvValueLengthTier = "sm" | "md" | "lg" | "xl";

export function ctvValueLengthTier(text: string): CtvValueLengthTier {
  const len = text.replace(/\s/g, "").length;
  if (len >= 15) return "xl";
  if (len >= 12) return "lg";
  if (len >= 10) return "md";
  return "sm";
}
