import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "../globals.css";
import { getThemeSettings, getWebsiteSettings } from "../../lib/settings";
import { resolveMediaUrl } from "../../lib/media";
import AppSessionProvider from "../../components/providers/session-provider";
import { StorefrontCampaignBleedPortal } from "../../components/storefront/storefront-campaign-bleed-portal";
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
    ? await (async () => {
        try {
          return await db.setting.findUnique({
            where: { key: "website_settings" },
            select: { updatedAt: true },
          });
        } catch {
          return null;
        }
      })()
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

  const cssVars = {
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
    "--z-campaign-bg-desktop": hasCampaignBackgroundDesktop ? `url("${campaignBackgroundDesktop}")` : "none",
    "--z-campaign-bg-mobile": hasCampaignBackgroundMobile ? `url("${campaignMobileResolved}")` : "none",
  } as CSSProperties;

  return (
    <html lang="vi" style={cssVars}>
      <body
        className={`min-h-screen text-[var(--z-text-main)] antialiased ${
          showCampaignBackground ? "bg-transparent" : "bg-[var(--z-bg)]"
        }`}
      >
        {showCampaignBackground ? (
          <style>{`
            /* Tránh globals html,body { background: #fff } che nền campaign (portal fixed trên body). */
            body {
              background: transparent;
            }
          `}</style>
        ) : null}
        {showCampaignBackground ? <StorefrontCampaignBleedPortal /> : null}
        <AppSessionProvider session={session}>
          <StorefrontSupportProvider>{children}</StorefrontSupportProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
