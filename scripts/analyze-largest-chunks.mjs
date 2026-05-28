/**
 * Liệt kê chunk JS lớn nhất sau `npm run build` + heuristic package trong file.
 * node scripts/analyze-largest-chunks.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CHUNKS = path.join(ROOT, "..", ".next", "static", "chunks");

const PKG_MARKERS = [
  "recharts",
  "d3-",
  "lodash",
  "@tiptap",
  "prosemirror",
  "react-dom",
  "next/dist",
  "lucide-react",
  "sanitize-html",
  "bullmq",
  "ioredis",
  "@aws-sdk",
  "prisma",
  "date-fns",
  "zod",
];

function scanChunk(filePath) {
  const buf = fs.readFileSync(filePath);
  const text = buf.toString("utf8", 0, Math.min(buf.length, 2_000_000));
  const hits = [];
  for (const m of PKG_MARKERS) {
    const idx = text.indexOf(m);
    if (idx >= 0) hits.push({ marker: m, firstAt: idx });
  }
  return hits.sort((a, b) => a.firstAt - b.firstAt).slice(0, 8);
}

function main() {
  if (!fs.existsSync(CHUNKS)) {
    console.error("Missing .next/static/chunks — run npm run build first.");
    process.exit(1);
  }
  const files = fs
    .readdirSync(CHUNKS)
    .filter((f) => f.endsWith(".js"))
    .map((f) => {
      const p = path.join(CHUNKS, f);
      const st = fs.statSync(p);
      return { file: f, bytes: st.size, path: p };
    })
    .sort((a, b) => b.bytes - a.bytes);

  const top = files.slice(0, 20);
  const report = top.map((row, i) => ({
    rank: i + 1,
    file: row.file,
    kb: Math.round((row.bytes / 1024) * 10) / 10,
    mb: Math.round((row.bytes / 1048576) * 100) / 100,
    markers: scanChunk(row.path),
  }));

  console.log(JSON.stringify({ chunkDir: CHUNKS, top20: report }, null, 2));
}

main();
