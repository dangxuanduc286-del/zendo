"use client";

import { memo, type ReactNode } from "react";
import { CTV_TYPE_SECTION } from "../affiliate/affiliate-ctv-account-ui-tokens";
import { CTV_V2_CONTENT } from "./ctv-ui-tokens";

type CtvAccountTabPanelProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  id?: string;
  className?: string;
};

function CtvAccountTabPanelInner({
  title,
  description,
  children,
  id,
  className = "",
}: CtvAccountTabPanelProps): JSX.Element {
  const headingId = title && id ? `${id}-heading` : undefined;

  return (
    <section
      id={id}
      className={`${CTV_V2_CONTENT} min-w-0 ${className}`}
      aria-labelledby={headingId}
    >
      {title ? (
        <header className="space-y-1">
          <h2 id={headingId} className={CTV_TYPE_SECTION}>
            {title}
          </h2>
          {description ? <p className="text-sm text-slate-500">{description}</p> : null}
        </header>
      ) : null}
      <div className={title || description ? "mt-5 min-w-0" : "min-w-0"}>{children}</div>
    </section>
  );
}

export const CtvAccountTabPanel = memo(CtvAccountTabPanelInner);
