"use client";

import { memo, useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type RtPoint = { t: number; clicks: number; online: number; conv: number };

function CreatorRealtimeSparklineInnerImpl(props: { history: RtPoint[]; windowMinutes: 5 | 15 | 60 }): JSX.Element {
  const data = useMemo(() => {
    const cutoff = Date.now() - props.windowMinutes * 60 * 1000;
    const slice = props.history.filter((p) => p.t >= cutoff);
    return slice.map((p, i) => ({
      i: i + 1,
      clicks: p.clicks,
      online: p.online,
      conv: p.conv,
    }));
  }, [props.history, props.windowMinutes]);

  if (data.length < 2) {
    return (
      <div className="flex h-28 items-center justify-center px-2 text-center text-[11px] leading-snug text-slate-500">
        Đang thu thập điểm realtime… chuyển tab hoặc đợi vài chu kỳ làm mới.
      </div>
    );
  }

  return (
    <div className="h-[7.5rem] w-full min-h-[7.5rem]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="i" hide />
          <YAxis yAxisId="a" tick={{ fontSize: 9, fill: "#94a3b8" }} width={26} axisLine={false} tickLine={false} />
          <YAxis yAxisId="b" orientation="right" tick={{ fontSize: 9, fill: "#94a3b8" }} width={22} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 11,
              backgroundColor: "#ffffff",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
            }}
            formatter={(v: number, n: string) => [v.toLocaleString("vi-VN"), n]}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} verticalAlign="top" height={22} />
          <Area
            yAxisId="a"
            type="monotone"
            dataKey="clicks"
            name="Click 5m"
            stroke="#2563eb"
            fill="#2563eb22"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            yAxisId="b"
            type="monotone"
            dataKey="online"
            name="Online"
            stroke="#10b981"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="a"
            type="monotone"
            dataKey="conv"
            name="Conv 5m"
            stroke="#f59e0b"
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const histKey = (h: RtPoint[], w: number): string =>
  `${w}:${h.length}:${h[h.length - 1]?.t ?? 0}:${h[h.length - 1]?.clicks ?? 0}`;

export default memo(CreatorRealtimeSparklineInnerImpl, (a, b) => histKey(a.history, a.windowMinutes) === histKey(b.history, b.windowMinutes));
