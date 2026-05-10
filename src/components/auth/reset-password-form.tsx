"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

const schema = z
  .object({
    password: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự.").max(128),
    confirmPassword: z.string().min(8, "Vui lòng xác nhận mật khẩu.").max(128),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Xác nhận mật khẩu không khớp.",
      });
    }
  });

export default function ResetPasswordForm(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setSubmitError("");
    setSubmitMessage("");
    if (!token) {
      setSubmitError("Liên kết đặt lại mật khẩu không hợp lệ.");
      return;
    }

    const parsed = schema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setSubmitError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: parsed.data.password,
          confirmPassword: parsed.data.confirmPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; success?: boolean }
        | null;
      if (!response.ok || !payload?.success) {
        setSubmitError(payload?.message ?? "Không thể đặt lại mật khẩu.");
        return;
      }

      setSubmitMessage("Đặt lại mật khẩu thành công. Vui lòng đăng nhập.");
      router.push("/");
      router.refresh();
    } catch {
      setSubmitError("Đăng nhập thất bại do lỗi hệ thống. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Mật khẩu mới</span>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 pr-14 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
            placeholder="Nhập mật khẩu mới"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            aria-label={showPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
          >
            {showPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Xác nhận mật khẩu mới</span>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 pr-14 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
            placeholder="Nhập lại mật khẩu mới"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            aria-label={showConfirmPassword ? "Ẩn xác nhận mật khẩu mới" : "Hiện xác nhận mật khẩu mới"}
          >
            {showConfirmPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </label>

      {submitError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {submitError}
        </p>
      ) : null}

      {submitMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {submitMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
      </button>
    </form>
  );
}
