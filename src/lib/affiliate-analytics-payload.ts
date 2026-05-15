const META_MAX_KEYS = 24;
const META_MAX_STRING = 400;
const META_MAX_DEPTH = 1;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Strip unsafe keys and oversized values from client metadata (affiliate track).
 */
export function sanitizeAffiliateTrackMetadata(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!raw || !isPlainObject(raw)) return {};
  const out: Record<string, unknown> = {};
  let n = 0;
  for (const [k0, v0] of Object.entries(raw)) {
    if (n >= META_MAX_KEYS) break;
    const k = k0.replace(/[^\w.-]/g, "").slice(0, 64);
    if (!k || k === "__proto__" || k === "constructor" || k === "prototype") continue;
    if (typeof v0 === "string") {
      out[k] = v0.slice(0, META_MAX_STRING);
      n += 1;
      continue;
    }
    if (typeof v0 === "number" && Number.isFinite(v0)) {
      out[k] = v0;
      n += 1;
      continue;
    }
    if (typeof v0 === "boolean") {
      out[k] = v0;
      n += 1;
      continue;
    }
    if (v0 === null) {
      out[k] = null;
      n += 1;
      continue;
    }
    if (META_MAX_DEPTH > 0 && isPlainObject(v0)) {
      const inner: Record<string, unknown> = {};
      let m = 0;
      for (const [ik0, iv] of Object.entries(v0)) {
        if (m >= 12) break;
        const ik = ik0.replace(/[^\w.-]/g, "").slice(0, 48);
        if (!ik || ik === "__proto__") continue;
        if (typeof iv === "string") inner[ik] = iv.slice(0, META_MAX_STRING);
        else if (typeof iv === "number" && Number.isFinite(iv)) inner[ik] = iv;
        else if (typeof iv === "boolean") inner[ik] = iv;
        m += 1;
      }
      out[k] = inner;
      n += 1;
    }
  }
  return out;
}
