/**
 * Xóa artifact Next.js / webpack để tránh MODULE_NOT_FOUND ./NNNN.js
 * (runtime tham chiếu chunk cũ sau khi build dở dang hoặc dev + build chạy song song).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const targets = [
  path.join(root, ".next"),
  path.join(root, "node_modules", ".cache"),
];

for (const dir of targets) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("[clean-next] Removed", dir);
  }
}

console.log("[clean-next] Done. Run `npm run build` or `npm run dev` next.");
