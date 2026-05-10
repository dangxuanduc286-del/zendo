export type VietnamAddressMode = "current" | "legacy";

export interface VietnamWard {
  code: string;
  name: string;
  type: string;
  parentCode: string;
}

export interface VietnamDistrict {
  code: string;
  name: string;
  type: string;
  parentCode: string;
  wards?: VietnamWard[];
}

export interface VietnamProvince {
  code: string;
  name: string;
  type: string;
  legacyNames?: string[];
  districts?: VietnamDistrict[];
}

export interface AddressBuildInput {
  addressLine: string;
  wardName?: string;
  districtName?: string;
  provinceName?: string;
}
