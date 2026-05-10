import { z } from "zod";

export const SITE_POLICY_TYPE_VALUES = [
  "WARRANTY_LOOKUP_POLICY",
  "RETURN_POLICY",
  "AFFILIATE_POLICY",
  "PRIVACY_POLICY",
  "SHIPPING_POLICY",
  "CUSTOM",
] as const;

export type SitePolicyTypeValue = (typeof SITE_POLICY_TYPE_VALUES)[number];

export const sitePolicyTypeSchema = z.enum(SITE_POLICY_TYPE_VALUES);

export const sitePolicySlugSchema = z
  .string()
  .min(1, "Slug không được để trống.")
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang.");

export const sitePolicyFormSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống.").max(200),
  slug: sitePolicySlugSchema,
  type: sitePolicyTypeSchema,
  content: z.string(),
  excerpt: z.string().max(500),
  isPublished: z.boolean(),
  sortOrder: z.number().int().min(0).max(999_999),
});

export type SitePolicyFormValues = z.infer<typeof sitePolicyFormSchema>;

export const SITE_POLICY_TYPE_LABELS: Record<SitePolicyTypeValue, string> = {
  WARRANTY_LOOKUP_POLICY: "Tra cứu bảo hành",
  RETURN_POLICY: "Đổi trả",
  AFFILIATE_POLICY: "CTV / Affiliate",
  PRIVACY_POLICY: "Bảo mật / riêng tư",
  SHIPPING_POLICY: "Vận chuyển",
  CUSTOM: "Tùy chỉnh",
};

export type SitePolicyAdminDto = {
  id: string;
  title: string;
  slug: string;
  type: SitePolicyTypeValue;
  content: string;
  excerpt: string;
  isPublished: boolean;
  sortOrder: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
