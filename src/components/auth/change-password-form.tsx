"use client";

import { useEffect, useState } from "react";

type FieldKey = "currentPassword" | "newPassword" | "confirmPassword";

export default function ChangePasswordForm(): JSX.Element {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthHint, setOauthHint] = useState("");
  const [visible, setVisible] = useState<Record<FieldKey, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  useEffect(() => {
    fetch("/api/account/password-status", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as { oauthOnly?: boolean };
        if (data.oauthOnly) {
          setOauthHint(
            "Tài khoản này đang đăng nhập bằng Google/Facebook. Bạn có thể đặt mật khẩu mới nếu muốn đăng nhập bằng mật khẩu.",
          );
        }
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Không thể đổi mật khẩu.");
        return;
      }
      setSuccess(payload.message ?? "Đổi mật khẩu thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Không thể đổi mật khẩu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleVisible = (field: FieldKey) => {
    setVisible((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"
    >
      {oauthHint ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {oauthHint}
        </p>
      ) : null}
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Mật khẩu hiện tại</span>
        <div className="flex gap-2">
          <input
            type={visible.currentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Nhập mật khẩu hiện tại"
          />
          <button
            type="button"
            onClick={() => toggleVisible("currentPassword")}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700"
          >
            {visible.currentPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Mật khẩu mới</span>
        <div className="flex gap-2">
          <input
            type={visible.newPassword ? "text" : "password"}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Ít nhất 8 ký tự"
          />
          <button
            type="button"
            onClick={() => toggleVisible("newPassword")}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700"
          >
            {visible.newPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Nhập lại mật khẩu mới</span>
        <div className="flex gap-2">
          <input
            type={visible.confirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
            placeholder="Nhập lại mật khẩu mới"
          />
          <button
            type="button"
            onClick={() => toggleVisible("confirmPassword")}
            className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700"
          >
            {visible.confirmPassword ? "Ẩn" : "Hiện"}
          </button>
        </div>
      </label>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? "Đang cập nhật..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
