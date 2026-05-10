import { z } from "zod";
import { isPublicMediaUrl } from "./media-url";
import { sanitizePostThumbnailUrl } from "./media";

export const POST_STATUS_OPTIONS = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export const postFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Tiêu đề bài viết phải có ít nhất 3 ký tự.")
    .max(200, "Tiêu đề bài viết tối đa 200 ký tự."),
  slug: z
    .string()
    .trim()
    .min(3, "Slug phải có ít nhất 3 ký tự.")
    .max(220, "Slug tối đa 220 ký tự.")
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
  excerpt: z
    .string()
    .trim()
    .max(500, "Đoạn trích tối đa 500 ký tự.")
    .optional()
    .or(z.literal("")),
  content: z
    .string()
    .trim()
    .min(20, "Nội dung bài viết phải có ít nhất 20 ký tự.")
    .max(200000, "Nội dung bài viết quá dài."),
  thumbnail: z
    .string()
    .trim()
    .max(500, "URL ảnh đại diện quá dài.")
    .refine(
      (value) =>
        value === "" ||
        (isPublicMediaUrl(value) && Boolean(sanitizePostThumbnailUrl(value))),
      "Ảnh đại diện phải là file upload trên media.zendo.vn (không dùng đường dẫn demo).",
    )
    .optional()
    .or(z.literal("")),
  seoTitle: z
    .string()
    .trim()
    .max(160, "Tiêu đề SEO tối đa 160 ký tự.")
    .optional()
    .or(z.literal("")),
  seoDescription: z
    .string()
    .trim()
    .max(320, "Mô tả SEO tối đa 320 ký tự.")
    .optional()
    .or(z.literal("")),
  status: z.enum(POST_STATUS_OPTIONS),
});

export type PostFormValues = z.infer<typeof postFormSchema>;

export interface PostAdminDto {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnail: string;
  seoTitle: string;
  seoDescription: string;
  status: (typeof POST_STATUS_OPTIONS)[number];
  publishedAt: string;
  updatedAt: string;
}
