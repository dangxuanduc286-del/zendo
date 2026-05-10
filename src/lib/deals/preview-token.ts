import crypto from "crypto";

type PreviewTokenPayload = {
  v: 1;
  exp: number; // unix seconds
  scope: "draft" | "scheduled";
};

function base64url(input: Buffer | string): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlToBuffer(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const s = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(s, "base64");
}

function getSecret(): string {
  return (
    process.env.DEALS_PREVIEW_TOKEN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ""
  );
}

export function signDealsPreviewToken(scope: "draft" | "scheduled", ttlHours = 6): string {
  const secret = getSecret();
  if (!secret) throw new Error("Missing token secret");
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(1, Math.min(72, ttlHours)) * 3600;
  const payload: PreviewTokenPayload = { v: 1, exp, scope };
  const payloadB64 = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${base64url(sig)}`;
}

export function verifyDealsPreviewToken(token: string): { ok: true; payload: PreviewTokenPayload } | { ok: false } {
  const secret = getSecret();
  if (!secret) return { ok: false };
  const parts = (token || "").split(".");
  if (parts.length !== 2) return { ok: false };
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return { ok: false };
  const expected = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  const got = base64urlToBuffer(sigB64);
  if (got.length !== expected.length || !crypto.timingSafeEqual(got, expected)) return { ok: false };
  let payload: PreviewTokenPayload;
  try {
    payload = JSON.parse(base64urlToBuffer(payloadB64).toString("utf8")) as PreviewTokenPayload;
  } catch {
    return { ok: false };
  }
  if (payload?.v !== 1) return { ok: false };
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || now > payload.exp) return { ok: false };
  if (payload.scope !== "draft" && payload.scope !== "scheduled") return { ok: false };
  return { ok: true, payload };
}

