"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

type Props = {
  children: ReactNode;
  title?: string;
};

type State = { hasError: boolean; message: string | null };

export class AnalyticsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || "Lỗi hiển thị" };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[AnalyticsErrorBoundary]", error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
          <p className="font-semibold">{this.props.title ?? "Không tải được phần analytics này."}</p>
          <p className="mt-1 text-amber-900/90">{this.state.message}</p>
          <button
            type="button"
            className="mt-3 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            onClick={() => this.setState({ hasError: false, message: null })}
          >
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
