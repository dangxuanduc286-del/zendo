"use client";

import { useState } from "react";
import { z } from "zod";

const schema = z.object({
  identifier: z.string().trim().min(3, "Vui lòng nhập email hoặc số điện thoại.").max(120),
});

export default function ForgotPasswordForm(): JSX.Element {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setMessage("");
    const parsed = schema.safeParse({ identifier });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: parsed.data.identifier }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(
        payload?.message ??
          "Nếu thông tin hợp lệ, hệ thống đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra email hoặc liên hệ quản trị.",
      );
    } catch (submitError) {
      console.error("[FORGOT_PASSWORD] submit failed", submitError);
      setMessage(
        "Nếu thông tin hợp lệ, hệ thống đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra email hoặc liên hệ quản trị.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-[#0F172A]">Email hoặc số điện thoại</span>
        <input
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]"
          placeholder="you@example.com hoặc 0564162222"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Đang xử lý..." : "Gửi yêu cầu đặt lại mật khẩu"}
      </button>
    </form>
  );
}
