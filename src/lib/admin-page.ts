import { z } from "zod";

export const PAGE_STATUS_OPTIONS = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export const pageFormSchema = z.object({
  title: z.string().trim().min(3, "Tiêu đề phải có ít nhất 3 ký tự.").max(200),
  slug: z
    .string()
    .trim()
    .min(3, "Slug phải có ít nhất 3 ký tự.")
    .max(220)
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
  content: z.string().trim().min(20, "Nội dung phải có ít nhất 20 ký tự.").max(200000),
  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  status: z.enum(PAGE_STATUS_OPTIONS),
});

export type PageFormValues = z.infer<typeof pageFormSchema>;

export interface PageAdminDto {
  id: string;
  title: string;
  slug: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  status: (typeof PAGE_STATUS_OPTIONS)[number];
  publishedAt: string;
  updatedAt: string;
}

