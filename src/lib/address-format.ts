import type { AddressBuildInput } from "./vietnam-addresses/types";

export function buildFullAddress(input: AddressBuildInput): string {
  return [input.addressLine, input.wardName, input.districtName, input.provinceName]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .join(", ");
}
