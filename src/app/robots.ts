import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "../lib/utils";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolveSiteUrl().replace(/\/+$/, "");


  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/login", "/api/admin", "/api/auth", "/api/auth/error", "/api/auth/callback/*"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
