/**
 * Kiểm tra .next/server tránh MODULE_NOT_FOUND ./NNNN.js:
 * - Production: runtime load ./chunks/ + mọi chunk ID trong route bundle phải tồn tại.
 * - Development: route eval bundles — chỉ báo lỗi khi lẫn output prod (b.X) mà thiếu chunks/.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const serverDir = path.join(root, ".next", "server");

function collectRouteFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) collectRouteFiles(full, out);
    else if (name.name === "route.js") out.push(full);
  }
  return out;
}

function extractChunkIds(source) {
  const ids = new Set();
  for (const m of source.matchAll(/\.e\((\d+)\)/g)) ids.add(Number(m[1]));
  for (const m of source.matchAll(/\.X\(\d+,\[([\d,\s]+)\]/g)) {
    for (const part of m[1].split(",")) {
      const n = Number(part.trim());
      if (Number.isFinite(n)) ids.add(n);
    }
  }
  return ids;
}

function isDevRouteBundle(source) {
  return source.includes('devtool has been used') || source.includes("eval-source-map");
}

function isProdRouteBundle(source) {
  return source.includes("webpack-runtime.js") && /\.X\(\d+,\[/.test(source);
}

/**
 * @param {{ forDevStart?: boolean }} [opts]
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function verifyNextArtifacts(opts = {}) {
  const forDevStart = Boolean(opts.forDevStart);
  const runtimePath = path.join(serverDir, "webpack-runtime.js");
  if (!fs.existsSync(runtimePath)) {
    return { ok: true };
  }

  const runtime = fs.readFileSync(runtimePath, "utf8");
  const chunksDir = path.join(serverDir, "chunks");
  const hasChunksDir = fs.existsSync(chunksDir);

  const usesChunkDir =
    runtime.includes('./chunks/"') ||
    runtime.includes("./chunks/") ||
    runtime.includes('join(__dirname, "chunks"');

  const routes = collectRouteFiles(path.join(serverDir, "app"));
  const prodRoutes = routes.filter((file) => isProdRouteBundle(fs.readFileSync(file, "utf8")));
  const devRoutes = routes.filter((file) => isDevRouteBundle(fs.readFileSync(file, "utf8")));

  /** next dev không được tái sử dụng route bundle từ production build (gây MODULE_NOT_FOUND ./NNNN.js). */
  if (forDevStart && prodRoutes.length > 0) {
    const supportDm = prodRoutes.find((f) => f.includes(`${path.sep}support-dm${path.sep}`));
    const hint = supportDm ? " (includes support-dm)" : "";
    return {
      ok: false,
      reason: `production server bundles in .next before next dev${hint} — run npm run clean or npm run dev:clean`,
    };
  }

  if (prodRoutes.length > 0 && !hasChunksDir) {
    return {
      ok: false,
      reason:
        "production route bundles present but .next/server/chunks is missing (mixed dev/prod .next — run npm run clean)",
    };
  }

  if (!hasChunksDir) {
    if (devRoutes.length > 0 || routes.length === 0) {
      return { ok: true };
    }
    return { ok: true };
  }

  if (runtime.includes("c.f.require") && !usesChunkDir) {
    return {
      ok: false,
      reason: "webpack-runtime.js does not load chunks from ./chunks/ (stale or mixed dev/prod output)",
    };
  }

  if (/\brequire\("\.\/\d+\.js"\)/.test(runtime) && !usesChunkDir) {
    return {
      ok: false,
      reason: "webpack-runtime.js references ./NNNN.js at server root instead of ./chunks/",
    };
  }

  const missing = new Set();
  for (const file of prodRoutes) {
    const src = fs.readFileSync(file, "utf8");
    for (const id of extractChunkIds(src)) {
      const chunkPath = path.join(chunksDir, `${id}.js`);
      if (!fs.existsSync(chunkPath)) missing.add(id);
    }
  }

  if (missing.size > 0) {
    const sample = [...missing].slice(0, 8).join(", ");
    const suffix = missing.size > 8 ? ` (+${missing.size - 8} more)` : "";
    return { ok: false, reason: `missing chunk files: ${sample}${suffix}` };
  }

  return { ok: true };
}

if (require.main === module) {
  const result = verifyNextArtifacts();
  if (!result.ok) {
    console.error("[verify-next-chunks] FAIL:", result.reason);
    process.exit(1);
  }
  console.log("[verify-next-chunks] OK");
  process.exit(0);
}

module.exports = { verifyNextArtifacts };
