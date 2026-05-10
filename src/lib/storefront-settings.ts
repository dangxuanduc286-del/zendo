import { unstable_cache } from "next/cache";
import { getThemeSettings, getWebsiteSettings } from "./settings";

export const getStorefrontSettings = unstable_cache(
  async () => {
    const [website, theme] = await Promise.all([getWebsiteSettings(), getThemeSettings()]);
    return { website, theme };
  },
  ["storefront-settings-v1"],
  {
    tags: ["storefront-settings"],
    revalidate: 60,
  },
);
