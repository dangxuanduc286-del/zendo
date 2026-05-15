"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  adminCardBodyLoose,
  adminInputLg,
  adminLabel,
  adminPrimaryButtonLg,
} from "@/lib/admin-ui";

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

const cardHeading =
  "mb-5 border-b border-slate-100 pb-4 text-lg font-semibold tracking-tight text-slate-900";

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
    <article className={`${adminCardBodyLoose} flex flex-col`}>
      <h2 className={cardHeading}>Cập nhật hồ sơ</h2>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className={adminLabel}>Họ tên</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={adminInputLg}
            placeholder="Nhập họ tên"
          />
          {errors.fullName ? <p className="text-xs text-rose-600">{errors.fullName}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className={adminLabel}>Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={adminInputLg}
            placeholder="admin@zendo.vn"
          />
          {errors.email ? <p className="text-xs text-rose-600">{errors.email}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className={adminLabel}>Số điện thoại</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={adminInputLg}
            placeholder="0564162222"
          />
          {errors.phone ? <p className="text-xs text-rose-600">{errors.phone}</p> : null}
        </label>

        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="pt-1">
          <button type="submit" disabled={isSaving} className={adminPrimaryButtonLg}>
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </article>
  );
}
