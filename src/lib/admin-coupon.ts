import { z } from "zod";

export const COUPON_DISCOUNT_TYPES = ["PERCENT", "FIXED_AMOUNT", "FREE_SHIPPING"] as const;
export const COUPON_SCOPE_TYPES = ["ORDER", "SHIPPING"] as const;
export const COUPON_CURRENCY_TYPES = ["VND"] as const;

const optionalNonNegativeNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().min(0, "Giá trị không được âm.").optional());

const optionalNonNegativeInt = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int("Giới hạn phải là số nguyên.").min(0, "Giới hạn không được âm.").optional());

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Mã giảm giá phải có ít nhất 3 ký tự.")
      .max(40, "Mã giảm giá tối đa 40 ký tự.")
      .regex(/^[A-Z0-9_-]+$/, "Mã giảm giá chỉ gồm chữ in hoa, số, _ và -."),
    name: z.string().trim().min(2, "Tên chương trình phải có ít nhất 2 ký tự.").max(160),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    discountType: z.enum(COUPON_DISCOUNT_TYPES),
    scope: z.enum(COUPON_SCOPE_TYPES),
    currency: z.enum(COUPON_CURRENCY_TYPES),
    discountValue: z.coerce.number().positive("Giá trị giảm phải lớn hơn 0."),
    maxDiscountValue: optionalNonNegativeNumber,
    minOrderValue: optionalNonNegativeNumber,
    usageLimit: optionalNonNegativeInt,
    usagePerCustomer: optionalNonNegativeInt,
    startAt: z.string().trim().optional().or(z.literal("")),
    endAt: z.string().trim().optional().or(z.literal("")),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === "PERCENT" && (data.discountValue < 1 || data.discountValue > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValue"],
        message: "Giảm theo % chỉ nhận giá trị từ 1 đến 100.",
      });
    }
    if (data.startAt && data.endAt) {
      const start = new Date(data.startAt);
      const end = new Date(data.endAt);
      if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start > end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endAt"],
          message: "Ngày kết thúc phải sau ngày bắt đầu.",
        });
      }
    }
  });

export type CouponFormValues = z.infer<typeof couponFormSchema>;

export interface CouponAdminDto {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: (typeof COUPON_DISCOUNT_TYPES)[number];
  scope: (typeof COUPON_SCOPE_TYPES)[number];
  currency: (typeof COUPON_CURRENCY_TYPES)[number];
  discountValue: number;
  maxDiscountValue: number | null;
  minOrderValue: number | null;
  usageLimit: number | null;
  usagePerCustomer: number | null;
  usedCount: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "DISABLED";
  updatedAt: string;
}
