import { z } from "zod";

export const ADMIN_STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export const createAdminFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ tên phải có ít nhất 2 ký tự.")
    .max(120, "Họ tên tối đa 120 ký tự."),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ.")
    .max(200, "Email tối đa 200 ký tự."),
  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
    .max(128, "Mật khẩu tối đa 128 ký tự."),
  roleId: z.string().trim().min(1, "Vai trò là bắt buộc."),
  status: z.enum(ADMIN_STATUS_OPTIONS),
});

export const updateAdminFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Họ tên phải có ít nhất 2 ký tự.")
    .max(120, "Họ tên tối đa 120 ký tự."),
  email: z
    .string()
    .trim()
    .email("Email không hợp lệ.")
    .max(200, "Email tối đa 200 ký tự."),
  password: z
    .string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
    .max(128, "Mật khẩu tối đa 128 ký tự.")
    .optional()
    .or(z.literal("")),
  roleId: z.string().trim().min(1, "Vai trò là bắt buộc."),
  status: z.enum(ADMIN_STATUS_OPTIONS),
});

export type CreateAdminFormValues = z.infer<typeof createAdminFormSchema>;
export type UpdateAdminFormValues = z.infer<typeof updateAdminFormSchema>;

export interface RoleAdminOption {
  id: string;
  name: string;
  slug: string;
}

export interface AdminUserDto {
  id: string;
  fullName: string;
  email: string;
  roleId: string;
  roleName: string;
  status: (typeof ADMIN_STATUS_OPTIONS)[number];
  updatedAt: string;
}

