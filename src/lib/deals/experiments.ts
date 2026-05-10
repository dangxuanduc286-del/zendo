import { layVisitorKey } from "../analytics/visitor-session";

export type ExperimentAssignment = {
  experimentId: string;
  visitorId: string;
  bucket: number;
  variantId: string;
};

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function assignExperimentBucket(args: {
  visitorId: string;
  experimentId: string;
  variants: string[];
}): ExperimentAssignment | null {
  const visitorId = (args.visitorId || "").trim();
  const experimentId = (args.experimentId || "").trim();
  const variants = (Array.isArray(args.variants) ? args.variants : []).map((v) => String(v || "").trim()).filter(Boolean);
  if (!visitorId || !experimentId || variants.length < 1) return null;

  const hash = fnv1a32(`${experimentId}|${visitorId}`);
  const bucket = hash % variants.length;
  const variantId = variants[bucket] || variants[0] || "";
  if (!variantId) return null;

  return { experimentId, visitorId, bucket, variantId };
}

export function resolveExperimentVariant(args: {
  experimentId: string;
  enabled?: boolean;
  variants: string[];
  visitorId?: string;
}): ExperimentAssignment | null {
  if (args.enabled === false) return null;
  const visitorId = (args.visitorId || "").trim() || (typeof window !== "undefined" ? layVisitorKey() : "");
  return assignExperimentBucket({ visitorId, experimentId: args.experimentId, variants: args.variants });
}

