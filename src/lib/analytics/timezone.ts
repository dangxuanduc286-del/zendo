export const MUI_GIO_VIET_NAM = "Asia/Ho_Chi_Minh";

const SO_MILIGIAY_MOI_NGAY = 24 * 60 * 60 * 1000;
const DO_LECH_MUI_GIO_VIET_NAM_THEO_MILIGIAY = 7 * 60 * 60 * 1000;

export interface ThanhPhanNgayGioVietNam {
  nam: number;
  thang: number;
  ngay: number;
  gio: number;
  phut: number;
  giay: number;
  miliGiay: number;
}

export function layThanhPhanNgayGioVietNam(moc: Date): ThanhPhanNgayGioVietNam {
  const mocDich = new Date(moc.getTime() + DO_LECH_MUI_GIO_VIET_NAM_THEO_MILIGIAY);
  return {
    nam: mocDich.getUTCFullYear(),
    thang: mocDich.getUTCMonth() + 1,
    ngay: mocDich.getUTCDate(),
    gio: mocDich.getUTCHours(),
    phut: mocDich.getUTCMinutes(),
    giay: mocDich.getUTCSeconds(),
    miliGiay: mocDich.getUTCMilliseconds(),
  };
}

export function taoMocUtcTuNgayGioVietNam(
  thanhPhan: Pick<ThanhPhanNgayGioVietNam, "nam" | "thang" | "ngay"> &
    Partial<Pick<ThanhPhanNgayGioVietNam, "gio" | "phut" | "giay" | "miliGiay">>,
): Date {
  const gio = thanhPhan.gio ?? 0;
  const phut = thanhPhan.phut ?? 0;
  const giay = thanhPhan.giay ?? 0;
  const miliGiay = thanhPhan.miliGiay ?? 0;
  const utc =
    Date.UTC(thanhPhan.nam, thanhPhan.thang - 1, thanhPhan.ngay, gio, phut, giay, miliGiay) -
    DO_LECH_MUI_GIO_VIET_NAM_THEO_MILIGIAY;

  return new Date(utc);
}

export function layMocDauNgayHomNayVietNam(mocThamChieu: Date = new Date()): Date {
  const { nam, thang, ngay } = layThanhPhanNgayGioVietNam(mocThamChieu);
  return taoMocUtcTuNgayGioVietNam({ nam, thang, ngay });
}

export function layMocDauThangNayVietNam(mocThamChieu: Date = new Date()): Date {
  const { nam, thang } = layThanhPhanNgayGioVietNam(mocThamChieu);
  return taoMocUtcTuNgayGioVietNam({ nam, thang, ngay: 1 });
}

export function layMocDauNamNayVietNam(mocThamChieu: Date = new Date()): Date {
  const { nam } = layThanhPhanNgayGioVietNam(mocThamChieu);
  return taoMocUtcTuNgayGioVietNam({ nam, thang: 1, ngay: 1 });
}

export function congNgayTheoMocVietNam(moc: Date, soNgay: number): Date {
  return new Date(moc.getTime() + soNgay * SO_MILIGIAY_MOI_NGAY);
}

export function layMocDauNgayKeTiepVietNam(mocThamChieu: Date = new Date()): Date {
  return congNgayTheoMocVietNam(layMocDauNgayHomNayVietNam(mocThamChieu), 1);
}
