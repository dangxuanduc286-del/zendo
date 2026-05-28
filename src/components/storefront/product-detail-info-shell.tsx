import type { CSSProperties, ReactNode } from "react";

interface ProductDetailInfoShellProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export default function ProductDetailInfoShell({
  children,
  className = "",
  style,
}: ProductDetailInfoShellProps): JSX.Element {
  return (
    <div className="min-w-0 xl:col-start-2 xl:row-start-1 xl:h-[545px] xl:max-h-full xl:min-h-0 xl:self-start">
      <section
        className={`box-border min-w-0 overflow-hidden xl:h-full xl:max-h-full xl:min-h-0 ${className}`}
        style={style}
      >
        <div className="flex min-h-0 min-w-0 flex-col gap-3.5 overflow-x-clip md:gap-4 xl:h-full xl:max-h-full xl:gap-3">
          {children}
        </div>
      </section>
    </div>
  );
}
