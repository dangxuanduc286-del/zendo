"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { adminPrimaryButton, adminSecondaryButton } from "../../lib/admin-ui";

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, "Email hoặc số điện thoại không hợp lệ.")
    .max(120, "Thông tin đăng nhập quá dài."),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự.")
    .max(128, "Mật khẩu quá dài."),
});

interface FormState {
  identifier: string;
  password: string;
}

const INITIAL_STATE: FormState = {
  identifier: "",
  password: "",
};

export default function AdminLoginForm(): JSX.Element {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const identifierPrefill = searchParams.get("identifier") || "";

  const [formState, setFormState] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!identifierPrefill) return;
    setFormState((prev) => (prev.identifier ? prev : { ...prev, identifier: identifierPrefill }));
  }, [identifierPrefill]);

  const resolveSafeCallbackUrl = (url: string): string => {
    if (!url.startsWith("/")) return "/";
    if (url.startsWith("//")) return "/";
    if (url.startsWith("/tai-khoan")) return "/";
    if (url.startsWith("/account")) return "/";
    if (url.startsWith("/me")) return "/";
    if (url.startsWith("/profile")) return "/";
    // Admin login: cho phép điều hướng nội bộ trong /admin sau khi đăng nhập.
    if (url.startsWith("/admin")) return url;
    return "/";
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitError("");
    const parsed = loginSchema.safeParse(formState);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "identifier" || field === "password") {
          nextErrors[field] = issue.message;
        }
      }
      setErrors(nextErrors);

      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const safeCallbackUrl = resolveSafeCallbackUrl(callbackUrl);
      const result = await signIn("admin-credentials", {
        identifier: parsed.data.identifier,
        password: parsed.data.password,
        redirect: false,
        callbackUrl: safeCallbackUrl,
      });
      if (!result) {
        setSubmitError("Không thể kết nối máy chủ đăng nhập.");
        return;
      }
      if (result.error) {
        setSubmitError("Sai tài khoản hoặc mật khẩu.");
        return;
      }

      window.location.assign(safeCallbackUrl || "/");
    } catch {
      setSubmitError("Đăng nhập thất bại do lỗi hệ thống. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Email hoặc số điện thoại</span>
        <input
          type="text"
          autoComplete="username"
          value={formState.identifier}
          onChange={(event) => setFormState((prev) => ({ ...prev, identifier: event.target.value }))}
          className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-500"
          placeholder="admin@zendo.vn hoặc 0564162222"
        />
        {errors.identifier ? (
          <p className="text-xs font-medium text-rose-600">{errors.identifier}</p>
        ) : null}
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Mật khẩu</span>
        <div className="flex gap-2">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={formState.password}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, password: event.target.value }))
            }
            className="h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-zinc-500"
            placeholder="Nhập mật khẩu"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className={`${adminSecondaryButton} h-11`}
          >
            {showPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
        {errors.password ? (
          <p className="text-xs font-medium text-rose-600">{errors.password}</p>
        ) : null}
        <div className="pt-1 text-right">
          <Link
            href="/quen-mat-khau"
            className="text-xs font-medium text-zinc-700 underline-offset-2 hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>
      </label>

      {submitError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`${adminPrimaryButton} h-11 w-full`}
      >
        {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
