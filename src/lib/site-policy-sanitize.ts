import sanitizeHtml from "sanitize-html";

/**
 * Chuẩn hóa HTML chính sách (TipTap → storage → hiển thị), giảm XSS.
 */
export function sanitizeSitePolicyHtml(dirty: string): string {
  const trimmed = (dirty ?? "").trim();
  if (!trimmed) return "<p></p>";

  return sanitizeHtml(trimmed, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "span",
      "hr",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel", "title"],
      img: ["src", "alt", "width", "height"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      span: ["style"],
      p: ["style"],
      li: [],
    },
    allowedStyles: {
      span: {
        color: [
          /^#(0x)?[0-9a-f]+$/i,
          /^rgb\(\s*[\d.\s%]+(,\s*[\d.\s%]+){2}\s*\)$/i,
          /^rgba\(\s*[\d.\s%]+(,\s*[\d.\s%]+){3}\s*\)$/i,
        ],
      },
      p: {
        color: [
          /^#(0x)?[0-9a-f]+$/i,
          /^rgb\(\s*[\d.\s%]+(,\s*[\d.\s%]+){2}\s*\)$/i,
          /^rgba\(\s*[\d.\s%]+(,\s*[\d.\s%]+){3}\s*\)$/i,
        ],
      },
    },
    allowedSchemesByTag: {
      img: ["http", "https"],
      a: ["http", "https", "mailto", "tel"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        const href = (attribs.href ?? "").trim();
        const isExternal = href.startsWith("http://") || href.startsWith("https://");
        return {
          tagName,
          attribs: {
            ...attribs,
            target: isExternal ? "_blank" : attribs.target,
            rel: isExternal ? "noopener noreferrer" : attribs.rel,
          },
        };
      },
    },
  });
}
