import { getWebsiteSettings } from "../settings";

export interface AnalyticsTrackingSettings {
  analyticsEnabled: boolean;
  trackingEnabled: boolean;
  remarketingEventsEnabled: boolean;
}

let cached: AnalyticsTrackingSettings | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

export async function layCauHinhTrackingAnalytics(): Promise<AnalyticsTrackingSettings> {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  const settings = await getWebsiteSettings();
  const next: AnalyticsTrackingSettings = {
    analyticsEnabled: settings.analyticsEnabled,
    trackingEnabled: settings.trackingEnabled,
    remarketingEventsEnabled: settings.trackingEnabled && settings.remarketingEventsEnabled,
  };
  cached = next;
  cachedAt = now;

  return next;
}

