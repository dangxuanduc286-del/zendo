import type { ReactNode } from "react";

/**
 * Khối trống chuẩn cho bảng / khu vực không có dữ liệu — đồng bộ UI admin.
 */
export function AdminEmptyState(props: {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}): JSX.Element {
  const { title, description, icon, className = "" } = props;
  return (
    <div
      role="status"
      className={`flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center ${className}`}
    >
      {icon ? <div className="text-slate-400 [&>svg]:h-10 [&>svg]:w-10">{icon}</div> : null}
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description ? <p className="max-w-sm text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}
