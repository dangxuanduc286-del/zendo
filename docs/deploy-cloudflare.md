# Cloudflare Deployment Notes

## Platform Direction

- Use Cloudflare as primary infrastructure.
- Use Cloudflare R2 for images and media.
- Serve media through a custom public domain (example: `media.zendo.vn`).
- Do not use Vercel Blob or Vercel-specific runtime features.

## Required Environment Variables

Copy from `.env.example` and set:

- `DATABASE_URL`
- `AUTH_SECRET`
- `CLOUDFLARE_R2_S3_ENDPOINT`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`
- `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`

## R2 Setup

1. Create bucket `zendo-media`.
2. Create API token pair for S3-compatible access.
3. Map custom domain (`media.zendo.vn`) to this bucket.
4. Set cache headers for immutable image files.

## App Runtime Notes

- Upload media through `src/lib/cloudflare-r2.ts`.
- Build public media URLs from `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`.
- Resolve image URLs with `src/lib/media.ts`.
- Use `src/lib/image-loader.ts` when passing a custom loader to Next Image.

## Verification Checklist

1. Upload one image and confirm object is in R2.
2. Open the public URL from `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`.
3. Render a Next Image with Cloudflare URL and verify optimization query params.
4. Confirm no code path references Vercel Blob.
