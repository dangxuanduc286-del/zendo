"use client";

import { useMemo } from "react";
import { getDistrictsByProvince, getProvinces, getWardsByDistrict } from "../../lib/vietnam-addresses";
import type { VietnamAddressMode } from "../../lib/vietnam-addresses/types";

export interface AddressSelectorValue {
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
  addressLine: string;
}

interface AddressSelectorProps {
  mode?: VietnamAddressMode;
  value: AddressSelectorValue;
  onChange: (nextValue: AddressSelectorValue) => void;
  errors?: Partial<Record<"provinceCode" | "districtCode" | "addressLine", string>>;
}

const inputClassName =
  "h-11 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#DBEAFE]";

export default function AddressSelector({
  mode = "legacy",
  value,
  onChange,
  errors,
}: AddressSelectorProps): JSX.Element {
  const provinces = useMemo(() => getProvinces(mode), [mode]);

  const districts = useMemo(
    () => getDistrictsByProvince(value.provinceCode, mode),
    [mode, value.provinceCode],
  );
  const wards = useMemo(
    () => getWardsByDistrict(value.districtCode, value.provinceCode, mode),
    [mode, value.districtCode, value.provinceCode],
  );

  const onProvinceChange = (provinceCode: string) => {
    const province = provinces.find((item) => item.code === provinceCode);
    onChange({
      ...value,
      provinceCode,
      provinceName: province?.name ?? "",
      districtCode: "",
      districtName: "",
      wardCode: "",
      wardName: "",
    });
  };

  const onDistrictChange = (districtCode: string) => {
    const district = districts.find((item) => item.code === districtCode);
    onChange({
      ...value,
      districtCode,
      districtName: district?.name ?? "",
      wardCode: "",
      wardName: "",
    });
  };

  const onWardChange = (wardCode: string) => {
    const ward = wards.find((item) => item.code === wardCode);
    onChange({
      ...value,
      wardCode,
      wardName: ward?.name ?? "",
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-[#0F172A]">Địa chỉ nhận hàng</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-[#0F172A]">Tỉnh/Thành phố *</span>
          <select
            value={value.provinceCode}
            onChange={(event) => onProvinceChange(event.target.value)}
            className={inputClassName}
          >
            <option value="">Chọn tỉnh/thành phố</option>
            {provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>
          {errors?.provinceCode ? <p className="text-xs font-medium text-rose-600">{errors.provinceCode}</p> : null}
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-[#0F172A]">Quận/Huyện *</span>
          <select
            value={value.districtCode}
            onChange={(event) => onDistrictChange(event.target.value)}
            className={inputClassName}
            disabled={!value.provinceCode}
          >
            <option value="">Chọn quận/huyện</option>
            {districts.map((district) => (
              <option key={district.code} value={district.code}>
                {district.name}
              </option>
            ))}
          </select>
          {value.provinceCode && districts.length === 0 ? (
            <p className="text-xs text-[#64748B]">Chưa có dữ liệu khu vực, vui lòng nhập địa chỉ chi tiết.</p>
          ) : null}
          {errors?.districtCode ? <p className="text-xs font-medium text-rose-600">{errors.districtCode}</p> : null}
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-[#0F172A]">Phường/Xã</span>
          <select
            value={value.wardCode}
            onChange={(event) => onWardChange(event.target.value)}
            className={inputClassName}
            disabled={!value.districtCode || wards.length === 0}
          >
            <option value="">Chọn phường/xã (nếu có)</option>
            {wards.map((ward) => (
              <option key={ward.code} value={ward.code}>
                {ward.name}
              </option>
            ))}
          </select>
          {value.districtCode && wards.length === 0 ? (
            <p className="text-xs text-[#64748B]">Chưa có dữ liệu khu vực, vui lòng nhập địa chỉ chi tiết.</p>
          ) : null}
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-medium text-[#0F172A]">Địa chỉ chi tiết *</span>
          <input
            value={value.addressLine}
            onChange={(event) => onChange({ ...value, addressLine: event.target.value })}
            placeholder="Số nhà, tên đường, tòa nhà..."
            className={inputClassName}
          />
          {errors?.addressLine ? <p className="text-xs font-medium text-rose-600">{errors.addressLine}</p> : null}
        </label>
      </div>
    </section>
  );
}
