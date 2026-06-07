import { slugify } from "../src/lib/slug";

const cases: Array<{ input: string; expected: string }> = [
  { input: "Đèn LED", expected: "den-led" },
  { input: "Điện thoại", expected: "dien-thoai" },
  { input: "Máy lọc nước", expected: "may-loc-nuoc" },
  { input: "Ổ cứng SSD", expected: "o-cung-ssd" },
  { input: "Bộ nguồn", expected: "bo-nguon" },
  { input: "đèn", expected: "den" },
  { input: "điện", expected: "dien" },
  { input: "Đèn", expected: "den" },
  {
    input: "Bộ 5 bóng đèn Led 30W cao cấp tiết kiệm điện - Ánh sáng trắng - Bảo hành 12 tháng",
    expected: "bo-5-bong-den-led-30w-cao-cap-tiet-kiem-dien-anh-sang-trang-bao-hanh-12-thang",
  },
];

const failures = cases
  .map(({ input, expected }) => ({ input, expected, actual: slugify(input) }))
  .filter(({ actual, expected }) => actual !== expected);

if (failures.length > 0) {
  console.error("Slug verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure.input}: expected ${failure.expected}, got ${failure.actual}`);
  }
  process.exit(1);
}

console.log(`Slug verification passed (${cases.length} cases).`);
