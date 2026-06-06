import Link from "next/link";
import { storefrontSectionTitleTypography } from "./storefront-typography";

interface SectionHeadingProps {
  id?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function SectionHeading({
  id,
  title,
  description,
  actionLabel,
  actionHref = "/",
}: SectionHeadingProps): JSX.Element {
  return (
    <div className="mb-4 flex min-w-0 items-start justify-between gap-2 sm:mb-5 sm:items-center sm:gap-3">
      <div className="min-w-0 flex-1 max-w-3xl">
        <h2 id={id} className={`truncate text-base ${storefrontSectionTitleTypography} text-[#0F172A] sm:text-lg`}>
          {title}
        </h2>
        {description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#64748B] sm:text-sm sm:leading-6">{description}</p>
        ) : null}
      </div>
      {actionLabel ? (
        <Link
          href={actionHref}
          className="shrink-0 whitespace-nowrap text-xs font-semibold leading-5 text-[#2563EB] transition hover:text-[#1D4ED8] sm:text-sm"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
