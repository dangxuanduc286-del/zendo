"use client";

import { useMemo, useState } from "react";

export type AffiliateAdminGuideStep = {
  id: number;
  title: string;
  summary: string;
  purpose: string;
  location: string;
  checkItems: string[];
  expected: string;
  status: string;
  statusTone: "ok" | "warn" | "info";
};

function statusClass(tone: AffiliateAdminGuideStep["statusTone"]): string {
  if (tone === "ok") return "bg-emerald-100 text-emerald-800";
  if (tone === "warn") return "bg-amber-100 text-amber-900";
  return "bg-sky-100 text-sky-800";
}

export default function AffiliateAdminGuideSteps({
  steps,
}: {
  steps: AffiliateAdminGuideStep[];
}): JSX.Element {
  const initialStepId = steps[0]?.id ?? 1;
  const [activeStepId, setActiveStepId] = useState<number>(initialStepId);

  const activeStep = useMemo(
    () => steps.find((step) => step.id === activeStepId) ?? steps[0],
    [activeStepId, steps],
  );

  if (!activeStep) {
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
        Chưa có dữ liệu hướng dẫn.
      </div>
    );
  }

  return (
    <article className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5">
      <h3 className="text-base font-semibold text-[#0F172A]">Quy trình vận hành CTV dành cho Admin</h3>
      <p className="mt-1 text-sm text-[#64748B]">
        Chọn từng bước để xem hướng dẫn chi tiết thao tác quản trị.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="overflow-x-auto lg:overflow-visible">
          <div className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
            {steps.map((step) => {
              const isActive = step.id === activeStep.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStepId(step.id)}
                  className={`group min-w-[240px] rounded-2xl border p-3 text-left transition lg:min-w-0 ${
                    isActive
                      ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm"
                      : "border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#2563EB]/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${
                        isActive ? "bg-white text-[#2563EB]" : "bg-[#2563EB] text-white"
                      }`}
                    >
                      {step.id}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-[#0F172A]"}`}>
                        {step.title}
                      </p>
                      <p className={`mt-1 text-xs ${isActive ? "text-sky-100" : "text-[#64748B]"}`}>
                        {step.summary}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#2563EB] px-2 text-xs font-bold text-white">
              {activeStep.id}
            </span>
            <h4 className="text-base font-semibold text-[#0F172A]">{activeStep.title}</h4>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(activeStep.statusTone)}`}>
              {activeStep.status}
            </span>
          </div>

          <div className="mt-3 space-y-2 text-sm text-[#334155]">
            <p>
              <span className="font-medium text-[#0F172A]">Mô tả ngắn:</span> {activeStep.summary}
            </p>
            <p>
              <span className="font-medium text-[#0F172A]">Mục đích:</span> {activeStep.purpose}
            </p>
            <p>
              <span className="font-medium text-[#0F172A]">Admin thao tác ở đâu:</span> {activeStep.location}
            </p>
            <div>
              <span className="font-medium text-[#0F172A]">Cần kiểm tra gì:</span>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#334155]">
                {activeStep.checkItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <p>
              <span className="font-medium text-[#0F172A]">Kết quả mong đợi:</span> {activeStep.expected}
            </p>
          </div>
        </section>
      </div>
    </article>
  );
}

