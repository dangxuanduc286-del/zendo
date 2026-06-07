# SEO Audit Report - Zendo.vn

Generated: 2026-06-07T04:11:11.020Z

## Scope & Safety

- Mode: READ ONLY audit pipeline.
- Database writes: none.
- API/business logic/functionality changes: none.
- External broken-link network probing: skipped to avoid flaky build/runtime side effects; external links are inventoried for manual verification.

## Summary

- Content entities audited: 0
- Storefront routes audited: 26
- SAFE issues: 39
- LOW issues: 21
- MEDIUM issues: 0
- HIGH issues: 0

## Issues

- [SAFE] missing metadata | route | /auth/post-login | src/app/(storefront)/(with-chrome)/auth/post-login/page.tsx | Route storefront không khai báo metadata/generateMetadata trực tiếp. | Safe fix allowed: yes
- [SAFE] missing canonical | route | /auth/post-login | src/app/(storefront)/(with-chrome)/auth/post-login/page.tsx | Không phát hiện canonical hoặc helper metadata có canonical. | Safe fix allowed: yes
- [SAFE] missing OpenGraph | route | /auth/post-login | src/app/(storefront)/(with-chrome)/auth/post-login/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /auth/post-login | src/app/(storefront)/(with-chrome)/auth/post-login/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /auth/post-login | src/app/(storefront)/(with-chrome)/auth/post-login/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [LOW] missing H2 | route | /ban-chay | src/app/(storefront)/(with-chrome)/ban-chay/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing canonical | route | /chat | src/app/(storefront)/(with-chrome)/chat/page.tsx | Không phát hiện canonical hoặc helper metadata có canonical. | Safe fix allowed: yes
- [SAFE] missing OpenGraph | route | /chat | src/app/(storefront)/(with-chrome)/chat/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /chat | src/app/(storefront)/(with-chrome)/chat/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /chat | src/app/(storefront)/(with-chrome)/chat/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [LOW] missing H2 | route | /chinh-sach/[slug] | src/app/(storefront)/(with-chrome)/chinh-sach/[slug]/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [LOW] missing H2 | route | /cua-hang | src/app/(storefront)/(with-chrome)/cua-hang/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing metadata | route | /dang-nhap | src/app/(storefront)/(with-chrome)/dang-nhap/page.tsx | Route storefront không khai báo metadata/generateMetadata trực tiếp. | Safe fix allowed: yes
- [SAFE] missing canonical | route | /dang-nhap | src/app/(storefront)/(with-chrome)/dang-nhap/page.tsx | Không phát hiện canonical hoặc helper metadata có canonical. | Safe fix allowed: yes
- [SAFE] missing OpenGraph | route | /dang-nhap | src/app/(storefront)/(with-chrome)/dang-nhap/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /dang-nhap | src/app/(storefront)/(with-chrome)/dang-nhap/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /dang-nhap | src/app/(storefront)/(with-chrome)/dang-nhap/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing canonical | route | /dat-lai-mat-khau | src/app/(storefront)/(with-chrome)/dat-lai-mat-khau/page.tsx | Không phát hiện canonical hoặc helper metadata có canonical. | Safe fix allowed: yes
- [SAFE] missing OpenGraph | route | /dat-lai-mat-khau | src/app/(storefront)/(with-chrome)/dat-lai-mat-khau/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /dat-lai-mat-khau | src/app/(storefront)/(with-chrome)/dat-lai-mat-khau/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /dat-lai-mat-khau | src/app/(storefront)/(with-chrome)/dat-lai-mat-khau/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [LOW] missing H2 | route | /flash-deal | src/app/(storefront)/(with-chrome)/flash-deal/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing OpenGraph | route | /gio-hang | src/app/(storefront)/(with-chrome)/gio-hang/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /gio-hang | src/app/(storefront)/(with-chrome)/gio-hang/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /gio-hang | src/app/(storefront)/(with-chrome)/gio-hang/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [LOW] missing H2 | route | / | src/app/(storefront)/(with-chrome)/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing canonical | route | /quen-mat-khau | src/app/(storefront)/(with-chrome)/quen-mat-khau/page.tsx | Không phát hiện canonical hoặc helper metadata có canonical. | Safe fix allowed: yes
- [SAFE] missing OpenGraph | route | /quen-mat-khau | src/app/(storefront)/(with-chrome)/quen-mat-khau/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /quen-mat-khau | src/app/(storefront)/(with-chrome)/quen-mat-khau/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /quen-mat-khau | src/app/(storefront)/(with-chrome)/quen-mat-khau/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [LOW] missing H2 | route | /san-pham-moi | src/app/(storefront)/(with-chrome)/san-pham-moi/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing canonical | route | /tai-khoan/affiliate/analytics | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/analytics/page.tsx | Không phát hiện canonical hoặc helper metadata có canonical. | Safe fix allowed: yes
- [SAFE] missing OpenGraph | route | /tai-khoan/affiliate/analytics | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/analytics/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /tai-khoan/affiliate/analytics | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/analytics/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /tai-khoan/affiliate/analytics | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/analytics/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing metadata | route | /tai-khoan/affiliate/attribution | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/attribution/page.tsx | Route storefront không khai báo metadata/generateMetadata trực tiếp. | Safe fix allowed: yes
- [SAFE] missing canonical | route | /tai-khoan/affiliate/attribution | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/attribution/page.tsx | Không phát hiện canonical hoặc helper metadata có canonical. | Safe fix allowed: yes
- [SAFE] missing OpenGraph | route | /tai-khoan/affiliate/attribution | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/attribution/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /tai-khoan/affiliate/attribution | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/attribution/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /tai-khoan/affiliate/attribution | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/attribution/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing canonical | route | /tai-khoan/affiliate/campaign | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/campaign/page.tsx | Không phát hiện canonical hoặc helper metadata có canonical. | Safe fix allowed: yes
- [SAFE] missing OpenGraph | route | /tai-khoan/affiliate/campaign | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/campaign/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /tai-khoan/affiliate/campaign | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/campaign/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /tai-khoan/affiliate/campaign | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/campaign/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing OpenGraph | route | /tai-khoan | src/app/(storefront)/(with-chrome)/tai-khoan/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /tai-khoan | src/app/(storefront)/(with-chrome)/tai-khoan/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /tai-khoan | src/app/(storefront)/(with-chrome)/tai-khoan/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing canonical | route | /thanh-toan/cam-on | src/app/(storefront)/(with-chrome)/thanh-toan/cam-on/page.tsx | Không phát hiện canonical hoặc helper metadata có canonical. | Safe fix allowed: yes
- [SAFE] missing OpenGraph | route | /thanh-toan/cam-on | src/app/(storefront)/(with-chrome)/thanh-toan/cam-on/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /thanh-toan/cam-on | src/app/(storefront)/(with-chrome)/thanh-toan/cam-on/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /thanh-toan/cam-on | src/app/(storefront)/(with-chrome)/thanh-toan/cam-on/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing OpenGraph | route | /thanh-toan | src/app/(storefront)/(with-chrome)/thanh-toan/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /thanh-toan | src/app/(storefront)/(with-chrome)/thanh-toan/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /thanh-toan | src/app/(storefront)/(with-chrome)/thanh-toan/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [SAFE] missing canonical | route | /tra-cuu-don-hang | src/app/(storefront)/(with-chrome)/tra-cuu-don-hang/page.tsx | Không phát hiện canonical hoặc helper metadata có canonical. | Safe fix allowed: yes
- [SAFE] missing OpenGraph | route | /tra-cuu-don-hang | src/app/(storefront)/(with-chrome)/tra-cuu-don-hang/page.tsx | Không phát hiện OpenGraph hoặc helper metadata có OpenGraph. | Safe fix allowed: yes
- [SAFE] missing Twitter metadata | route | /tra-cuu-don-hang | src/app/(storefront)/(with-chrome)/tra-cuu-don-hang/page.tsx | Không phát hiện Twitter metadata hoặc helper metadata có Twitter. | Safe fix allowed: yes
- [LOW] missing H2 | route | /tra-cuu-don-hang | src/app/(storefront)/(with-chrome)/tra-cuu-don-hang/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [LOW] missing H2 | route | /uu-dai | src/app/(storefront)/(with-chrome)/uu-dai/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no
- [LOW] missing H2 | route | /[slug] | src/app/(storefront)/(with-chrome)/[slug]/page.tsx | Không phát hiện H2 tĩnh trong source. | Safe fix allowed: no

## Route Metadata Matrix

| Route | File | Metadata | Canonical | OpenGraph | Twitter | H1 | H2 | Missing Alt |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| /auth/post-login | src/app/(storefront)/(with-chrome)/auth/post-login/page.tsx | no | no | no | no | 0 | 0 | 0 |
| /bai-viet | src/app/(storefront)/(with-chrome)/bai-viet/page.tsx | yes | yes | yes | yes | 1 | 1 | 0 |
| /bai-viet/[slug] | src/app/(storefront)/(with-chrome)/bai-viet/[slug]/page.tsx | yes | yes | yes | yes | 1 | 3 | 0 |
| /ban-chay | src/app/(storefront)/(with-chrome)/ban-chay/page.tsx | yes | yes | yes | yes | 0 | 0 | 0 |
| /chat | src/app/(storefront)/(with-chrome)/chat/page.tsx | yes | no | no | no | 0 | 0 | 0 |
| /chinh-sach/[slug] | src/app/(storefront)/(with-chrome)/chinh-sach/[slug]/page.tsx | yes | yes | yes | yes | 1 | 0 | 0 |
| /cong-tac-vien | src/app/(storefront)/(with-chrome)/cong-tac-vien/page.tsx | yes | yes | yes | yes | 1 | 5 | 0 |
| /cua-hang | src/app/(storefront)/(with-chrome)/cua-hang/page.tsx | yes | yes | yes | yes | 0 | 0 | 0 |
| /dang-nhap | src/app/(storefront)/(with-chrome)/dang-nhap/page.tsx | no | no | no | no | 0 | 0 | 0 |
| /danh-muc/[slug] | src/app/(storefront)/(with-chrome)/danh-muc/[slug]/page.tsx | yes | yes | yes | yes | 1 | 5 | 0 |
| /dat-lai-mat-khau | src/app/(storefront)/(with-chrome)/dat-lai-mat-khau/page.tsx | yes | no | no | no | 1 | 0 | 0 |
| /flash-deal | src/app/(storefront)/(with-chrome)/flash-deal/page.tsx | yes | yes | yes | yes | 0 | 0 | 0 |
| /gio-hang | src/app/(storefront)/(with-chrome)/gio-hang/page.tsx | yes | yes | no | no | 0 | 0 | 0 |
| / | src/app/(storefront)/(with-chrome)/page.tsx | yes | yes | yes | yes | 0 | 0 | 0 |
| /quen-mat-khau | src/app/(storefront)/(with-chrome)/quen-mat-khau/page.tsx | yes | no | no | no | 1 | 0 | 0 |
| /san-pham/[slug] | src/app/(storefront)/(with-chrome)/san-pham/[slug]/page.tsx | yes | yes | yes | yes | 1 | 5 | 0 |
| /san-pham-moi | src/app/(storefront)/(with-chrome)/san-pham-moi/page.tsx | yes | yes | yes | yes | 0 | 0 | 0 |
| /tai-khoan/affiliate/analytics | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/analytics/page.tsx | yes | no | no | no | 0 | 0 | 0 |
| /tai-khoan/affiliate/attribution | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/attribution/page.tsx | no | no | no | no | 0 | 0 | 0 |
| /tai-khoan/affiliate/campaign | src/app/(storefront)/(with-chrome)/tai-khoan/affiliate/campaign/page.tsx | yes | no | no | no | 0 | 0 | 0 |
| /tai-khoan | src/app/(storefront)/(with-chrome)/tai-khoan/page.tsx | yes | yes | no | no | 0 | 0 | 0 |
| /thanh-toan/cam-on | src/app/(storefront)/(with-chrome)/thanh-toan/cam-on/page.tsx | yes | no | no | no | 1 | 0 | 0 |
| /thanh-toan | src/app/(storefront)/(with-chrome)/thanh-toan/page.tsx | yes | yes | no | no | 0 | 0 | 0 |
| /tra-cuu-don-hang | src/app/(storefront)/(with-chrome)/tra-cuu-don-hang/page.tsx | yes | no | no | no | 1 | 0 | 0 |
| /uu-dai | src/app/(storefront)/(with-chrome)/uu-dai/page.tsx | yes | yes | yes | yes | 1 | 0 | 0 |
| /[slug] | src/app/(storefront)/(with-chrome)/[slug]/page.tsx | yes | yes | yes | yes | 1 | 0 | 0 |

## Broken External Links Inventory

- Không phát hiện external link tĩnh trong storefront pages.

## Internal Linking Opportunities

- Chưa có cơ hội internal linking đủ ngưỡng.

## Related Content Opportunities

### Bài viết liên quan có thể ghép

- Chưa có đề xuất đủ ngưỡng.

### Sản phẩm liên quan có thể ghép

- Chưa có đề xuất đủ ngưỡng.

### Danh mục liên quan có thể ghép

- Chưa có đề xuất đủ ngưỡng.

## Impact / Dependency / Regression Analysis

- Audit script là công cụ offline trong thư mục scripts, không được import bởi runtime Next.js.
- Report Markdown trong docs không ảnh hưởng render, database, API, hoặc business logic.
- SAFE fixes dữ liệu/runtime chỉ nên thực hiện khi chứng minh được không đổi hành vi người dùng; audit hiện chỉ tạo báo cáo.
