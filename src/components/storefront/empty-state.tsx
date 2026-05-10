import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref = "/",
}: EmptyStateProps): JSX.Element {
  return (
    <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-14 text-center">
      <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">{description}</p>
      {actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
