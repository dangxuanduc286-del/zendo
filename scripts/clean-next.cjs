/**
 * Xóa thư mục .next để tránh build lỗi do chunk/manifest không đồng bộ
 * (ví dụ PageNotFoundError hoặc MODULE_NOT_FOUND ./NNNN.js sau build dở dang).
 */
const fs = require("fs");
const path = require("path");

const nextDir = path.join(__dirname, "..", ".next");
fs.rmSync(nextDir, { recursive: true, force: true });
console.log("[clean-next] Removed", nextDir);
