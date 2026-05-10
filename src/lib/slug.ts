export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function ensureUniqueSlug(slug: string, suffix?: string | number): string {
  if (!suffix) return slugify(slug);
  return `${slugify(slug)}-${suffix}`;
}
