/**
 * Trước `next dev`: nếu .next đã tồn tại nhưng chunk/runtime lệch → clean tự động.
 * Tránh MODULE_NOT_FOUND ./4996.js khi dev và build ghi đè lẫn nhau.
 */
const fs = require("fs");
const path = require("path");
const { verifyNextArtifacts } = require("./verify-next-chunks.cjs");

const root = path.join(__dirname, "..");
const nextDir = path.join(root, ".next");

if (!fs.existsSync(nextDir)) {
  console.log("[ensure-dev] No .next cache — dev will compile fresh.");
  process.exit(0);
}

const result = verifyNextArtifacts({ forDevStart: true });
if (result.ok) {
  console.log("[ensure-dev] .next artifacts look consistent.");
  process.exit(0);
}

console.warn("[ensure-dev] Corrupt/stale .next detected:", result.reason);
require("./clean-next.cjs");
console.log("[ensure-dev] Cleaned. `next dev` will perform a full recompile.");
