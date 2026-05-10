export interface LocationOption {
  label: string;
  value: string;
}

export function normalizeLocationName(name: string): string {
  if (!name) return "";
  return name
    .replace(/^(tinh|thanh pho|tp\.?)\s+/i, "")
    .replace(/^(huyen|quan|thi xa|tx\.?)\s+/i, "")
    .replace(/^(xa|phuong|thi tran|tt\.?)\s+/i, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchLocationCode(savedText: string, options: LocationOption[]): string | null {
  if (!savedText || !options.length) return null;
  const normalizedSaved = normalizeLocationName(savedText);
  const exactMatch = options.find((option) => normalizeLocationName(option.label) === normalizedSaved);
  if (exactMatch) return exactMatch.value;
  const containsMatch = options.find((option) => {
    const normalizedLabel = normalizeLocationName(option.label);
    return normalizedSaved.includes(normalizedLabel) || normalizedLabel.includes(normalizedSaved);
  });
  return containsMatch?.value ?? null;
}
