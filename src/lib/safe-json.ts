export function safeParseJson<T>(value: unknown, fallback: T, context = "unknown"): T {
  void context;
  if (value == null) {
    return fallback;
  }

  if (typeof value !== "string") {
    return value as T;
  }

  const raw = value.trim();
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
