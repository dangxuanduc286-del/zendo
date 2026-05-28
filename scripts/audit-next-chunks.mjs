/**
 * Liệt kê chunk JS > ngưỡng sau `npm run build` (Giai đoạn 1 / 5).
 */
import fs from "fs";
import path from "path";

const root = path.join(process.cwd(), ".next", "static", "chunks");
const THRESHOLD_KB = 200;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else if (name.name.endsWith(".js")) out.push(full);
  }
  return out;
}

const files = walk(root);
const rows = files
  .map((file) => {
    const stat = fs.statSync(file);
    return { file: path.relative(process.cwd(), file), kb: stat.size / 1024 };
  })
  .sort((a, b) => b.kb - a.kb);

const heavy = rows.filter((r) => r.kb >= THRESHOLD_KB);
console.log(`# Chunks >= ${THRESHOLD_KB} KB (${heavy.length})`);
for (const r of heavy.slice(0, 30)) {
  console.log(`${r.kb.toFixed(1)} KB\t${r.file}`);
}
console.log("\n# Top 25 chunks (all sizes)");
for (const r of rows.slice(0, 25)) {
  console.log(`${r.kb.toFixed(1)} KB\t${r.file}`);
}
