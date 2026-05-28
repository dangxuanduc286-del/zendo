/**
 * Trước `next build`: nhắc không chạy build song song với `next dev`.
 * Luôn clean .next để tránh chunk lệch (MODULE_NOT_FOUND ./4996.js trên API routes).
 */
const { verifyNextArtifacts } = require("./verify-next-chunks.cjs");

const pre = verifyNextArtifacts();
if (!pre.ok) {
  console.log("[ensure-build] Stale .next before build:", pre.reason);
}

require("./clean-next.cjs");
console.log("[ensure-build] Clean complete — starting production build.");
