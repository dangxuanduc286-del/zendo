import Link from "next/link";

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
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2.5 sm:mb-5 sm:gap-3">
      <div className="min-w-0 max-w-3xl">
        <h2 id={id} className="text-base font-semibold tracking-tight text-[#0F172A] sm:text-lg">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-[#64748B] sm:text-sm sm:leading-6">{description}</p>
        ) : null}
      </div>
      {actionLabel ? (
        <Link
          href={actionHref}
          className="shrink-0 text-xs font-semibold text-[#2563EB] transition hover:text-[#1D4ED8] sm:text-sm"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
