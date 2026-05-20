/**
 * Production Next build with NODE_OPTIONS sanitized.
 * `--conditions=react-server` breaks Collecting page data: Next loads pages/_app
 * → react-dom/server.edge resolves to react-dom/server.react-server.js (throws).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

function sanitizeNodeOptions(raw) {
  if (!raw?.trim()) return "";
  return raw
    .split(/\s+/)
    .filter((flag) => {
      if (!flag) return false;
      if (flag === "--conditions=react-server") return false;
      if (flag.startsWith("--conditions=") && flag.includes("react-server")) return false;
      return true;
    })
    .join(" ")
    .trim();
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const env = { ...process.env };
const cleaned = sanitizeNodeOptions(env.NODE_OPTIONS);
if (cleaned !== (env.NODE_OPTIONS ?? "").trim()) {
  console.warn("[next-build] Removed react-server from NODE_OPTIONS for Next.js build compatibility.");
}
env.NODE_OPTIONS = cleaned;

const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env,
  cwd: root,
});

process.exit(result.status ?? 1);
