# Voucher SSOT Audit — Phase 1

## Phạm vi audit

Audit đã rà soát các điểm đọc/ghi voucher chính trong storefront, checkout, cart, wallet, Admin CRUD, deals, product promotion và seed dữ liệu.

## Kết quả phát hiện theo nguồn dữ liệu

### 1. Nơi đang đọc Coupon DB

| File | Function/luồng | Dependency | Luồng dữ liệu | Rủi ro |
|---|---|---|---|---|
| `src/app/api/checkout/route.ts` | Checkout order creation | `db.coupon.findFirst`, `db.coupon.update` | Coupon DB → validate mã → tính discount/shipping discount → gắn `couponId` vào Order → tăng `usedCount` | Cao: đang có fallback local khi DB không pass, có thể lệch Admin |
| `src/lib/server/storefront-customer-account-dashboard.ts` | Account voucher wallet SSR | `db.coupon.findMany` | Coupon DB → active/used/expired groups → AccountVoucherWallet | Cao: đang merge thêm voucher local nên không phải SSOT |
| `src/app/api/admin/coupons/route.ts` | Admin Coupon list/create | `db.coupon.findMany`, `db.coupon.create` | Admin UI → API → Coupon DB | Trung bình: contract ổn, cần giữ nguyên |
| `src/app/api/admin/coupons/[id]/route.ts` | Admin Coupon get/update/delete | `db.coupon.findUnique`, `db.coupon.update`, `db.coupon.delete` | Admin UI → API → Coupon DB | Trung bình: contract ổn, cần giữ nguyên |
| `src/lib/deals/resolve-vouchers.ts` | Deals voucher section | `db.coupon.findMany` | Website settings `voucherSource.couponIds` hoặc active coupons → serializer → ưu đãi page | Thấp: đã dùng DB |
| `src/app/(storefront)/(with-chrome)/san-pham/[slug]/page.tsx` | Product promotion coupons | `db.coupon.findMany` | Coupon DB active → ProductPromotionSection | Thấp/Trung bình: chỉ check active/time/usage tổng, chưa theo customer |
| `src/app/api/account/orders/[id]/route.ts` | Order detail coupon display | Order relation `coupon` | Order DB → coupon code/name | Thấp |

### 2. Nơi đang đọc `GUEST_COUPON_OPTIONS`

| File | Function/luồng | Dependency | Luồng dữ liệu | Rủi ro |
|---|---|---|---|---|
| `src/lib/coupon.ts` | `GUEST_COUPON_OPTIONS` | Hardcoded local voucher | Local array → helper compute/badge/milestone/best coupon | Cao: nguồn local chính cần loại khỏi production flow |
| `src/lib/coupon.ts` | `computeGuestCoupon` | `GUEST_COUPON_OPTIONS` | Code/subtotal → local voucher → discount result | Cao: đang ảnh hưởng cart/checkout fallback |
| `src/lib/coupon.ts` | `findBestGuestCoupon` | `computeGuestCoupon` | Local voucher → auto apply best coupon | Cao: auto apply cart từ local |
| `src/lib/coupon.ts` | `findNextVoucherMilestone` | `GUEST_COUPON_OPTIONS`, `estimateGuestCouponSavings` | Local voucher → milestone UI | Trung bình: UI progress lệch Admin |
| `src/lib/coupon.ts` | `getGuestCouponBadges` | local fields `createdAt`, `expiresSoon`, `recommended`, `newCustomerOnly` | Voucher option → badge | Trung bình: badge phụ thuộc metadata local |
| `src/hooks/use-guest-cart.ts` | `useGuestCart` | `computeGuestCoupon`, `findBestGuestCoupon` | Cart localStorage → local coupon compute → discount/auto apply | Cao: cart flow đang phụ thuộc local |
| `src/components/storefront/checkout-form.tsx` | Voucher picker/options/progress | `GUEST_COUPON_OPTIONS`, `computeGuestCoupon`, `findNextVoucherMilestone`, `getGuestCouponBadges` | Local array → popup chọn voucher → selected voucher/estimate saving | Cao: checkout popup không SSOT |
| `src/components/storefront/cart-page.tsx` | Cart voucher label/progress | `GUEST_COUPON_OPTIONS`, `findNextVoucherMilestone` | Local coupon → label/progress | Trung bình/Cao: cart summary lệch DB |
| `src/lib/server/storefront-customer-account-dashboard.ts` | Wallet fallback/merge/sort | `GUEST_COUPON_OPTIONS` | Coupon DB active + local guest-only vouchers → wallet active | Cao: kho voucher có fallback local, có thể hiển thị voucher Admin không quản lý |
| `src/components/storefront/account-voucher-wallet.tsx` | Badge conversion | `getGuestCouponBadges`, `GuestCouponOption` | DB voucher DTO → guest option shape → local badge helper | Trung bình: badge/icon logic local |
| `src/components/admin/admin-coupon-form.tsx` | Quick create popular vouchers | `GUEST_COUPON_OPTIONS` | Local presets → Admin create API | Trung bình: Admin quick-create phụ thuộc local; không phải production checkout nhưng là local preset |

### 3. Dữ liệu Voucher local/fallback khác

| File | Local/fallback | Ảnh hưởng | Rủi ro |
|---|---|---|---|
| `src/lib/coupon.ts` | Hardcoded default dates `DEFAULT_VOUCHER_CREATED_AT`, `DEFAULT_VOUCHER_ENDS_SOON_AT` | Badge/new/soon expiry/milestone | Trung bình |
| `src/lib/server/storefront-customer-account-dashboard.ts` | `guestOnlyVouchers` tạo ID `guest-${coupon.code}` | Kho voucher hiển thị voucher không có trong DB | Cao |
| `src/app/api/checkout/route.ts` | `else computeGuestCoupon(couponCode, subtotal)` | Nếu DB coupon không hợp lệ/không tồn tại vẫn có thể áp local | Rất cao |
| `src/components/storefront/customer-buyer-account-view.tsx` | Fallback text/code `GIẢM 15% ĐƠN TIẾP THEO`, `ZENDOVIP15` khi không có active voucher | UI teaser, không tính giảm giá | Thấp/Trung bình: hardcoded voucher-like copy |
| `src/components/admin/admin-coupon-form.tsx` | Preset random code `ZENDO10`, `SALE20`, `FREESHIP`, `VIP50` | Admin generate code | Thấp: code generator, không production voucher |

## Audit theo rule bắt buộc

| Rule | Nơi hiện có | Nhận xét/rủi ro |
|---|---|---|
| Percent voucher | `src/lib/coupon.ts`, `src/app/api/checkout/route.ts`, Admin API | DB checkout yêu cầu percent có max + min; local cũng có cap. Cần giữ công thức floor(subtotal * %) và cap |
| Fixed amount | `src/lib/coupon.ts`, checkout API, seed | DB và local tương ứng các mã seed chính |
| Freeship | `src/lib/coupon.ts`, checkout API, shipping promo | DB coupon type `FREE_SHIPPING`; checkout tính `min(value, shippingFee)`; cart local chỉ hiển thị/tính checkout |
| Min order | Local `minOrderValue`; DB `minOrderAmount` | Có mapping tương đương trong seed |
| Max discount | Local `maxDiscountValue`; DB `maxDiscountAmount` | Có mapping tương đương trong seed |
| Usage limit | DB `usageLimit`/`usedCount` | Local không có usage limit; fallback local bỏ qua limit → rủi ro cao |
| Usage per customer | DB field có trong Admin/wallet nhưng checkout hiện chưa enforce theo customer | Không thay business logic nếu chuyển SSOT: không thêm rule mới nếu hiện chưa có |
| Expired/start/status | DB filter active/time; local dùng static `endsAt` chỉ cho badge/milestone | Fallback local có thể bỏ qua Admin status/expiry |
| First order | Local badge `newCustomerOnly`/WELCOME; DB không có first-order field trong schema hiện tại | Không có enforcement rõ trong checkout; không thay logic |
| Category/product restriction | Wallet chỉ hiển thị text “Tất cả…”, ProductPromotion lọc chung active DB | Prisma `Coupon` schema hiện chưa thấy restriction fields trong đoạn audit; không thay schema nếu không cần |
| Customer assignment | Wallet text từ `usagePerCustomer`; checkout chưa enforce per-customer | Không thay logic nếu chưa có |
| Badge/icon | `getGuestCouponBadges` dựa local metadata | Cần chuyển nhận DTO từ DB hoặc derive từ DB fields |
| Estimate saving | `estimateGuestCouponSavings`, `computeGuestCoupon`, checkout popup | Cần chuyển sang DB coupon serializer/helper dùng cùng công thức |
| Availability/disabled state | Wallet DB `toVoucher`; Checkout popup local chỉ minOrder/compute | Cần DB availability helper giữ logic hiện tại |

## Mapping local → Coupon DB trong seed hiện tại

Các voucher trong `GUEST_COUPON_OPTIONS` đều đã có seed `prisma/seed.ts` bằng `upsert` theo `code`, không tạo trùng:

| Code | Local value/rule | Seed DB value/rule | Trạng thái mapping |
|---|---:|---:|---|
| SAVE20K | fixed 20k, min 299k | fixed 20k, min 299k | Khớp chính |
| SAVE30K | fixed 30k, min 499k | fixed 30k, min 499k | Khớp chính |
| SAVE50K | fixed 50k, min 799k | fixed 50k, min 799k | Khớp chính; thời hạn local static khác DB dynamic |
| SAVE80K | fixed 80k, min 1.499m | fixed 80k, min 1.499m | Khớp chính; usageLimit DB 2000 local không có |
| SAVE100K | fixed 100k, min 1.999m | fixed 100k, min 1.999m | Khớp chính |
| SAVE150K | fixed 150k, min 2.999m | fixed 150k, min 2.999m | Khớp chính |
| SAVE200K | fixed 200k, min 4.999m | fixed 200k, min 4.999m | Khớp chính |
| WELCOME5 | 5%, max 30k, min 299k | 5%, max 30k, min 299k | Khớp chính; local newCustomerOnly badge only |
| WELCOME10 | 10%, max 100k, min 500k | 10%, max 100k, min 500k | Khớp chính; local newCustomerOnly badge only |
| FREESHIP20 | freeship 20k, min 199k | freeship 20k, min 199k | Khớp chính |
| FREESHIP30 | freeship 30k, min 399k | freeship 30k, min 399k | Khớp chính |

## Dependency bị ảnh hưởng nếu chuyển SSOT

1. Cart hook/client currently synchronous local calculation; Coupon DB là server source nên cần API/prop/server action/cache để không phá flow.
2. Checkout popup hiện tính voucherOptions synchronous từ local array; cần cấp danh sách DB coupons + helper estimate tương đương.
3. Order creation đã đọc DB nhưng fallback local phải bỏ sau khi đảm bảo seed/DB đầy đủ.
4. Account voucher wallet đã đọc DB nhưng merge local fallback cần bỏ; sort hiện ưu tiên guest codes cần đổi sang DB fields mà không đổi UX quá mức.
5. Badge/icon helper cần nhận coupon từ DB hoặc DTO đã serialize, không còn local-only metadata.
6. Admin quick-create đang dùng local presets; có thể giữ ngoài production flow hoặc chuyển preset seed/DB template an toàn.

## Kết luận Phase 1

Audit xác nhận hệ thống chưa SSOT vì có ít nhất ba nhóm nguồn: Coupon DB, `GUEST_COUPON_OPTIONS`, và fallback/metadata local trong helper/UI. Rủi ro lớn nhất nằm ở checkout order creation fallback local, checkout popup local options, cart auto apply local, và wallet merge `guestOnlyVouchers`. Seed hiện đã chứa đủ 11 voucher local bằng upsert theo `code`, nên hướng chuyển tiếp có thể thực hiện không cần đổi schema trước mắt, nhưng cần kiểm tra DB thực tế để tránh thiếu/mismatch trước khi xóa fallback.
