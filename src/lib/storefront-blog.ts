import { sanitizePostThumbnailUrl } from "./media";

export interface StorefrontPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnailUrl: string;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string[];
  publishedAt: Date;
  updatedAt: Date;
}

const FALLBACK_POSTS: StorefrontPost[] = [
  {
    id: "post-1",
    title: "Cach chon tai nghe chong on phu hop nhu cau hang ngay",
    slug: "cach-chon-tai-nghe-chong-on-phu-hop-nhu-cau-hang-ngay",
    excerpt: "Huong dan chon tai nghe theo moi truong su dung va ngan sach toi uu.",
    content:
      "Tai nghe chong on chu dong ngay cang pho bien trong moi truong lam viec linh hoat.\n\nBan nen uu tien cac mau co kha nang khang on on dinh, thoi luong pin tot va do em tai cao.\n\nNeu thuong xuyen di chuyen, hay chon mau co hop sac gon nhe va ho tro ket noi da thiet bi.",
    thumbnailUrl: "",
    seoTitle: "Cach chon tai nghe chong on phu hop | Zendo.vn",
    seoDescription: "Bi quyet chon tai nghe chong on dung nhu cau va ngan sach.",
    tags: ["dien-tu", "tai-nghe"],
    publishedAt: new Date("2026-04-12T09:00:00.000Z"),
    updatedAt: new Date("2026-04-12T09:00:00.000Z"),
  },
  {
    id: "post-2",
    title: "5 meo tiet kiem chi phi khi mua sam online da nganh",
    slug: "5-meo-tiet-kiem-chi-phi-khi-mua-sam-online-da-nganh",
    excerpt: "Áp dụng voucher, theo doi gia va ket hop flash deal dung thoi diem.",
    content:
      "Mua sam online tiet kiem hon neu ban co chien luoc ro rang.\n\nHay tao danh sach uu tien, so sanh gia giua cac thuong hieu va canh bao khuyen mai theo chu ky.\n\nDung voucher dung danh muc va ket hop mien phi van chuyen de toi uu tong chi phi.",
    thumbnailUrl: "",
    seoTitle: "5 meo tiet kiem chi phi mua sam online | Zendo.vn",
    seoDescription: "Tong hop meo toi uu ngan sach khi mua sam online da nganh.",
    tags: ["mua-sam", "khuyen-mai"],
    publishedAt: new Date("2026-04-10T08:30:00.000Z"),
    updatedAt: new Date("2026-04-10T08:30:00.000Z"),
  },
  {
    id: "post-3",
    title: "Checklist do gia dung can co cho can ho moi",
    slug: "checklist-do-gia-dung-can-co-cho-can-ho-moi",
    excerpt: "Tong hop danh sach vat dung can thiet giup ban setup nha o gon gang.",
    content:
      "Khi setup can ho moi, ban de bo sot cac vat dung co tan suat su dung cao.\n\nBat dau tu nhom thiet bi bep, do ve sinh va he thong luu tru thong minh.\n\nUu tien sản phẩm ben, de ve sinh va co bao hanh ro rang de su dung lau dai.",
    thumbnailUrl: "",
    seoTitle: "Checklist do gia dung cho can ho moi | Zendo.vn",
    seoDescription: "Danh sach do gia dung can thiet cho can ho moi.",
    tags: ["nha-cua", "gia-dung"],
    publishedAt: new Date("2026-04-08T10:00:00.000Z"),
    updatedAt: new Date("2026-04-08T10:00:00.000Z"),
  },
  {
    id: "post-4",
    title: "Bi quyet cham soc da toi gian cho nguoi ban ron",
    slug: "bi-quyet-cham-soc-da-toi-gian-cho-nguoi-ban-ron",
    excerpt: "Quy trinh 3 buoc giup da khoe va tiet kiem thoi gian moi ngay.",
    content:
      "Chu trinh cham soc da ngan gon van co the dat hieu qua cao neu dung sản phẩm phù hợp.\n\nLam sach diu nhe, cap am dung loai va bo sung chong nang moi ngay la ba buoc co ban.\n\nKiem tra thanh phan va tan suat su dung de han che kich ung.",
    thumbnailUrl: "",
    seoTitle: "Cham soc da toi gian cho nguoi ban ron | Zendo.vn",
    seoDescription: "Goi y routine cham soc da ngan gon ma hieu qua.",
    tags: ["lam-dep", "cham-soc-da"],
    publishedAt: new Date("2026-04-06T07:45:00.000Z"),
    updatedAt: new Date("2026-04-06T07:45:00.000Z"),
  },
  {
    id: "post-5",
    title: "Huong dan phoi do co ban cho tu do toi gian",
    slug: "huong-dan-phoi-do-co-ban-cho-tu-do-toi-gian",
    excerpt: "Nhung mon do nen co de phoi duoc nhieu outfit trong tuan.",
    content:
      "Tu do toi gian giup ban tiet kiem thoi gian phoi do ma van giu duoc phong cach ca nhan.\n\nHay bat dau voi cac item trung tinh, de ket hop va phu hop nhieu tinh huong.\n\nBo sung mot so diem nhan theo mua de bo trang phuc khong bi don dieu.",
    thumbnailUrl: "",
    seoTitle: "Phoi do co ban cho tu do toi gian | Zendo.vn",
    seoDescription: "Meo xay dung tu do toi gian va de phoi.",
    tags: ["thoi-trang", "phoi-do"],
    publishedAt: new Date("2026-04-04T11:15:00.000Z"),
    updatedAt: new Date("2026-04-04T11:15:00.000Z"),
  },
  {
    id: "post-6",
    title: "Kinh nghiem chon ghe cong thai hoc cho goc lam viec tai nha",
    slug: "kinh-nghiem-chon-ghe-cong-thai-hoc-cho-goc-lam-viec-tai-nha",
    excerpt: "Nhung tieu chi can uu tien de ngoi lau van thoai mai va dung tu the.",
    content:
      "Ghe cong thai hoc khong chi tao cam giac thoai mai ma con giup han che met moi cot song.\n\nBan nen uu tien tua lung linh hoat, de tay dieu chinh duoc va chat lieu thoang khi.\n\nKhi mua online, hay xem ky thong so kich thuoc va che do bao hanh truoc khi dat.",
    thumbnailUrl: "",
    seoTitle: "Chon ghe cong thai hoc cho work-from-home | Zendo.vn",
    seoDescription: "Huong dan chon ghe cong thai hoc phu hop cho goc lam viec tai nha.",
    tags: ["noi-that", "work-from-home"],
    publishedAt: new Date("2026-04-02T09:45:00.000Z"),
    updatedAt: new Date("2026-04-02T09:45:00.000Z"),
  },
  {
    id: "post-7",
    title: "Cach len ke hoach mua sam thang de tranh mua vuot ngan sach",
    slug: "cach-len-ke-hoach-mua-sam-thang-de-tranh-mua-vuot-ngan-sach",
    excerpt: "Khung 4 buoc de quan ly nhu cau va toi uu chi tieu mua sam gia dinh.",
    content:
      "Ke hoach mua sam theo thang giup ban uu tien nhu cau thiet yeu va tranh phat sinh khong can thiet.\n\nHay chia nho theo nhom sản phẩm, dat ngan sach tran cho tung nhom va theo doi bien dong gia.\n\nKet hop danh gia chat luong va chuong trinh khuyen mai de dat hieu qua chi tieu tot hon.",
    thumbnailUrl: "",
    seoTitle: "Len ke hoach mua sam thang hieu qua | Zendo.vn",
    seoDescription: "Bi quyet lap ke hoach mua sam theo thang de khong vuot ngan sach.",
    tags: ["mua-sam", "quan-ly-chi-tieu"],
    publishedAt: new Date("2026-03-31T08:00:00.000Z"),
    updatedAt: new Date("2026-03-31T08:00:00.000Z"),
  },
];

export function getFallbackPosts(): StorefrontPost[] {
  return FALLBACK_POSTS.map((post) => ({
    ...post,
    thumbnailUrl: sanitizePostThumbnailUrl(post.thumbnailUrl),
  }));
}

