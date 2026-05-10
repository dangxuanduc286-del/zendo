/** Chỉ dùng storefront/client — không import DB. */

export type SitePolicyPublicType =
  | "WARRANTY_LOOKUP_POLICY"
  | "RETURN_POLICY"
  | "AFFILIATE_POLICY"
  | "PRIVACY_POLICY"
  | "SHIPPING_POLICY"
  | "CUSTOM";

export type PolicyHubCard = {
  slug: string;
  title: string;
  excerpt: string;
  href: string;
  type: SitePolicyPublicType;
};

export function sitePolicyTypeIcon(type: SitePolicyPublicType): string {
  switch (type) {
    case "WARRANTY_LOOKUP_POLICY":
      return "🛡️";
    case "RETURN_POLICY":
      return "↩️";
    case "AFFILIATE_POLICY":
      return "🤝";
    case "PRIVACY_POLICY":
      return "🔒";
    case "SHIPPING_POLICY":
      return "🚚";
    default:
      return "📄";
  }
}
