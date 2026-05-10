import { z } from "zod";
import { isPublicMediaUrl } from "./media-url";

export const brandFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tên thương hiệu là bắt buộc.")
    .max(120, "Tên thương hiệu tối đa 120 ký tự."),
  slug: z
    .string()
    .trim()
    .min(1, "Slug là bắt buộc.")
    .max(150, "Slug tối đa 150 ký tự.")
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
  logo: z
    .string()
    .trim()
    .max(500, "URL logo quá dài.")
    .refine((value) => value === "" || isPublicMediaUrl(value), "Logo phải thuộc media.zendo.vn.")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(1000, "Mô tả tối đa 1000 ký tự.")
    .optional()
    .or(z.literal("")),
  seoTitle: z
    .string()
    .trim()
    .max(60, "Tiêu đề SEO nên dưới 60 ký tự.")
    .optional()
    .or(z.literal("")),
  seoDescription: z
    .string()
    .trim()
    .max(160, "Mô tả SEO nên dưới 160 ký tự.")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean(),
});

export type BrandFormValues = z.infer<typeof brandFormSchema>;

export interface BrandAdminDto {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

