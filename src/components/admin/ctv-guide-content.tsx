import type { JSX } from "react";

function renderBodyLines(bodyLines: string[], blockIndex: number): JSX.Element[] {
  const nodes: JSX.Element[] = [];
  let para: string[] = [];
  let bullets: string[] = [];
  let part = 0;

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join("\n");
    nodes.push(
      <p
        key={`${blockIndex}-p-${part++}`}
        className="text-sm leading-relaxed text-[#334155] whitespace-pre-wrap"
      >
        {text}
      </p>,
    );
    para = [];
  };

  const flushBullets = () => {
    if (!bullets.length) return;
    nodes.push(
      <ul key={`${blockIndex}-ul-${part++}`} className="list-disc space-y-1.5 pl-5 text-sm text-[#334155]">
        {bullets.map((b, i) => (
          <li key={i}>{b.replace(/^[-*•]\s+/, "").trim()}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const line of bodyLines) {
    if (/^[-*•]\s/.test(line)) {
      flushPara();
      bullets.push(line);
    } else {
      flushBullets();
      para.push(line);
    }
  }
  flushPara();
  flushBullets();
  return nodes;
}

/**
 * Hiển thị nội dung hướng dẫn dạng văn bản thuần (không HTML thô).
 * Khối bắt đầu bằng "1. Tiêu đề" / "2. ..." được tách thành section có tiêu đề.
 */
export default function CtvGuideContent({ content }: { content: string }): JSX.Element {
  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div className="space-y-5 sm:space-y-6">
      {blocks.map((block, idx) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (!lines.length) return null;

        const first = lines[0]!;
        const headingMatch = first.match(/^(\d+)\.\s+(.+)$/);
        if (headingMatch) {
          const titleText = `${headingMatch[1]}. ${headingMatch[2]}`;
          const bodyLines = lines.slice(1);
          return (
            <section
              key={idx}
              className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5"
            >
              <h3 className="text-base font-semibold tracking-tight text-[#0F172A]">{titleText}</h3>
              {bodyLines.length ? (
                <div className="mt-3 space-y-3">{renderBodyLines(bodyLines, idx)}</div>
              ) : null}
            </section>
          );
        }

        return (
          <p
            key={idx}
            className="text-sm leading-relaxed text-[#334155] whitespace-pre-wrap rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5"
          >
            {block.trim()}
          </p>
        );
      })}
    </div>
  );
}
