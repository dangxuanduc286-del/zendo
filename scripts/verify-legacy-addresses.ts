import { LEGACY_VIETNAM_PROVINCES } from "../src/lib/vietnam-addresses/data";
import { getDistrictsByProvince, getWardsByDistrict, normalizeAddressKeyword } from "../src/lib/vietnam-addresses";

type ProvinceCheck = {
  keyword: string;
  expectedDistrictKeywords: string[];
};

const checks: ProvinceCheck[] = [
  {
    keyword: "hai phong",
    expectedDistrictKeywords: [
      "hong bang",
      "ngo quyen",
      "le chan",
      "hai an",
      "kien an",
      "do son",
      "an duong",
      "an lao",
      "thuy nguyen",
      "vinh bao",
    ],
  },
  { keyword: "hai duong", expectedDistrictKeywords: ["chi linh", "kinh mon", "nam sach"] },
  { keyword: "binh duong", expectedDistrictKeywords: ["thu dau mot", "di an", "thuan an"] },
  { keyword: "nam dinh", expectedDistrictKeywords: ["my loc", "vu ban", "xuan truong"] },
];

function findProvinceCodeByKeyword(keyword: string): string {
  const normalizedKeyword = normalizeAddressKeyword(keyword);
  const province = LEGACY_VIETNAM_PROVINCES.find((item) =>
    normalizeAddressKeyword(item.name).includes(normalizedKeyword),
  );
  if (!province) {
    throw new Error(`Cannot find province for keyword "${keyword}"`);
  }
  return province.code;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function main(): void {
  const placeholderDistricts = LEGACY_VIETNAM_PROVINCES.flatMap((province) => province.districts).filter((district) =>
    district.name.startsWith("Quận/Huyện "),
  );
  assert(placeholderDistricts.length === 0, `Found ${placeholderDistricts.length} placeholder districts`);

  const mismatchedDistrictParents = LEGACY_VIETNAM_PROVINCES.flatMap((province) =>
    province.districts.filter((district) => district.parentCode !== province.code),
  );
  assert(mismatchedDistrictParents.length === 0, `Found ${mismatchedDistrictParents.length} districts with wrong parentCode`);

  const mismatchedWardParents = LEGACY_VIETNAM_PROVINCES.flatMap((province) =>
    province.districts.flatMap((district) => district.wards.filter((ward) => ward.parentCode !== district.code)),
  );
  assert(mismatchedWardParents.length === 0, `Found ${mismatchedWardParents.length} wards with wrong parentCode`);

  const report = checks.map((check) => {
    const provinceCode = findProvinceCodeByKeyword(check.keyword);
    const districts = getDistrictsByProvince(provinceCode, "legacy");
    assert(districts.length > 0, `No districts found for ${check.keyword}`);

    const normalizedDistrictNames = districts.map((district) => normalizeAddressKeyword(district.name));
    const matchedKeywords = check.expectedDistrictKeywords.filter((keyword) =>
      normalizedDistrictNames.some((name) => name.includes(keyword)),
    );
    assert(
      matchedKeywords.length >= Math.min(3, check.expectedDistrictKeywords.length),
      `Not enough expected districts in ${check.keyword}: matched ${matchedKeywords.length}`,
    );

    const sampleDistrict = districts[0];
    const wards = getWardsByDistrict(sampleDistrict.code, provinceCode, "legacy");
    assert(wards.length > 0, `No wards for sample district ${sampleDistrict.name} in ${check.keyword}`);

    return {
      provinceKeyword: check.keyword,
      provinceCode,
      districtCount: districts.length,
      sampleDistrict: sampleDistrict.name,
      sampleWardCount: wards.length,
      matchedKeywords,
    };
  });

  const totalDistricts = LEGACY_VIETNAM_PROVINCES.reduce((sum, province) => sum + province.districts.length, 0);
  const totalWards = LEGACY_VIETNAM_PROVINCES.reduce(
    (sum, province) => sum + province.districts.reduce((acc, district) => acc + district.wards.length, 0),
    0,
  );

  console.log(
    JSON.stringify(
      {
        provinces: LEGACY_VIETNAM_PROVINCES.length,
        districts: totalDistricts,
        wards: totalWards,
        report,
      },
      null,
      2,
    ),
  );
}

main();
