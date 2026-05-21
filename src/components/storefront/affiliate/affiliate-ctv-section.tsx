"use client";

import type { ReactNode } from "react";
import { CTV_TYPE_BODY, CTV_TYPE_SECTION } from "./affiliate-ctv-account-ui-tokens";

type AffiliateCtvSectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

/** Section phẳng — spacing thay border lồng (desktop CTV). */
export function AffiliateCtvSection({
  title,
  description,
  children,
  className = "",
  id,
}: AffiliateCtvSectionProps): JSX.Element {
  const headingId = title ? `${id ?? "ctv-section"}-heading` : undefined;

  return (
    <section
      id={id}
      className={["space-y-4", className].filter(Boolean).join(" ")}
      aria-labelledby={headingId}
    >
      {title || description ? (
        <header className="space-y-1">
          {title ? (
            <h3 id={headingId} className={CTV_TYPE_SECTION}>
              {title}
            </h3>
          ) : null}
          {description ? <p className={CTV_TYPE_BODY}>{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
