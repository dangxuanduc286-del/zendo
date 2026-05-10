import type { VietnamProvince } from "./types";
import type { VietnamDistrict, VietnamWard } from "./types";
import subVn from "sub-vn";

const CURRENT_PROVINCE_NAMES = [
  "Thành phố Hà Nội",
  "Thành phố Hồ Chí Minh",
  "Thành phố Hải Phòng",
  "Thành phố Đà Nẵng",
  "Thành phố Cần Thơ",
  "Tỉnh An Giang",
  "Tỉnh Bà Rịa - Vũng Tàu",
  "Tỉnh Bắc Giang",
  "Tỉnh Bắc Kạn",
  "Tỉnh Bạc Liêu",
  "Tỉnh Bắc Ninh",
  "Tỉnh Bến Tre",
  "Tỉnh Bình Dương",
  "Tỉnh Bình Định",
  "Tỉnh Bình Phước",
  "Tỉnh Bình Thuận",
  "Tỉnh Cà Mau",
  "Tỉnh Cao Bằng",
  "Tỉnh Đắk Lắk",
  "Tỉnh Đắk Nông",
  "Tỉnh Điện Biên",
  "Tỉnh Đồng Nai",
  "Tỉnh Đồng Tháp",
  "Tỉnh Gia Lai",
  "Tỉnh Hà Giang",
  "Tỉnh Hà Nam",
  "Tỉnh Hà Tĩnh",
  "Tỉnh Hải Dương",
  "Tỉnh Hậu Giang",
  "Tỉnh Hòa Bình",
  "Tỉnh Hưng Yên",
  "Tỉnh Khánh Hòa",
  "Tỉnh Kiên Giang",
  "Tỉnh Kon Tum",
];

interface LegacyProvinceRaw {
  code: string;
  name: string;
  unit: string;
}

interface LegacyDistrictRaw {
  code: string;
  name: string;
  unit: string;
  province_code: string;
}

interface LegacyWardRaw {
  code: string;
  name: string;
  unit: string;
  district_code: string;
  province_code: string;
}

function makeProvince(code: string, name: string): VietnamProvince {
  return { code, name, type: "province", districts: [] };
}

const currentBase = CURRENT_PROVINCE_NAMES.map((name, index) =>
  makeProvince(`CUR-${String(index + 1).padStart(2, "0")}`, name),
);

const hanoiDistricts = [
  {
    code: "CUR-01-D01",
    name: "Quận Hoàn Kiếm",
    type: "district",
    parentCode: "CUR-01",
    wards: [
      { code: "CUR-01-D01-W01", name: "Phường Hàng Trống", type: "ward", parentCode: "CUR-01-D01" },
      { code: "CUR-01-D01-W02", name: "Phường Tràng Tiền", type: "ward", parentCode: "CUR-01-D01" },
    ],
  },
  {
    code: "CUR-01-D02",
    name: "Quận Cầu Giấy",
    type: "district",
    parentCode: "CUR-01",
    wards: [
      { code: "CUR-01-D02-W01", name: "Phường Dịch Vọng", type: "ward", parentCode: "CUR-01-D02" },
      { code: "CUR-01-D02-W02", name: "Phường Nghĩa Đô", type: "ward", parentCode: "CUR-01-D02" },
    ],
  },
];

const hcmDistricts = [
  {
    code: "CUR-02-D01",
    name: "Quận 1",
    type: "district",
    parentCode: "CUR-02",
    wards: [
      { code: "CUR-02-D01-W01", name: "Phường Bến Nghé", type: "ward", parentCode: "CUR-02-D01" },
      { code: "CUR-02-D01-W02", name: "Phường Bến Thành", type: "ward", parentCode: "CUR-02-D01" },
    ],
  },
  {
    code: "CUR-02-D02",
    name: "Thành phố Thủ Đức",
    type: "district",
    parentCode: "CUR-02",
    wards: [
      { code: "CUR-02-D02-W01", name: "Phường Linh Trung", type: "ward", parentCode: "CUR-02-D02" },
      { code: "CUR-02-D02-W02", name: "Phường Hiệp Bình Chánh", type: "ward", parentCode: "CUR-02-D02" },
    ],
  },
];

export const CURRENT_VIETNAM_PROVINCES: VietnamProvince[] = currentBase.map((province) => {
  if (province.code === "CUR-01") {
    return { ...province, legacyNames: ["Hà Nội"], districts: hanoiDistricts };
  }
  if (province.code === "CUR-02") {
    return { ...province, legacyNames: ["Hồ Chí Minh", "TP.HCM"], districts: hcmDistricts };
  }
  return province;
});

const legacyApi = subVn as unknown as {
  getProvinces: () => LegacyProvinceRaw[];
  getDistricts: () => LegacyDistrictRaw[];
  getWards: () => LegacyWardRaw[];
};

const legacyProvincesRaw = legacyApi.getProvinces();
const legacyDistrictsRaw = legacyApi.getDistricts();
const legacyWardsRaw = legacyApi.getWards();

const legacyWardsByDistrict = legacyWardsRaw.reduce<Record<string, VietnamWard[]>>((acc, ward) => {
  if (!acc[ward.district_code]) acc[ward.district_code] = [];
  acc[ward.district_code].push({
    code: ward.code,
    name: ward.name,
    type: ward.unit,
    parentCode: ward.district_code,
  });
  return acc;
}, {});

const legacyDistrictsByProvince = legacyDistrictsRaw.reduce<Record<string, VietnamDistrict[]>>((acc, district) => {
  if (!acc[district.province_code]) acc[district.province_code] = [];
  acc[district.province_code].push({
    code: district.code,
    name: district.name,
    type: district.unit,
    parentCode: district.province_code,
    wards: legacyWardsByDistrict[district.code] ?? [],
  });
  return acc;
}, {});

export const LEGACY_VIETNAM_PROVINCES: VietnamProvince[] = legacyProvincesRaw.map((province) => ({
    code: province.code,
    name: province.name,
    type: province.unit,
    legacyNames: [province.name],
    districts: legacyDistrictsByProvince[province.code] ?? [],
  }));
