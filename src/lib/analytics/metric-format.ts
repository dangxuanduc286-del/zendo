export function lamTronSoAnalytics(value: number, soChuSo = 2): number {
  const factor = 10 ** soChuSo;
  return Math.round(value * factor) / factor;
}

export function tinhTiLePhanTramAnalytics(
  tuSo: number,
  mauSo: number,
): number | null {
  if (mauSo <= 0) return null;
  return (tuSo / mauSo) * 100;
}

export function tinhTrungBinhAnalytics(
  tong: number,
  soMau: number,
): number | null {
  if (soMau <= 0) return null;
  return tong / soMau;
}

