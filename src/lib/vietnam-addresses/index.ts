import { CURRENT_VIETNAM_PROVINCES, LEGACY_VIETNAM_PROVINCES } from "./data";
import type {
  AddressBuildInput,
  VietnamAddressMode,
  VietnamDistrict,
  VietnamProvince,
  VietnamWard,
} from "./types";

function normalizeVietnameseText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

function getDataset(mode: VietnamAddressMode): VietnamProvince[] {
  return mode === "legacy" ? LEGACY_VIETNAM_PROVINCES : CURRENT_VIETNAM_PROVINCES;
}

export function normalizeAddressKeyword(input: string): string {
  return normalizeVietnameseText(input);
}

export function getProvinces(mode: VietnamAddressMode = "legacy"): VietnamProvince[] {
  return getDataset(mode);
}

export function findProvinceByCode(
  provinceCode: string,
  mode: VietnamAddressMode = "legacy",
): VietnamProvince | null {
  if (!provinceCode) return null;
  return getDataset(mode).find((province) => province.code === provinceCode) ?? null;
}

export function getDistrictsByProvince(
  provinceCode: string,
  mode: VietnamAddressMode = "legacy",
): VietnamDistrict[] {
  const province = findProvinceByCode(provinceCode, mode);
  if (!province) return [];
  return province.districts.filter((district) => district.parentCode === province.code);
}

export function getWardsByDistrict(
  districtCode: string,
  provinceCode: string,
  mode: VietnamAddressMode = "legacy",
): VietnamWard[] {
  if (!districtCode) return [];
  const districts = getDistrictsByProvince(provinceCode, mode);
  const district = districts.find((item) => item.code === districtCode);
  if (!district) return [];
  return district.wards.filter((ward) => ward.parentCode === district.code);
}

export function buildFullAddress(input: AddressBuildInput): string {
  return [input.addressLine, input.wardName, input.districtName, input.provinceName]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(", ");
}
