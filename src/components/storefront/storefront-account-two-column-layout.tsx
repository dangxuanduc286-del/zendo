import { memo, type ReactNode } from "react";

type StorefrontAccountTwoColumnLayoutProps = {
  sidebar: ReactNode;
  children: ReactNode;
  /** Gắn id cho vùng nội dung (anchor / QA). */
  contentId?: string;
};

/**
 * Sidebar trái cố định + vùng nội dung phải (min-w-0) — dùng chung tài khoản khách / CTV.
 */
function StorefrontAccountTwoColumnLayoutInner({
  sidebar,
  children,
  contentId,
}: StorefrontAccountTwoColumnLayoutProps): JSX.Element {
  return (
    <section
      aria-label="Bố cục tài khoản"
      className="flex w-full min-w-0 flex-col gap-4 overflow-x-hidden lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:overflow-visible"
    >
      <aside className="hidden min-h-0 w-full min-w-0 shrink-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:block lg:sticky lg:top-6 lg:h-fit lg:max-h-[calc(100dvh-5rem)] lg:w-full lg:max-w-[260px] lg:overflow-y-auto lg:overscroll-contain lg:self-start lg:rounded-[28px] lg:border-slate-200 lg:bg-white lg:p-4 lg:shadow-sm">
        {sidebar}
      </aside>
      <main
        id={contentId}
        className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden lg:space-y-6"
      >
        {children}
      </main>
    </section>
  );
}

export const StorefrontAccountTwoColumnLayout = memo(StorefrontAccountTwoColumnLayoutInner);
