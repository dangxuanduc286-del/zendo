/** Chuẩn hóa copy hiển thị CTV — ẩn thuật ngữ Attribution/Phase 2.2 trên UI (không đổi dữ liệu/API). */
const REPLACEMENTS: ReadonlyArray<[pattern: RegExp, replacement: string]> = [
  [/Attribution engine/gi, "Engine gán CTV"],
  [/Attribution/gi, "Gán CTV"],
  [/attribution/gi, "gán CTV"],
  [/Conversion match/gi, "Khớp chuyển đổi"],
  [/conversion match/gi, "khớp chuyển đổi"],
  [/Touch chain/gi, "Chuỗi touchpoint"],
  [/touch chain/gi, "chuỗi touchpoint"],
  [/Phase 2\.2/gi, ""],
  [/\battr failed\b/gi, "gán failed"],
  [/\battr\b/gi, "gán"],
  [/\bat:/g, "gd:"],
];

export function sanitizeCtvDisplayText(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
}
