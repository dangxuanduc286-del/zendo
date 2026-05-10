"use client";

import SectionHeading from "../section-heading";

export default function DealsSectionHeader({
  title,
  subtitle,
  actionHref = "/cua-hang",
  actionLabel = "Xem thêm →",
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
}): JSX.Element {
  return (
    <SectionHeading
      title={title}
      description={subtitle || ""}
      actionLabel={actionLabel}
      actionHref={actionHref}
    />
  );
}

