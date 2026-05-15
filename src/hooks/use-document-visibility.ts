"use client";

import { useEffect, useState } from "react";

/** `false` khi tab hidden — dùng để tắt interval / bỏ qua fetch (tránh race với HMR). */
export function useDocumentVisibility(): boolean {
  const [visible, setVisible] = useState(() => (typeof document === "undefined" ? true : !document.hidden));

  useEffect(() => {
    const onVis = (): void => {
      setVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return visible;
}
