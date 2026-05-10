import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { buildPublicMediaUrl } from "./media";
import { Readable } from "stream";

interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  accountId: string;
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

function resolveR2Config(): R2Config {
  const accountId = firstNonEmpty(process.env.R2_ACCOUNT_ID);
  const endpointFromAccountId = accountId
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : "";
  const endpoint = firstNonEmpty(endpointFromAccountId);
  const accessKeyId = firstNonEmpty(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = firstNonEmpty(process.env.R2_SECRET_ACCESS_KEY);
  const bucket = firstNonEmpty(process.env.R2_BUCKET_NAME);

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Cloudflare R2 env thiếu hoặc rỗng. Cần: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.",
    );
  }

  let endpointHost = "";
  try {
    endpointHost = new URL(endpoint).host;
  } catch {
    throw new Error("R2 endpoint không hợp lệ.");
  }
  if (!endpointHost.endsWith(".r2.cloudflarestorage.com")) {
    throw new Error("R2 endpoint ký request phải là <account>.r2.cloudflarestorage.com.");
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    accountId,
  };
}

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function getR2Client(): S3Client {
  const config = cachedConfig ?? resolveR2Config();
  cachedConfig = config;

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return cachedClient;
}

function sanitizeFileName(fileName: string): string {
  const normalized = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-");

  return normalized.replace(/^-|-$/g, "");
}

export function buildR2ObjectKey(folder: string, fileName: string): string {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const cleanName = sanitizeFileName(fileName);
  const unique = randomUUID();
  return `${cleanFolder}/${unique}-${cleanName}`;
}

export function getPublicMediaUrl(objectKey: string): string {
  return buildPublicMediaUrl(objectKey);
}

export interface UploadToR2Input {
  objectKey: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}

export async function uploadBufferToR2(input: UploadToR2Input): Promise<string> {
  const config = cachedConfig ?? resolveR2Config();
  cachedConfig = config;


  const client = getR2Client();
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl ?? "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    throw error;
  }

  const publicUrl = getPublicMediaUrl(input.objectKey);
  return publicUrl;
}

export interface DownloadFromR2Result {
  body: Buffer;
  contentType: string;
}

export interface StreamFromR2Result {
  body: Readable;
  contentType: string;
  contentLength: number | null;
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  // AWS SDK v3 in Node returns a Readable stream for Body.
  const readable = stream as AsyncIterable<Uint8Array>;
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function downloadBufferFromR2(objectKey: string): Promise<DownloadFromR2Result> {
  const config = cachedConfig ?? resolveR2Config();
  cachedConfig = config;
  const client = getR2Client();

  const res = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
    }),
  );

  const body = await streamToBuffer(res.Body);
  const contentType = typeof res.ContentType === "string" && res.ContentType.trim() ? res.ContentType : "application/octet-stream";
  return { body, contentType };
}

function isAbortLikeError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    const name = error.name || "";
    const msg = error.message || "";
    if (name === "AbortError") return true;
    if (name.toLowerCase().includes("abort")) return true;
    if (msg.toLowerCase().includes("aborted")) return true;
    if (msg.toLowerCase().includes("abort")) return true;
  }
  return false;
}

export async function streamFromR2(
  objectKey: string,
  options?: { signal?: AbortSignal },
): Promise<StreamFromR2Result> {
  const config = cachedConfig ?? resolveR2Config();
  cachedConfig = config;
  const client = getR2Client();

  const controller = new AbortController();
  const upstreamSignal = options?.signal;
  const onAbort = () => {
    try {
      controller.abort();
    } catch {
      // ignore
    }
  };
  if (upstreamSignal) {
    if (upstreamSignal.aborted) onAbort();
    else upstreamSignal.addEventListener("abort", onAbort, { once: true });
  }

  let res: GetObjectCommandOutput;
  try {
    res = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
      { abortSignal: controller.signal },
    );
  } catch (e) {
    if (upstreamSignal?.aborted || controller.signal.aborted || isAbortLikeError(e)) {
      const err = new Error("ABORTED");
      err.name = "AbortError";
      throw err;
    }
    throw e;
  } finally {
    if (upstreamSignal) {
      try {
        upstreamSignal.removeEventListener("abort", onAbort);
      } catch {
        // ignore
      }
    }
  }

  const contentType =
    typeof res.ContentType === "string" && res.ContentType.trim()
      ? res.ContentType
      : "application/octet-stream";
  const contentLength = typeof res.ContentLength === "number" && Number.isFinite(res.ContentLength) ? res.ContentLength : null;

  // In Node runtime, AWS SDK v3 returns a Node.js Readable stream for Body.
  const body = res.Body as Readable;
  if (!body || typeof (body as unknown as { pipe?: unknown }).pipe !== "function") {
    throw new Error("R2_BODY_NOT_STREAM");
  }

  // If client disconnects mid-stream, abort upstream and destroy the stream promptly.
  if (upstreamSignal) {
    const destroyOnAbort = () => {
      try {
        controller.abort();
      } catch {
        // ignore
      }
      try {
        body.destroy();
      } catch {
        // ignore
      }
    };

    if (upstreamSignal.aborted) {
      destroyOnAbort();
    } else {
      upstreamSignal.addEventListener("abort", destroyOnAbort, { once: true });
      const cleanup = () => {
        try {
          upstreamSignal.removeEventListener("abort", destroyOnAbort);
        } catch {
          // ignore
        }
      };
      body.once("end", cleanup);
      body.once("close", cleanup);
      body.once("error", cleanup);
    }
  }

  return { body, contentType, contentLength };
}

export type ListedR2Object = { key: string; lastModified: Date | null };

/**
 * Paginated listing for lifecycle / retention jobs.
 */
export async function listR2ObjectsPage(input: {
  prefix: string;
  maxKeys?: number;
  continuationToken?: string;
}): Promise<{ objects: ListedR2Object[]; continuationToken?: string }> {
  const config = cachedConfig ?? resolveR2Config();
  cachedConfig = config;
  const client = getR2Client();

  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: config.bucket,
      Prefix: input.prefix.replace(/^\/+|\/+$/g, ""),
      MaxKeys: input.maxKeys ?? 500,
      ContinuationToken: input.continuationToken,
    }),
  );

  const contents = res.Contents ?? [];
  const objects: ListedR2Object[] = contents
    .map((o) => {
      const key = typeof o.Key === "string" ? o.Key : "";
      if (!key) return null;
      const lm = o.LastModified instanceof Date ? o.LastModified : null;
      return { key, lastModified: lm };
    })
    .filter(Boolean) as ListedR2Object[];

  return {
    objects,
    continuationToken:
      typeof res.NextContinuationToken === "string" && res.NextContinuationToken.trim()
        ? res.NextContinuationToken
        : undefined,
  };
}

/**
 * Idempotent delete; treats missing key as OK.
 */
export async function deleteR2ObjectSafe(objectKey: string): Promise<boolean> {
  const config = cachedConfig ?? resolveR2Config();
  cachedConfig = config;
  const client = getR2Client();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );
    return true;
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const code =
      typeof e === "object" && e !== null && "Code" in e && typeof (e as { Code?: unknown }).Code === "string"
        ? (e as { Code: string }).Code
        : "";
    if (name === "NotFound" || code === "NotFound" || code === "NoSuchKey") return false;
    throw e;
  }
}
