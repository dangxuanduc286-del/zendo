export const HOME_HERO_LAYOUT_CONFIG = {
  bannerGap: {
    className: "gap-2.5 xl:gap-3",
    desktopPx: 12,
  },
  smallBannerWidth: 250,
  smallBannerHeight: 106,
  categoryColSpan: 1,
  mainBannerColSpan: 3,
  rightBannerColSpan: 1,
  desktopGridClassName: "grid grid-cols-5 items-stretch gap-2.5 xl:gap-3",
  bottomGridClassName: "grid w-full grid-cols-5 gap-2.5 xl:gap-3",
  categoryColumnClassName: "col-span-1 h-full min-h-0",
  mainColumnClassName: "col-span-3 h-full min-h-0",
  mainWithoutCategoryColumnClassName: "col-span-4 h-full min-h-0",
  rightColumnClassName: "col-span-1 h-full min-h-0",
  rightPromoGridClassName: "grid h-full min-h-0 grid-rows-4 gap-0.5",
  rightPromoImageSizes: "(max-width: 768px) 100vw, 250px",
  bottomPromoImageSizes: "(max-width: 768px) 50vw, 250px",
} as const;

export const HOME_HERO_BANNER_SPECS = {
  main: {
    label: "Banner chính",
    renderedSize: "773 x 309 px",
    uploadSize: "1644 x 658 px",
    aspectRatio: "2.498:1",
    note: "Chiếm 3 cột của grid 5 phần: 3 banner nhỏ + 2 gap.",
  },
  leftCategory: {
    label: "Khối danh mục trái",
    renderedSize: "250 x 309 px",
    uploadSize: "Không cần upload banner",
    aspectRatio: "0.809:1",
    note: "Chiếm đúng 1 cột, bằng chiều rộng banner nhỏ đầu tiên.",
  },
  rightPromo: {
    label: "Banner lợi ích phải",
    renderedSize: "Đo tự động trong Admin",
    uploadSize: "1500 x 456 px",
    aspectRatio: "3.289:1",
    note: "4 banner ngang tách riêng, xếp dọc trong cụm 1 cột chuẩn.",
  },
  bottomPromo: {
    label: "Banner danh mục nhỏ",
    renderedSize: "250 x 106 px",
    uploadSize: "1500 x 636 px",
    aspectRatio: "2.358:1",
    note: "5 banner nhỏ phía dưới là source of truth cho width/gap/grid.",
  },
} as const;

export const HOME_HERO_BANNER_SPEC_LIST = [
  HOME_HERO_BANNER_SPECS.main,
  HOME_HERO_BANNER_SPECS.leftCategory,
  HOME_HERO_BANNER_SPECS.rightPromo,
  HOME_HERO_BANNER_SPECS.bottomPromo,
] as const;
