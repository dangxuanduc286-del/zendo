"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminDangerButton } from "../../lib/admin-ui";

export default function SitePolicyDeleteButton({ id, title }: { id: string; title: string }): JSX.Element {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className={adminDangerButton}
      onClick={async () => {
        if (
          !window.confirm(
            `Xóa mềm chính sách “${title}”? Slug sẽ được giải phóng để tạo bản mới. Không hiển thị trên website.`,
          )
        ) {
          return;
        }
        setBusy(true);
        try {
          const res = await fetch(`/api/admin/site-policies/${id}`, { method: "DELETE" });
          if (!res.ok) {
            const p = (await res.json()) as { message?: string };
            alert(p.message ?? "Không xóa được.");
            return;
          }
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Đang xóa…" : "Xóa mềm"}
    </button>
  );
}
