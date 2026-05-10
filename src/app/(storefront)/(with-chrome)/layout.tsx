import type { ReactNode } from "react";
import { Suspense } from "react";
import Script from "next/script";
import StoreHeader from "../../../components/layout/store-header";
import MobileBottomNav from "../../../components/storefront/mobile-bottom-nav";
import AnalyticsPageViewTracker from "../../../components/storefront/analytics-page-view-tracker";
import StorefrontPopup from "../../../components/storefront/storefront-popup";
import { resolveMediaUrl } from "../../../lib/media";
import { STOREFRONT_FRAME } from "../../../lib/storefront-frame";
import {
  getHeaderCategories,
  getHeaderPages,
  getSafeStorefrontSession,
  getSafeWebsiteSettings,
  sanitizeClarityId,
  sanitizeGa4Id,
  sanitizeGenericPixelId,
  sanitizeGtmId,
  sanitizeMetaPixelId,
} from "../_storefront-layout-shared";

interface Props {
  children: ReactNode;
}

export default async function StorefrontChromeLayout({ children }: Props): Promise<JSX.Element> {
  const [websiteSettings, categories, pages, session] = await Promise.all([
    getSafeWebsiteSettings(),
    getHeaderCategories(),
    getHeaderPages(),
    getSafeStorefrontSession(),
  ]);
  const isAdminRole =
    session?.user?.role === "SUPER_ADMIN" ||
    session?.user?.role === "CONTENT_MANAGER" ||
    session?.user?.role === "ADMIN";
  const showAdminNav = websiteSettings.showHeaderAdminMenu;

  const trackingEnabled = websiteSettings.trackingEnabled;
  const gaId =
    trackingEnabled && websiteSettings.ga4ScriptEnabled
      ? sanitizeGa4Id(websiteSettings.ga4MeasurementId)
      : "";
  const fbPixel =
    trackingEnabled && websiteSettings.metaPixelScriptEnabled
      ? sanitizeMetaPixelId(websiteSettings.metaPixelId)
      : "";
  const tiktokPixel =
    trackingEnabled && websiteSettings.tiktokPixelEnabled
      ? sanitizeGenericPixelId(websiteSettings.tiktokPixelId)
      : "";
  const zaloPixel =
    trackingEnabled && websiteSettings.zaloPixelEnabled
      ? sanitizeGenericPixelId(websiteSettings.zaloPixelId)
      : "";
  const gtmId = trackingEnabled ? sanitizeGtmId(websiteSettings.gtmContainerId) : "";
  const clarityId = trackingEnabled ? sanitizeClarityId(websiteSettings.clarityProjectId) : "";
  const remarketingEnabled = trackingEnabled && websiteSettings.remarketingEventsEnabled;
  const trustItems = websiteSettings.trustBarItems.filter((item) => item.title.trim());
  const logoUrl = resolveMediaUrl(websiteSettings.logoUrl);
  const siteName = websiteSettings.siteName.trim() || "Zendo.vn";
  const searchPlaceholder =
    websiteSettings.searchPlaceholder.trim() || "Bạn cần tìm gì hôm nay?";

  return (
    <>
      <Script id="zendo-analytics-config" strategy="beforeInteractive">
        {`window.__ZENDO_ANALYTICS_CONFIG__ = { trackingEnabled: ${trackingEnabled ? "true" : "false"}, remarketingEventsEnabled: ${remarketingEnabled ? "true" : "false"} };`}
      </Script>
      {trackingEnabled && websiteSettings.headScripts.trim() ? (
        <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: websiteSettings.headScripts }} />
      ) : null}
      {gtmId ? (
        <>
          <Script
            id="zendo-gtm-script"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtm.js?id=${gtmId}`}
          />
          <Script id="zendo-gtm-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || []; window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});`}
          </Script>
        </>
      ) : null}
      {gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="zendo-ga4" strategy="afterInteractive">
            {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
          </Script>
        </>
      ) : null}
      {fbPixel ? (
        <Script id="zendo-meta-pixel" strategy="afterInteractive">
          {`
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
              n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${fbPixel}');
              fbq('track', 'PageView');
            `}
        </Script>
      ) : null}
      {tiktokPixel ? (
        <Script id="zendo-tiktok-pixel" strategy="afterInteractive">
          {`
              !function (w, d, t) {
                w.TiktokAnalyticsObject = t;
                var ttq = w[t] = w[t] || [];
                ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
                ttq.setAndDefer = function (obj, method) {
                  obj[method] = function () {
                    obj.push([method].concat(Array.prototype.slice.call(arguments, 0)));
                  };
                };
                for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
                ttq.load = function (e) {
                  var n = "https://analytics.tiktok.com/i18n/pixel/events.js";
                  ttq._i = ttq._i || {};
                  ttq._i[e] = [];
                  ttq._i[e]._u = n;
                  ttq._t = ttq._t || {};
                  ttq._t[e] = +new Date();
                  ttq._o = ttq._o || {};
                  ttq._o[e] = {};
                  var a = d.createElement("script");
                  a.type = "text/javascript";
                  a.async = !0;
                  a.src = n + "?sdkid=" + e + "&lib=" + t;
                  var s = d.getElementsByTagName("script")[0];
                  s.parentNode.insertBefore(a, s);
                };
                ttq.load("${tiktokPixel}");
                ttq.page();
              }(window, document, "ttq");
            `}
        </Script>
      ) : null}
      {zaloPixel ? (
        <Script
          id="zendo-zalo-pixel"
          strategy="afterInteractive"
          src={`https://sp.zalo.me/plugins/sdk.js?pixel_id=${encodeURIComponent(zaloPixel)}`}
        />
      ) : null}
      {clarityId ? (
        <Script id="zendo-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${clarityId}");`}
        </Script>
      ) : null}
      {websiteSettings.showAnnouncementBar && websiteSettings.announcementText.trim() ? (
        <div className="border-b border-teal-800 bg-teal-900 px-3 py-2 text-center text-xs font-medium text-white sm:text-sm">
          {websiteSettings.announcementText}
        </div>
      ) : null}
      <div className="relative z-10">
        <StoreHeader
          logoUrl={logoUrl}
          siteName={siteName}
          hotline={websiteSettings.hotline}
          categories={categories}
          pages={pages}
          headerNavItems={websiteSettings.headerNavItems}
          isAdmin={isAdminRole}
          showAdminNav={showAdminNav}
          searchPlaceholder={searchPlaceholder}
          showTopbar={websiteSettings.showStorefrontTopbar}
          topbarLeftText={websiteSettings.topbarLeftText}
          topbarShippingText={websiteSettings.topbarShippingText}
          topbarCommitmentText={websiteSettings.topbarCommitmentText}
          showHeaderSearch={websiteSettings.showHeaderSearch}
          showHeaderCartIcon={websiteSettings.showHeaderCartIcon}
          showHeaderAdminMenu={websiteSettings.showHeaderAdminMenu}
          isAuthenticated={Boolean(session?.user?.id)}
          desktopCategoryLimit={websiteSettings.headerDesktopCategoryLimit}
          mobileCategoryLimit={websiteSettings.headerMobileCategoryLimit}
        />
        {websiteSettings.showTopHighlights && trustItems.length ? (
          <div className="border-b border-zinc-200 bg-zinc-50">
            <div className={`${STOREFRONT_FRAME} grid grid-cols-2 gap-3 py-3 sm:grid-cols-4`}>
              {trustItems.map((item, index) => (
                <div key={`${item.title}-${index}`} className="min-w-0 text-center">
                  <p className="text-xs font-semibold text-zinc-900 sm:text-sm">{item.title}</p>
                  {item.description.trim() ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-600 sm:text-xs">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <Suspense fallback={null}>
          <AnalyticsPageViewTracker />
        </Suspense>
        <StorefrontPopup
          enabled={websiteSettings.popupEnabled}
          title={websiteSettings.popupTitle}
          content={websiteSettings.popupContent}
          imageUrl={websiteSettings.popupImageUrl}
          link={websiteSettings.popupLink}
          delayMs={websiteSettings.popupDelayMs}
          frequencyHours={websiteSettings.popupFrequencyHours}
        />
        <main className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
        <MobileBottomNav categories={categories} />
        {trackingEnabled && websiteSettings.bodyScripts.trim() ? (
          <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: websiteSettings.bodyScripts }} />
        ) : null}
      </div>
    </>
  );
}
