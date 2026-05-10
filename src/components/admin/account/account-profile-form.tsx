"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AccountProfileFormProps {
  currentFullName: string;
  currentEmail: string;
  currentPhone: string;
}

type FormErrors = {
  fullName?: string;
  email?: string;
  phone?: string;
};

function validateForm(fullName: string, email: string, phone: string): FormErrors {
  const errors: FormErrors = {};
  const normalizedName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();

  if (normalizedName.length < 2) {
    errors.fullName = "Họ tên phải có ít nhất 2 ký tự.";
  }
  if (normalizedName.length > 80) {
    errors.fullName = "Họ tên không được vượt quá 80 ký tự.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.email = "Email không hợp lệ.";
  }
  if (normalizedPhone && !/^[0-9+().\-\s]{8,20}$/.test(normalizedPhone)) {
    errors.phone = "Số điện thoại không hợp lệ.";
  }
  return errors;
}

export default function AccountProfileForm({
  currentFullName,
  currentEmail,
  currentPhone,
}: AccountProfileFormProps): JSX.Element {
  const router = useRouter();
  const [fullName, setFullName] = useState(currentFullName);
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(currentPhone);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const nextErrors = validateForm(fullName, email, phone);
    setErrors(nextErrors);
    setMessage("");
    setErrorMessage("");
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setErrorMessage(payload.message ?? "Không thể lưu thông tin.");
        return;
      }
      setMessage(payload.message ?? "Cập nhật hồ sơ thành công.");
      router.refresh();
    } catch {
      setErrorMessage("Lưu thông tin thất bại. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-slate-900">Cập nhật hồ sơ</h2>
      <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Họ tên</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            placeholder="Nhập họ tên"
          />
          {errors.fullName ? <p className="text-xs text-rose-600">{errors.fullName}</p> : null}
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            placeholder="admin@zendo.vn"
          />
          {errors.email ? <p className="text-xs text-rose-600">{errors.email}</p> : null}
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Số điện thoại</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            placeholder="0564162222"
          />
          {errors.phone ? <p className="text-xs text-rose-600">{errors.phone}</p> : null}
        </label>

        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </article>
  );
}
