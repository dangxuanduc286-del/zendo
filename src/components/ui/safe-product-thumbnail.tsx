"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { clampNextImageQuality } from "@/lib/next-image-quality";

function configuredMediaHosts(): string[] {
  const hosts = new Set<string>(["media.zendo.vn"]);
  const base = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL?.trim() : "";
  if (base) {
    try {
      hosts.add(new URL(base).hostname);
    } catch {
      /* ignore */
    }
  }
  return [...hosts];
}

function canOptimizeRemoteImage(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return configuredMediaHosts().includes(u.hostname);
  } catch {
    return false;
  }
}

/** next/image với unoptimized cho URL ngoài remotePatterns — tránh lỗi build. */
export function SafeProductThumbnail(props: {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
}): JSX.Element {
  const size = props.size ?? 40;
  const cls = props.className ?? `h-10 w-10 shrink-0 rounded-lg object-cover`;
  const s = props.src?.trim();
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [s]);

  if (!s || broken) {
    return <div className={`shrink-0 rounded-lg bg-slate-100 ${cls}`} style={{ width: size, height: size }} aria-hidden />;
  }
  const optimizable = canOptimizeRemoteImage(s);
  return (
    <Image
      src={s}
      alt={props.alt}
      width={size}
      height={size}
      className={cls}
      sizes={`${size}px`}
      quality={clampNextImageQuality(80)}
      unoptimized={!optimizable}
      onError={() => setBroken(true)}
    />
  );
}
