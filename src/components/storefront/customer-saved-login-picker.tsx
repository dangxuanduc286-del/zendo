"use client";

import MediaImage from "../shared/media-image";
import type { CustomerSavedLoginProfile } from "../../lib/customer-saved-login-profiles";

function profileLabel(profile: CustomerSavedLoginProfile): string {
  const name = profile.displayName.trim();
  if (name && name !== profile.identifier.trim()) return name;
  return profile.identifier.trim();
}

function profileInitial(profile: CustomerSavedLoginProfile): string {
  const label = profileLabel(profile);
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return (label[0] ?? "?").toUpperCase();
}

export default function CustomerSavedLoginPicker({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: CustomerSavedLoginProfile[];
  selectedId: string | null;
  onSelect: (profile: CustomerSavedLoginProfile) => void;
}): JSX.Element | null {
  if (profiles.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Tài khoản đã lưu</p>
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {profiles.map((profile) => {
          const active = selectedId === profile.id;
          const label = profileLabel(profile);
          const avatar = profile.avatarUrl?.trim();
          return (
            <li key={profile.id} className="shrink-0">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelect(profile);
                }}
                aria-pressed={active}
                className={`flex w-[108px] flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center transition ${
                  active
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                    : "border-[#E2E8F0] bg-white hover:border-emerald-300 hover:bg-[#F8FAFC] active:bg-emerald-50"
                }`}
              >
                <span
                  className={`relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#E2E8F0] text-sm font-bold text-[#475569] ${
                    active ? "ring-2 ring-emerald-500" : ""
                  }`}
                >
                  {avatar ? (
                    <MediaImage
                      src={avatar}
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      fallbackLabel={label}
                    />
                  ) : (
                    profileInitial(profile)
                  )}
                </span>
                <span className="line-clamp-2 w-full text-xs font-semibold leading-snug text-[#0F172A]">{label}</span>
                <span className="line-clamp-1 w-full text-[10px] text-[#64748B]">{profile.identifier}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
