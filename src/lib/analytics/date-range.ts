import {
  congNgayTheoMocVietNam,
  layMocDauNamNayVietNam,
  layMocDauNgayHomNayVietNam,
  layMocDauNgayKeTiepVietNam,
  layMocDauThangNayVietNam,
} from "./timezone";

export type KhoaPresetThoiGianAnalytics =
  | "hom_nay"
  | "bay_ngay"
  | "ba_muoi_ngay"
  | "thang_nay"
  | "nam_nay";

export interface KhoangThoiGianAnalytics {
  batDau: Date;
  ketThuc: Date;
}

export interface PresetKhoangThoiGianAnalytics extends KhoangThoiGianAnalytics {
  khoa: KhoaPresetThoiGianAnalytics;
  nhan: string;
}

const CAU_HINH_PRESET: Array<{ khoa: KhoaPresetThoiGianAnalytics; nhan: string }> = [
  { khoa: "hom_nay", nhan: "Hôm nay" },
  { khoa: "bay_ngay", nhan: "7 ngày" },
  { khoa: "ba_muoi_ngay", nhan: "30 ngày" },
  { khoa: "thang_nay", nhan: "Tháng này" },
  { khoa: "nam_nay", nhan: "Năm nay" },
];

export function taoKhoangThoiGianPresetAnalytics(
  khoa: KhoaPresetThoiGianAnalytics,
  mocThamChieu: Date = new Date(),
): PresetKhoangThoiGianAnalytics {
  const dauNgayHomNay = layMocDauNgayHomNayVietNam(mocThamChieu);
  const ketThuc = layMocDauNgayKeTiepVietNam(mocThamChieu);

  if (khoa === "hom_nay") {
    return { khoa, nhan: "Hôm nay", batDau: dauNgayHomNay, ketThuc };
  }

  if (khoa === "bay_ngay") {
    return {
      khoa,
      nhan: "7 ngày",
      batDau: congNgayTheoMocVietNam(dauNgayHomNay, -6),
      ketThuc,
    };
  }

  if (khoa === "ba_muoi_ngay") {
    return {
      khoa,
      nhan: "30 ngày",
      batDau: congNgayTheoMocVietNam(dauNgayHomNay, -29),
      ketThuc,
    };
  }

  if (khoa === "thang_nay") {
    return {
      khoa,
      nhan: "Tháng này",
      batDau: layMocDauThangNayVietNam(mocThamChieu),
      ketThuc,
    };
  }

  return {
    khoa,
    nhan: "Năm nay",
    batDau: layMocDauNamNayVietNam(mocThamChieu),
    ketThuc,
  };
}

export function layDanhSachPresetKhoangThoiGianAnalytics(
  mocThamChieu: Date = new Date(),
): PresetKhoangThoiGianAnalytics[] {
  return CAU_HINH_PRESET.map((item) => taoKhoangThoiGianPresetAnalytics(item.khoa, mocThamChieu));
}

export function taoKhoangThoiGianTuyChonAnalytics(
  batDau: Date,
  ketThuc: Date,
): KhoangThoiGianAnalytics {
  if (!(batDau instanceof Date) || Number.isNaN(batDau.getTime())) {
    throw new Error("Mốc bắt đầu không hợp lệ.");
  }
  if (!(ketThuc instanceof Date) || Number.isNaN(ketThuc.getTime())) {
    throw new Error("Mốc kết thúc không hợp lệ.");
  }
  if (batDau.getTime() >= ketThuc.getTime()) {
    throw new Error("Khoảng thời gian phải theo dạng [bắt đầu, kết thúc).");
  }
  return { batDau, ketThuc };
}
