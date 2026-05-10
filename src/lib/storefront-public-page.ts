import { cache } from "react";

/** Slug không được phục vụ bởi trang nội dung động (trùng route khác). */
export const STOREFRONT_PAGE_SLUG_BLACKLIST = new Set([
  "san-pham",
  "danh-muc",
]);

export type StorefrontPublicPage = {
  slug: string;
  title: string;
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: Date;
  isFallback: boolean;
};

type StubDef = {
  title: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
};

/** Nội dung mặc định khi chưa có bản PUBLISHED trong DB (không 404 cho các trang footer chuẩn). */
export const STOREFRONT_PAGE_CONTENT_STUBS: Record<string, StubDef> = {
  "cau-hoi-thuong-gap": {
    title: "Câu hỏi thường gặp",
    seoTitle: "Câu hỏi thường gặp | Zendo.vn",
    seoDescription:
      "Giải đáp nhanh các thắc mắc về đặt hàng, thanh toán, vận chuyển và hậu mãi tại Zendo.vn.",
    content: `<p>Phần này tổng hợp các câu hỏi thường gặp. Nội dung chi tiết sẽ được cập nhật từ <strong>Quản trị &gt; Trang nội dung</strong>.</p><p>Zendo.vn luôn ưu tiên trả lời rõ ràng, dễ hiểu. Nếu bạn cần hỗ trợ cụ thể cho đơn hàng, vui lòng dùng mục <a href="/lien-he">Liên hệ</a> hoặc <a href="/tra-cuu-don-hang">Tra cứu đơn hàng</a>.</p>`,
  },
  "chinh-sach-giao-hang": {
    title: "Chính sách giao hàng",
    seoTitle: "Chính sách giao hàng | Zendo.vn",
    seoDescription:
      "Thông tin về phạm vi giao hàng, thời gian xử lý đơn, phí vận chuyển và lưu ý nhận hàng.",
    content:
      '<p>Zendo.vn cam kết giao đúng tin đơn hàng và cập nhật trạng thái minh bạch. Chi tiết sẽ được chỉnh sửa tại Quản trị &gt; Trang nội dung (slug <code class="rounded bg-zinc-100 px-1">chinh-sach-giao-hang</code>).</p><ul class="mt-4 list-disc pl-6 space-y-2"><li>Thời gian xử lý và giao vận có thể thay đổi theo khu vực.</li><li>Khách hàng nên kiểm tra hàng khi nhận và liên hệ hỗ trợ ngay khi có sự cố.</li></ul>',
  },
  "chinh-sach-doi-tra": {
    title: "Chính sách đổi trả",
    seoTitle: "Chính sách đổi trả | Zendo.vn",
    seoDescription: "Điều kiện đổi trả, hoàn tiền và quy trình xử lý tại Zendo.vn.",
    content:
      "<p>Chúng tôi hỗ trợ đổi trả và hoàn tiền theo chính sách công bố. Vui lòng chỉnh sửa nội dung chi tiết trong Quản trị để đồng bộ với thực tế kinh doanh của bạn.</p>",
  },
  "huong-dan-mua-hang": {
    title: "Hướng dẫn mua hàng",
    seoTitle: "Hướng dẫn mua hàng | Zendo.vn",
    seoDescription: "Các bước chọn sản phẩm, đặt hàng, thanh toán và theo dõi đơn tại Zendo.vn.",
    content:
      "<p><strong>Bước 1:</strong> Tìm sản phẩm và thêm vào giỏ.<br/><strong>Bước 2:</strong> Xác nhận thông tin giao nhận.<br/><strong>Bước 3:</strong> Chọn phương thức thanh toán phù hợp.<br/><strong>Bước 4:</strong> Theo dõi trạng thái đơn tại trang Tra cứu đơn hàng.</p><p>Bạn có thể bổ sung hình ảnh minh họa và chính sách chi tiết trong trang admin.</p>",
  },
  "chinh-sach-bao-mat": {
    title: "Chính sách bảo mật",
    seoTitle: "Chính sách bảo mật | Zendo.vn",
    seoDescription: "Cách Zendo.vn thu thập, sử dụng và bảo vệ dữ liệu người dùng.",
    content:
      "<p>Chúng tôi tôn trọng quyền riêng tư và chỉ xử lý dữ liệu phục vụ đơn hàng, chăm sóc khách hàng và tuân thủ pháp luật. Nội dung chi tiết có thể chỉnh trong Quản trị.</p>",
  },
  "chinh-sach-bao-hanh": {
    title: "Chính sách bảo hành",
    seoTitle: "Chính sách bảo hành | Zendo.vn",
    seoDescription: "Điều kiện bảo hành sản phẩm và hướng dẫn kích hoạt hỗ trợ tại Zendo.vn.",
    content:
      "<p>Chính sách bảo hành được áp dụng theo từng ngành hàng và nhà sản xuất. Vui lòng cập nhật nội dung cụ thể trong Quản trị &gt; Trang nội dung (slug <strong>chinh-sach-bao-hanh</strong>).</p>",
  },
  "dieu-khoan-su-dung": {
    title: "Điều khoản sử dụng",
    seoTitle: "Điều khoản sử dụng | Zendo.vn",
    seoDescription: "Quy định pháp lý và điều kiện sử dụng dịch vụ của Zendo.vn.",
    content:
      "<p>Bằng việc truy cập và mua hàng trên Zendo.vn, bạn đồng ý tuân thủ các điều khoản sau. Phiên bản chi tiết sẽ do quản trị viên chỉnh sửa.</p>",
  },
  "gioi-thieu": {
    title: "Giới thiệu Zendo.vn",
    seoTitle: "Giới thiệu Zendo.vn",
    seoDescription:
      "Tìm hiểu về định hướng phát triển, giá trị cốt lõi và cam kết dịch vụ của Zendo.vn.",
    content:
      "<p>Zendo.vn là nền tảng mua sắm đa ngành, tối ưu cho thiết bị di động, chú trọng sản phẩm chính hãng, giao nhanh và hậu mãi rõ ràng.</p><h2>Giá trị cốt lõi</h2><p>Chúng tôi ưu tiên minh bạch thông tin, hiệu năng website ổn định và chính sách bán hàng nhất quán để khách hàng an tâm trong mọi đơn hàng.</p>",
  },
  "lien-he": {
    title: "Liên hệ",
    seoTitle: "Liên hệ Zendo.vn",
    seoDescription:
      "Liên hệ bộ phận hỗ trợ Zendo.vn để được tư vấn đơn hàng, vận chuyển và chính sách hậu mãi.",
    content:
      "<p>Hỗ trợ khách hàng hoạt động hàng ngày. Bạn có thể liên hệ qua hotline và email được cập nhật trong <strong>Cài đặt website</strong>.</p><p>Để cập nhật địa chỉ và số điện thoại cố định trên trang này, hãy chỉnh nội dung trong Quản trị &gt; Trang nội dung.</p>",
  },
};

async function getDbClient() {
  if (!process.env.DATABASE_URL) return null;
  try {
    const dbModule = await import("./db");
    return dbModule.db;
  } catch {
    return null;
  }
}

export function stubToPublicPage(slug: string, def: StubDef): StorefrontPublicPage {
  return {
    slug,
    title: def.title,
    content: def.content,
    seoTitle: def.seoTitle,
    seoDescription: def.seoDescription,
    updatedAt: new Date(0),
    isFallback: true,
  };
}

/** Lấy trang để hiển thị storefront: PUBLISHED từ DB, hoặc stub cho slug footer chuẩn khi chưa đăng. */
export async function fetchStorefrontPublicPage(slug: string): Promise<StorefrontPublicPage | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || STOREFRONT_PAGE_SLUG_BLACKLIST.has(normalized)) {
    return null;
  }

  const db = await getDbClient();

  type PageSel = {
    slug: string;
    title: string;
    content: string;
    seoTitle: string | null;
    seoDescription: string | null;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    updatedAt: Date;
  };
  let row: PageSel | null = null;

  if (db) {
    row = await db.page.findUnique({
      where: { slug: normalized },
      select: {
        slug: true,
        title: true,
        content: true,
        seoTitle: true,
        seoDescription: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  let result: StorefrontPublicPage | null = null;
  if (row?.status === "PUBLISHED") {
    result = {
      slug: row.slug,
      title: row.title,
      content: row.content,
      seoTitle: row.seoTitle ?? null,
      seoDescription: row.seoDescription ?? null,
      updatedAt: row.updatedAt,
      isFallback: false,
    };
  } else {
    const stub = STOREFRONT_PAGE_CONTENT_STUBS[normalized];
    if (stub) {
      result = stubToPublicPage(normalized, stub);
    }
  }

  return result;
}

/** Dedupe trong một request giữa `generateMetadata` và page. */
export const getStorefrontPublicPageCached = cache(fetchStorefrontPublicPage);

export function excerptFromPageContent(htmlOrText: string, maxLen = 160): string {
  const plain = htmlOrText
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length <= maxLen ? plain : `${plain.slice(0, maxLen - 1)}…`;
}
