"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ADMIN_STATUS_OPTIONS,
  createAdminFormSchema,
  updateAdminFormSchema,
  type AdminUserDto,
  type CreateAdminFormValues,
  type RoleAdminOption,
  type UpdateAdminFormValues,
} from "../../lib/admin-user";
import { adminInput, adminPrimaryButton, adminSecondaryButton, adminSelect } from "../../lib/admin-ui";

interface AdminAdminFormProps {
  mode: "create" | "edit";
  adminId?: string;
}

type CreatePayload = CreateAdminFormValues;
type EditPayload = UpdateAdminFormValues;

const CREATE_DEFAULT_VALUES: CreatePayload = {
  fullName: "",
  email: "",
  password: "",
  roleId: "",
  status: "ACTIVE",
};

const EDIT_DEFAULT_VALUES: EditPayload = {
  fullName: "",
  email: "",
  password: "",
  roleId: "",
  status: "ACTIVE",
};

interface AdminListPayload {
  items?: AdminUserDto[];
  roles?: RoleAdminOption[];
  canManageUsers?: boolean;
  message?: string;
}

interface AdminDetailPayload {
  item?: AdminUserDto;
  roles?: RoleAdminOption[];
  canManageUsers?: boolean;
  isSelf?: boolean;
  message?: string;
}

export default function AdminAdminForm({
  mode,
  adminId,
}: AdminAdminFormProps): JSX.Element {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleAdminOption[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const createForm = useForm<CreatePayload>({
    resolver: zodResolver(createAdminFormSchema),
    defaultValues: CREATE_DEFAULT_VALUES,
  });
  const editForm = useForm<EditPayload>({
    resolver: zodResolver(updateAdminFormSchema),
    defaultValues: EDIT_DEFAULT_VALUES,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      setSubmitError("");
      if (mode === "create") {
        const response = await fetch("/api/admin/admins", { cache: "no-store" });
        const payload = (await response.json()) as AdminListPayload;
        if (!response.ok) {
          setSubmitError(payload.message ?? "Không thể tải dữ liệu vai trò.");
          setLoadingData(false);
          return;
        }
        const nextRoles = payload.roles ?? [];
        setRoles(nextRoles);
        setCanManageUsers(Boolean(payload.canManageUsers));
        if (nextRoles.length) {
          createForm.setValue("roleId", nextRoles[0].id);
        }
        setLoadingData(false);
        return;
      }

      if (!adminId) {
        setSubmitError("Thiếu ID quản trị viên.");
        setLoadingData(false);
        return;
      }

      const response = await fetch(`/api/admin/admins/${adminId}`, { cache: "no-store" });
      const payload = (await response.json()) as AdminDetailPayload;
      if (!response.ok || !payload.item) {
        setSubmitError(payload.message ?? "Không thể tải dữ liệu quản trị viên.");
        setLoadingData(false);
        return;
      }
      const nextRoles = payload.roles ?? [];
      setRoles(nextRoles);
      setCanManageUsers(Boolean(payload.canManageUsers));
      setIsSelf(Boolean(payload.isSelf));
      editForm.reset({
        fullName: payload.item.fullName,
        email: payload.item.email,
        password: "",
        roleId: payload.item.roleId,
        status: payload.item.status,
      });
      setLoadingData(false);
    };

    loadData().catch(() => {
      setSubmitError("Có lỗi xảy ra khi tải dữ liệu quản trị viên.");
      setLoadingData(false);
    });
  }, [mode, adminId, createForm, editForm]);

  const onCreate = async (values: CreatePayload) => {
    setSubmitError("");
    const response = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể tạo quản trị viên.");
      return;
    }
    router.push("/admin/admins");
    router.refresh();
  };

  const onEdit = async (values: EditPayload) => {
    setSubmitError("");
    if (!adminId) return;
    const response = await fetch(`/api/admin/admins/${adminId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setSubmitError(payload.message ?? "Không thể cập nhật quản trị viên.");
      return;
    }
    router.push("/admin/admins");
    router.refresh();
  };

  if (loadingData) {
    return (
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 text-sm text-[#64748B]">
        Đang tải dữ liệu...
      </section>
    );
  }

  const currentForm = mode === "create" ? createForm : editForm;
  const { register, handleSubmit, formState } = currentForm;
  const errors = formState.errors;

  const disableRoleAndStatus = mode === "edit" && !canManageUsers;
  const disablePassword = mode === "edit" && !canManageUsers && !isSelf;

  return (
    <form
      onSubmit={handleSubmit(mode === "create" ? onCreate : onEdit)}
      className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-[#0F172A]">Họ tên *</span>
          <input
            {...register("fullName")}
            className={adminInput}
            placeholder="Nhập họ tên quản trị viên"
          />
          {"fullName" in errors && errors.fullName ? (
            <p className="text-xs text-rose-600">{errors.fullName.message}</p>
          ) : null}
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-[#0F172A]">Email *</span>
          <input
            {...register("email")}
            type="email"
            className={adminInput}
            placeholder="admin@zendo.vn"
          />
          {"email" in errors && errors.email ? (
            <p className="text-xs text-rose-600">{errors.email.message}</p>
          ) : null}
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-[#0F172A]">
            {mode === "create" ? "Mật khẩu *" : "Mật khẩu mới (để trống nếu không đổi)"}
          </span>
          <div className="flex gap-2">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              disabled={disablePassword}
              className={`${adminInput} disabled:bg-slate-100`}
              placeholder="Nhập mật khẩu"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className={adminSecondaryButton}
            >
              {showPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
          {"password" in errors && errors.password ? (
            <p className="text-xs text-rose-600">{errors.password.message}</p>
          ) : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-[#0F172A]">Vai trò *</span>
          <select
            {...register("roleId")}
            disabled={disableRoleAndStatus}
            className={`${adminSelect} disabled:bg-slate-100`}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          {"roleId" in errors && errors.roleId ? (
            <p className="text-xs text-rose-600">{errors.roleId.message}</p>
          ) : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-[#0F172A]">Trạng thái *</span>
          <select
            {...register("status")}
            disabled={disableRoleAndStatus}
            className={`${adminSelect} disabled:bg-slate-100`}
          >
            {ADMIN_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {"status" in errors && errors.status ? (
            <p className="text-xs text-rose-600">{errors.status.message}</p>
          ) : null}
        </label>
      </div>

      {submitError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className={`${adminPrimaryButton} disabled:opacity-60`}
        >
          {formState.isSubmitting
            ? "Đang lưu..."
            : mode === "create"
              ? "Tạo quản trị viên"
              : "Cập nhật quản trị viên"}
        </button>
        <Link
          href="/admin/admins"
          className={adminSecondaryButton}
        >
          Hủy
        </Link>
      </div>
    </form>
  );
}

