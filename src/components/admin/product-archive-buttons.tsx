"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductAdminDto } from "../../lib/admin-product";

interface ProductArchiveButtonsProps {
  productId: string;
  onArchived: () => void;
}

export default function ProductArchiveButtons({
  productId,
  onArchived,
}: ProductArchiveButtonsProps): JSX.Element {
  const [isArchiving, setIsArchiving] = useState(false);

  const archiveProduct = async () => {
    if (isArchiving) return;
    setIsArchiving(true);
    try {
      const detailResponse = await fetch(`/api/admin/products/${productId}`, { cache: "no-store" });
      const detailPayload = (await detailResponse.json()) as { item?: ProductAdminDto; message?: string };
      if (!detailResponse.ok || !detailPayload.item) {
        throw new Error(detailPayload.message ?? "Không thể tải dữ liệu sản phẩm.");
      }

      const current = detailPayload.item;
      const patchResponse = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...current,
          status: "ARCHIVED",
          rememberWarrantyAsDefault: false,
        }),
      });
      const patchPayload = (await patchResponse.json()) as { message?: string };
      if (!patchResponse.ok) {
        throw new Error(patchPayload.message ?? "Không thể lưu trữ sản phẩm.");
      }
      onArchived();
    } catch {
      // keep silent to avoid noisy table UI; parent table handles reload status
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <Link
        href={`/admin/products/${productId}`}
        className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700"
      >
        Sửa
      </Link>
      <button
        type="button"
        onClick={archiveProduct}
        disabled={isArchiving}
        className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-700 disabled:opacity-60"
      >
        {isArchiving ? "Đang lưu trữ..." : "Lưu trữ"}
      </button>
    </>
  );
}
