"use client";

import { useEffect, useState } from "react";
import type { CtvMembershipTierRecord } from "./ctv-membership-tier-types";

type TiersResponse = { tiers: CtvMembershipTierRecord[] };

export function useCtvMembershipTiers(): {
  tiers: CtvMembershipTierRecord[];
  loading: boolean;
  error: boolean;
} {
  const [tiers, setTiers] = useState<CtvMembershipTierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/ctv/membership-tiers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch failed"))))
      .then((data: TiersResponse) => {
        if (!cancelled) {
          setTiers(data.tiers ?? []);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { tiers, loading, error };
}
