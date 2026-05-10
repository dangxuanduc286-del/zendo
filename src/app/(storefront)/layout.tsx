import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "../globals.css";
import { getThemeSettings, getWebsiteSettings } from "../../lib/settings";
import { resolveMediaUrl } from "../../lib/media";
import AppSessionProvider from "../../components/providers/session-provider";
import { StorefrontSupportProvider } from "../../components/support/storefront-support-provider";
import { getDbClient, getSafeStorefrontSession, sanitizeCampaignBackgroundUrl } from "./_storefront-layout-shared";

interface StorefrontLayoutProps {
  children: ReactNode;
}

export async function generateMetadata(): Promise<Metadata> {
  const [settings, db] = await Promise.all([getWebsiteSettings(), getDbClient()]);
  const faviconUrl = resolveMediaUrl(settings.faviconUrl);
  if (!faviconUrl) return {};
  const websiteSettingRow = db
    ? await db.setting.findUnique({
        where: { key: "website_settings" },
        select: { updatedAt: true },
      })
    : null;
  const mediaVersion = websiteSettingRow?.updatedAt
    ? String(new Date(websiteSettingRow.updatedAt).getTime())
    : "";
  const separator = faviconUrl.includes("?") ? "&" : "?";
  const faviconWithVersion = mediaVersion
    ? `${faviconUrl}${separator}v=${encodeURIComponent(mediaVersion)}`
    : faviconUrl;
  return {
    icons: {
      icon: [{ url: faviconWithVersion }],
      shortcut: [{ url: faviconWithVersion }],
      apple: [{ url: faviconWithVersion }],
    },
  };
}

export default async function StorefrontLayout({
  children,
}: StorefrontLayoutProps): Promise<JSX.Element> {
  const [themeSettings, session] = await Promise.all([getThemeSettings(), getSafeStorefrontSession()]);

  const campaignBackgroundDesktop =
    themeSettings.campaignBackgroundEnabled
      ? sanitizeCampaignBackgroundUrl(themeSettings.campaignBackgroundImage)
      : "";
  const campaignBackgroundMobile =
    themeSettings.campaignBackgroundEnabled
      ? sanitizeCampaignBackgroundUrl(themeSettings.campaignBackgroundMobileImage)
      : "";
  const hasCampaignBackgroundDesktop = Boolean(campaignBackgroundDesktop);
  const campaignMobileResolved = campaignBackgroundMobile || campaignBackgroundDesktop;
  const hasCampaignBackgroundMobile = Boolean(campaignMobileResolved);
  const showCampaignBackground = themeSettings.campaignBackgroundEnabled && hasCampaignBackgroundDesktop;
  const palette = {
    primary: themeSettings.primaryColor || "#2563EB",
    hover: "#1D4ED8",
    secondary: themeSettings.secondaryColor || "#0F172A",
    cta: "#F59E0B",
    background: "#F8FAFC",
    card: "#FFFFFF",
    border: "#E2E8F0",
    textMain: "#0F172A",
    textMuted: "#64748B",
  };

  return (
    <html lang="vi">
      <body
        className="min-h-screen bg-[var(--z-bg)] text-[var(--z-text-main)] antialiased"
        style={
          {
            "--z-primary": palette.primary,
            "--z-primary-hover": palette.hover,
            "--z-secondary": palette.secondary,
            "--z-cta": palette.cta,
            "--z-bg": showCampaignBackground ? "transparent" : palette.background,
            "--z-card": palette.card,
            "--z-border": palette.border,
            "--z-text-main": palette.textMain,
            "--z-text-muted": palette.textMuted,
            "--z-campaign-bg-color": "#F8FAFC",
            "--z-campaign-bg-desktop": hasCampaignBackgroundDesktop
              ? `url("${campaignBackgroundDesktop}")`
              : "none",
            "--z-campaign-bg-mobile": hasCampaignBackgroundMobile
              ? `url("${campaignMobileResolved}")`
              : "none",
          } as CSSProperties
        }
      >
        <style>{`
          body {
            background-color: var(--z-campaign-bg-color, #F8FAFC);
          }
        `}</style>
        {showCampaignBackground ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 z-0 hidden bg-cover bg-top bg-no-repeat md:block"
              style={{ backgroundImage: "var(--z-campaign-bg-desktop, none)" }}
            />
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 z-0 bg-cover bg-top bg-no-repeat md:hidden"
              style={{ backgroundImage: "var(--z-campaign-bg-mobile, none)" }}
            />
          </>
        ) : null}
        <AppSessionProvider session={session}>
          <StorefrontSupportProvider>{children}</StorefrontSupportProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
