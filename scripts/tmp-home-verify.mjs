import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle', timeout: 120000 });

const getIds = async (title) => {
  const section = page.locator('section').filter({ has: page.getByText(title, { exact: true }) }).first();
  const ids = await section.locator('a[href^="/san-pham/"]').evaluateAll((els) => els.map((a) => a.getAttribute('href')?.split('/').pop()).filter(Boolean));
  return [...new Set(ids)];
};

const flashSaleIds = await getIds('Flash Sale');
const featuredIds = await getIds('Sản phẩm nổi bật');
const newIds = await getIds('Sản phẩm mới');
const bestSellerIds = await getIds('Bán chạy');

const intersection = (a, b) => a.filter((x) => b.includes(x));
const counts = {
  flashSale: flashSaleIds.length,
  featured: featuredIds.length,
  new: newIds.length,
  bestSeller: bestSellerIds.length,
};

const result = {
  counts,
  ids: { flashSaleIds, featuredIds, newIds, bestSellerIds },
  intersections: {
    flash_featured: intersection(flashSaleIds, featuredIds),
    flash_new: intersection(flashSaleIds, newIds),
    featured_new: intersection(featuredIds, newIds),
    bestSeller_flash: intersection(bestSellerIds, flashSaleIds),
  },
  limitsOk: Object.values(counts).every((n) => n <= 12),
};

console.log(JSON.stringify(result, null, 2));
await page.screenshot({ path: 'artifacts/homepage.png', fullPage: true });
await browser.close();
