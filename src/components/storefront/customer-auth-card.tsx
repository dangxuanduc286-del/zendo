"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";

type TabType = "login" | "register";

function resolveSafeCallbackUrl(callbackUrl: string | null | undefined): string {
  const value = (callbackUrl ?? "").trim();
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.startsWith("/account")) return "/";
  if (value.startsWith("/me")) return "/";
  if (value.startsWith("/profile")) return "/";
  if (value.startsWith("/admin")) return "/";
  return value || "/tai-khoan";
}

export default function CustomerAuthCard({
  callbackUrl,
  googleEnabled,
  authError,
}: {
  callbackUrl?: string | null;
  googleEnabled: boolean;
  authError?: string | null;
}): JSX.Element {
  const safeCallback = useMemo(() => resolveSafeCallbackUrl(callbackUrl), [callbackUrl]);
  const [tab, setTab] = useState<TabType>("login");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const loginAttemptSeqRef = useRef(0);
  const loginInFlightRef = useRef(false);
  const [accessDeniedNotice, setAccessDeniedNotice] = useState(
    authError === "admin-denied" ? "Tài khoản không có quyền quản trị." : "",
  );

  const inputClassName =
    "h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 pr-14 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]";

  const resetNotice = () => {
    setError("");
    setMessage("");
    setAccessDeniedNotice("");
  };

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginInFlightRef.current) return;
    loginInFlightRef.current = true;
    const attemptId = `cust_login_${Date.now()}_${++loginAttemptSeqRef.current}`;
    if (!identifier.trim()) {
      setError("Vui lòng nhập email hoặc số điện thoại.");
      loginInFlightRef.current = false;
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      loginInFlightRef.current = false;
      return;
    }
    setSubmitting(true);
    resetNotice();
    try {
      const precheckResp = await fetch("/api/auth/customer/precheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, attemptId }),
      });
      const precheck = (await precheckResp.json()) as { ok?: boolean; reason?: string };

      if (!precheck?.ok) {
        if (precheck?.reason === "ADMIN_ACCOUNT") {
          const adminCallbackUrl = `${window.location.origin}/admin`;
          const adminResult = await signIn("admin-credentials", {
            identifier,
            password,
            redirect: false,
            callbackUrl: adminCallbackUrl,
          });
          if (!adminResult?.ok) {
            setError("Sai tài khoản hoặc mật khẩu.");
            passwordInputRef.current?.focus();
            return;
          }
          window.location.assign("/admin");
          return;
        } else if (precheck?.reason === "INTERNAL") {
          setError("Không thể đăng nhập. Vui lòng thử lại.");
        } else {
          setError("Sai tài khoản hoặc mật khẩu.");
        }
        passwordInputRef.current?.focus();
        return;
      }

      const customerResult = await signIn("customer-credentials", {
        redirect: false,
        identifier,
        password,
        callbackUrl: safeCallback,
      });
      if (!customerResult?.error) {
        if (safeCallback.startsWith("/admin")) {
          setAccessDeniedNotice("Tài khoản không có quyền quản trị.");
          window.location.href = "/tai-khoan?authError=admin-denied";
          return;
        }

        setMessage("Đăng nhập thành công.");
        window.location.replace(safeCallback || "/tai-khoan");
        return;
      }

      // Không tự động thử admin-login ở màn khách hàng để tránh chậm/treo.
      // Admin đăng nhập qua `/admin/login`; đăng xuất admin chủ động về storefront (`signOutAdminVoluntary`), không ép về `/admin/login`.
      setError("Sai tài khoản hoặc mật khẩu.");
      passwordInputRef.current?.focus();
      return;
    } catch {
      setError("Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
      loginInFlightRef.current = false;
    }
  };

  const onRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!identifier.trim()) {
      setError("Vui lòng nhập email hoặc số điện thoại.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setSubmitting(true);
    resetNotice();
    try {
      const response = await fetch("/api/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, identifier, password, confirmPassword }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message ?? "Không thể đăng ký tài khoản.");
        return;
      }
      setMessage(payload.message ?? "Đăng ký thành công.");
      setTab("login");
      setConfirmPassword("");
    } catch {
      setError("Không thể đăng ký tài khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-7 lg:p-8">
      <h1 className="text-2xl font-bold text-[#0F172A]">Đăng nhập</h1>
      <p className="mt-2 text-sm leading-6 text-[#64748B]">
        Đăng nhập tài khoản Zendo.vn để mua sắm, theo dõi đơn hàng hoặc quản lý hệ thống nếu bạn có quyền.
      </p>

      <div className="mt-5 grid grid-cols-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1">
        <button
          type="button"
          onClick={() => {
            setTab("login");
            resetNotice();
          }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            tab === "login"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "text-[#64748B] hover:bg-[#EFF6FF]"
          }`}
        >
          Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("register");
            resetNotice();
          }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            tab === "register"
              ? "bg-[#2563EB] text-white shadow-sm"
              : "text-[#64748B] hover:bg-[#EFF6FF]"
          }`}
        >
          Đăng ký
        </button>
      </div>

      {tab === "login" ? (
        <form onSubmit={onLogin} className="mt-5 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[#0F172A]">Email hoặc số điện thoại</span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className={inputClassName}
              placeholder="Nhập email hoặc số điện thoại"
              autoComplete="username"
            />
          </label>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#0F172A]">Mật khẩu</span>
              <Link href="/quen-mat-khau" className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                ref={passwordInputRef}
                type={showLoginPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                aria-label={showLoginPassword ? "Ẩn mật khẩu đăng nhập" : "Hiện mật khẩu đăng nhập"}
              >
                {showLoginPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>
      ) : (
        <form onSubmit={onRegister} className="mt-5 space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[#0F172A]">Họ tên</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={inputClassName}
              placeholder="Nhập họ tên"
              autoComplete="name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[#0F172A]">Email hoặc số điện thoại</span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className={inputClassName}
              placeholder="Nhập email hoặc số điện thoại"
              autoComplete="username"
            />
          </label>
          <div className="relative space-y-1.5">
            <span className="text-sm font-medium text-[#0F172A]">Mật khẩu</span>
            <input
              type={showRegisterPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
              placeholder="Tối thiểu 8 ký tự"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowRegisterPassword((current) => !current)}
              className="absolute right-3 top-[41px] text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
              aria-label={showRegisterPassword ? "Ẩn mật khẩu đăng ký" : "Hiện mật khẩu đăng ký"}
            >
              {showRegisterPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
          <div className="relative space-y-1.5">
            <span className="text-sm font-medium text-[#0F172A]">Xác nhận mật khẩu</span>
            <input
              type={showRegisterConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClassName}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowRegisterConfirmPassword((current) => !current)}
              className="absolute right-3 top-[41px] text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
              aria-label={showRegisterConfirmPassword ? "Ẩn xác nhận mật khẩu đăng ký" : "Hiện xác nhận mật khẩu đăng ký"}
            >
              {showRegisterConfirmPassword ? "Ẩn" : "Hiện"}
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Đang xử lý..." : "Đăng ký"}
          </button>
        </form>
      )}

      <div className="mt-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#E2E8F0]" />
        <span className="text-xs font-medium text-[#64748B]">Hoặc tiếp tục với</span>
        <span className="h-px flex-1 bg-[#E2E8F0]" />
      </div>

      <button
        type="button"
        onClick={() =>
          signIn("google", { callbackUrl: safeCallback }, { prompt: "select_account" }).catch(
            () => {},
          )
        }
        disabled={!googleEnabled || submitting}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-[#0F172A] shadow-sm transition hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.8 2.9l2.9 2.2c1.7-1.5 2.7-3.8 2.7-6.5 0-.6-.1-1.2-.2-1.8H12Z" />
          <path fill="#34A853" d="M12 22c2.4 0 4.4-.8 5.8-2.1L14.9 17c-.8.6-1.8 1-2.9 1-2.2 0-4.1-1.5-4.8-3.6l-3 .2V17c1.4 2.9 4.4 5 7.8 5Z" />
          <path fill="#4A90E2" d="M7.2 14.4c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9l-3-.2A10 10 0 0 0 3.8 12c0 1.6.4 3.1 1.1 4.5l2.3-2.1Z" />
          <path fill="#FBBC05" d="M12 6.9c1.3 0 2.4.4 3.3 1.3l2.5-2.5C16.4 4.3 14.4 3.5 12 3.5c-3.4 0-6.4 2-7.8 5l3 2.3C7.9 8.4 9.8 6.9 12 6.9Z" />
        </svg>
        Tiếp tục với Google
      </button>
      {!googleEnabled ? <p className="mt-2 text-xs text-[#64748B]">Google login chưa được cấu hình.</p> : null}

      {message ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {accessDeniedNotice ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{accessDeniedNotice}</p>
      ) : null}
      {error ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
