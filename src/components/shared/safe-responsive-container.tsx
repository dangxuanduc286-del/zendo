"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type Size = { width: number; height: number };

export default function SafeResponsiveContainer({
  className,
  minHeight = 1,
  children,
}: {
  className?: string;
  /** Fallback min-height to avoid 0-height during layout transitions. */
  minHeight?: number;
  children: (size: Size) => ReactNode;
}): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      });
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={minHeight ? { minHeight } : undefined}>
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}

