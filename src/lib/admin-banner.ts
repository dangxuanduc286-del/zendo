import { z } from "zod";
import { isPublicMediaUrl } from "./media-url";

export const BANNER_POSITION_OPTIONS = [
  { value: "home_main", label: "Banner chính giữa" },
  { value: "home_left_top", label: "Banner phụ trái trên" },
  { value: "home_left_bottom", label: "Banner phụ trái dưới" },
  { value: "home_right_top", label: "Banner phụ phải trên" },
  { value: "home_right_bottom", label: "Banner phụ phải dưới" },
] as const;

export type BannerPositionValue = (typeof BANNER_POSITION_OPTIONS)[number]["value"];

export const bannerFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Tiêu đề banner phải có ít nhất 2 ký tự.")
    .max(160, "Tiêu đề banner tối đa 160 ký tự."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug phải có ít nhất 2 ký tự.")
    .max(180, "Slug tối đa 180 ký tự.")
    .regex(/^[a-z0-9-]+$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
  imageDesktop: z
    .string()
    .trim()
    .min(1, "Ảnh desktop là bắt buộc.")
    .max(500, "URL ảnh desktop quá dài.")
    .refine((value) => isPublicMediaUrl(value), "Ảnh desktop phải thuộc media.zendo.vn."),
  imageMobile: z
    .string()
    .trim()
    .max(500, "URL ảnh mobile quá dài.")
    .refine((value) => value === "" || isPublicMediaUrl(value), "Ảnh mobile phải thuộc media.zendo.vn.")
    .optional()
    .or(z.literal("")),
  linkUrl: z
    .string()
    .trim()
    .max(500, "URL liên kết quá dài.")
    .optional()
    .or(z.literal("")),
  position: z
    .string()
    .trim()
    .min(1, "Vui lòng chọn vị trí hiển thị.")
    .refine(
      (value) => BANNER_POSITION_OPTIONS.some((item) => item.value === value),
      "Vị trí hiển thị không hợp lệ.",
    ),
  isActive: z.boolean(),
});

export type BannerFormValues = z.infer<typeof bannerFormSchema>;

export interface BannerAdminDto {
  id: string;
  title: string;
  slug: string;
  imageDesktop: string;
  imageMobile: string;
  linkUrl: string;
  position: string;
  isActive: boolean;
  updatedAt: string;
}
