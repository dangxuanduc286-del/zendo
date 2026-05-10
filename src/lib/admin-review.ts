import { z } from "zod";
import { isPublicMediaUrl } from "./media-url";

export const REVIEW_STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"] as const;
export const REVIEW_STATUS_LABELS: Record<(typeof REVIEW_STATUS_OPTIONS)[number], string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  HIDDEN: "Ẩn",
};

export const reviewFormSchema = z.object({
  productId: z.string().trim().min(1, "Vui lòng chọn sản phẩm."),
  rating: z.number().int().min(1, "Điểm đánh giá từ 1 đến 5.").max(5, "Điểm đánh giá từ 1 đến 5."),
  title: z.string().trim().max(160, "Tiêu đề tối đa 160 ký tự.").optional().or(z.literal("")),
  content: z.string().trim().min(1, "Nội dung đánh giá không được để trống.").max(3000, "Nội dung quá dài."),
  guestName: z.string().trim().min(1, "Tên hiển thị không được để trống.").max(120),
  guestEmail: z.string().trim().email("Email không hợp lệ.").optional().or(z.literal("")),
  reviewedAt: z.string().trim().optional().or(z.literal("")),
  status: z.enum(REVIEW_STATUS_OPTIONS),
  reviewImages: z
    .array(
      z
        .string()
        .trim()
        .max(500, "URL ảnh đánh giá quá dài.")
        .refine((value) => isPublicMediaUrl(value), "Ảnh đánh giá phải thuộc media.zendo.vn."),
    )
    .max(5, "Tối đa 5 ảnh đánh giá.")
    .optional()
    .default([]),
});

export const reviewModerationSchema = z.object({
  action: z.enum(["approve", "hide", "reject"]),
});

export type ReviewFormValues = z.input<typeof reviewFormSchema>;

export interface ReviewAdminDto {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  rating: number;
  title: string;
  content: string;
  guestName: string;
  guestEmail: string;
  reviewedAt?: string;
  reviewImages: string[];
  status: (typeof REVIEW_STATUS_OPTIONS)[number];
  createdAt: string;
  updatedAt: string;
}

