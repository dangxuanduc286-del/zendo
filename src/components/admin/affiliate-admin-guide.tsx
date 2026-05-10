import Link from "next/link";
import AffiliateAdminGuideSteps, {
  type AffiliateAdminGuideStep,
} from "./affiliate-admin-guide-steps";

type AffiliateAdminGuideProps = {
  affiliateEnabled: boolean;
  commissionRate: number;
  payoutThreshold: number;
  cookieDuration: number;
  attributionRule: string;
  rewardPointEnabled: boolean;
  withdrawalEnabled: boolean;
  ctvGuideContent: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function attributionLabel(value: string): string {
  if (value === "first_click") return "Click đầu tiên";
  if (value === "ref_priority") return "Ưu tiên mã ref";
  return "Click cuối cùng";
}

function buildSteps(input: AffiliateAdminGuideProps): AffiliateAdminGuideStep[] {
  return [
    {
      id: 1,
      title: "Bật chương trình CTV",
      summary: "Kích hoạt toàn bộ luồng cộng tác viên trên hệ thống.",
      purpose: "Đảm bảo toàn bộ các tab nghiệp vụ CTV hoạt động theo cấu hình hiện tại.",
      location: "Tab Cài đặt",
      checkItems: [
        "Kiểm tra trạng thái affiliateEnabled.",
        "Nếu đang tắt, bật công tắc chương trình CTV rồi lưu.",
      ],
      expected: "Module CTV sẵn sàng vận hành và hiển thị đầy đủ theo cấu hình.",
      status: input.affiliateEnabled ? "Đang bật" : "Đang tắt",
      statusTone: input.affiliateEnabled ? "ok" : "warn",
    },
    {
      id: 2,
      title: "Cấu hình chính sách CTV",
      summary: "Thiết lập tỷ lệ, ngưỡng, cookie, attribution và các tính năng phụ trợ.",
      purpose: "Định nghĩa cách ghi nhận, tính thưởng và điều kiện thanh toán cho toàn chương trình.",
      location: "Tab Cài đặt",
      checkItems: [
        `Tỷ lệ hoa hồng mặc định: ${input.commissionRate}%.`,
        `Ngưỡng thanh toán tối thiểu: ${formatCurrency(input.payoutThreshold)}.`,
        `Cookie giới thiệu: ${input.cookieDuration} ngày.`,
        `Attribution: ${attributionLabel(input.attributionRule)}.`,
        `Điểm thưởng: ${input.rewardPointEnabled ? "Đang bật" : "Đang tắt"}.`,
        `Rút tiền CTV: ${input.withdrawalEnabled ? "Đang bật" : "Đang tắt"}.`,
      ],
      expected: "Chính sách CTV rõ ràng, đồng bộ trước khi phát sinh đơn/hoa hồng.",
      status: "Đủ điều kiện",
      statusTone: "info",
    },
    {
      id: 3,
      title: "Quản lý danh sách CTV",
      summary: "Theo dõi hồ sơ cộng tác viên, mã ref và trạng thái hoạt động.",
      purpose: "Kiểm soát tài khoản CTV đang chạy, tạm dừng hoặc khóa khi cần.",
      location: "Tab Danh sách CTV",
      checkItems: [
        "Rà soát thông tin liên hệ, mã giới thiệu và số liệu cơ bản.",
        "Thao tác tạm dừng / kích hoạt / khóa theo chính sách vận hành.",
      ],
      expected: "Danh sách CTV được kiểm soát trạng thái và phân loại rõ ràng.",
      status: "Sẵn sàng thao tác",
      statusTone: "info",
    },
    {
      id: 4,
      title: "Theo dõi click / nguồn giới thiệu",
      summary: "Kiểm tra lưu lượng giới thiệu theo refCode, nguồn và chiến dịch.",
      purpose: "Đo chất lượng traffic CTV và phát hiện bất thường nguồn truy cập.",
      location: "Tab Click / Theo dõi giới thiệu",
      checkItems: [
        "Đối chiếu click hợp lệ, click có gắn đơn.",
        "Kiểm tra nguồn/chiến dịch để phát hiện bất thường.",
      ],
      expected: "Nắm rõ chất lượng traffic giới thiệu trước khi xét đơn/hoa hồng.",
      status: "Dựa trên dữ liệu click thực tế",
      statusTone: "info",
    },
    {
      id: 5,
      title: "Theo dõi đơn phát sinh từ CTV",
      summary: "Xác minh đơn do CTV giới thiệu và trạng thái thanh toán của đơn.",
      purpose: "Xác định đơn đủ điều kiện trước khi đi vào vòng duyệt hoa hồng.",
      location: "Tab Đơn phát sinh",
      checkItems: [
        "Kiểm tra refCode, doanh thu, trạng thái đơn và trạng thái thanh toán.",
        "Xác định đơn hợp lệ để làm đầu vào cho duyệt hoa hồng.",
      ],
      expected: "Dữ liệu đơn phát sinh chính xác phục vụ duyệt hoa hồng.",
      status: "Đối soát theo đơn thực tế",
      statusTone: "info",
    },
    {
      id: 6,
      title: "Quản lý hoa hồng",
      summary: "Duyệt, hủy hoặc đánh dấu đã thanh toán hoa hồng theo quy định.",
      purpose: "Điều phối dòng tiền hoa hồng chính xác theo tình trạng đơn hàng thực tế.",
      location: "Tab Hoa hồng",
      checkItems: [
        "Chỉ duyệt hoa hồng của đơn hợp lệ.",
        "Không duyệt/không thanh toán các đơn vi phạm điều kiện (hủy/hoàn/failed).",
      ],
      expected: "Hoa hồng được duyệt đúng quy tắc và minh bạch trạng thái chi trả.",
      status: `Dùng tỷ lệ mặc định ${input.commissionRate}% nếu CTV không có rate riêng`,
      statusTone: "info",
    },
    {
      id: 7,
      title: "Quản lý điểm thưởng CTV",
      summary: "Theo dõi phát sinh điểm, điểm khả dụng, đã dùng và đã hủy.",
      purpose: "Đảm bảo chương trình điểm thưởng vận hành đúng chính sách thưởng.",
      location: "Tab Điểm thưởng CTV",
      checkItems: [
        "Kiểm tra dòng phát sinh điểm theo đơn/chính sách.",
        "Theo dõi trạng thái điểm để xử lý khiếu nại nếu có.",
      ],
      expected: "Điểm thưởng được ghi nhận đúng và có thể kiểm toán nhanh.",
      status: input.rewardPointEnabled ? "Đang bật" : "Đang tắt",
      statusTone: input.rewardPointEnabled ? "ok" : "warn",
    },
    {
      id: 8,
      title: "Đối soát / thanh toán",
      summary: "Chốt số tiền cần trả và xác nhận thanh toán theo ngưỡng quy định.",
      purpose: "Kết sổ công nợ hoa hồng theo kỳ và giảm sai lệch thanh toán.",
      location: "Tab Đối soát / Thanh toán",
      checkItems: [
        "Kiểm tra CTV đủ điều kiện thanh toán theo ngưỡng.",
        `Ngưỡng đang áp dụng: ${formatCurrency(input.payoutThreshold)}.`,
      ],
      expected: "Kỳ đối soát rõ ràng, giảm sai lệch giữa hoa hồng duyệt và thanh toán.",
      status: input.payoutThreshold > 0 ? "Đủ điều kiện" : "Cần cấu hình",
      statusTone: "info",
    },
    {
      id: 9,
      title: "Quản lý rút tiền CTV",
      summary: "Xử lý yêu cầu rút tiền: duyệt, từ chối hoặc đánh dấu đã thanh toán.",
      purpose: "Kiểm soát luồng rút tiền CTV theo đúng thứ tự trạng thái.",
      location: "Luồng rút tiền CTV hiện có của module",
      checkItems: [
        "Nếu bật rút tiền: xử lý tuần tự theo trạng thái yêu cầu.",
        "Nếu tắt rút tiền: theo dõi lịch sử và bật lại khi cần vận hành.",
      ],
      expected: "Yêu cầu rút tiền được xử lý đúng trạng thái, không nhảy bước trái quy tắc.",
      status: input.withdrawalEnabled ? "Đang bật" : "Đang tắt",
      statusTone: input.withdrawalEnabled ? "ok" : "warn",
    },
    {
      id: 10,
      title: "Cập nhật nội dung hướng dẫn & cài đặt",
      summary: "Duy trì tài liệu vận hành và chính sách CTV nhất quán cho đội admin.",
      purpose: "Giữ tài liệu nội bộ và cấu hình nghiệp vụ luôn đồng bộ theo chính sách mới.",
      location: "Tab Cài đặt",
      checkItems: [
        "Cập nhật ctvGuideContent theo chính sách mới.",
        "Rà soát định kỳ các cấu hình CTV trước chiến dịch lớn.",
      ],
      expected: "Tài liệu vận hành luôn đồng bộ với cấu hình thực tế của hệ thống.",
      status: input.ctvGuideContent.trim().length > 0 ? "Đủ điều kiện" : "Cần cấu hình",
      statusTone: input.ctvGuideContent.trim().length > 0 ? "ok" : "warn",
    },
  ];
}

export default function AffiliateAdminGuide(props: AffiliateAdminGuideProps): JSX.Element {
  const steps = buildSteps(props);
  const configRows = [
    { key: "Trạng thái chương trình", value: props.affiliateEnabled ? "Đang bật" : "Đang tắt" },
    { key: "Tỷ lệ hoa hồng mặc định", value: `${props.commissionRate}%` },
    { key: "Ngưỡng thanh toán tối thiểu", value: formatCurrency(props.payoutThreshold) },
    { key: "Thời gian cookie", value: `${props.cookieDuration} ngày` },
    { key: "Quy tắc attribution", value: attributionLabel(props.attributionRule) },
    { key: "Điểm thưởng CTV", value: props.rewardPointEnabled ? "Đang bật" : "Đang tắt" },
    { key: "Rút tiền CTV", value: props.withdrawalEnabled ? "Đang bật" : "Đang tắt" },
  ];

  return (
    <section className="space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">Hướng dẫn CTV cho Admin</h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Tài liệu vận hành nội bộ cho quản trị viên, bám theo dữ liệu cấu hình CTV thật từ{" "}
            <span className="font-medium">website_settings</span>.
          </p>
        </div>
        <Link
          href="/admin/collaborators?tab=cai-dat#ctv-guide"
          className="inline-flex h-10 items-center rounded-xl border border-[#2563EB] px-3 text-sm font-semibold text-[#2563EB] hover:bg-sky-50"
        >
          Chỉnh sửa trong Cài đặt
        </Link>
      </div>

      <article className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:p-5">
        <h3 className="text-base font-semibold text-[#0F172A]">Thông tin cấu hình hiện tại</h3>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {configRows.map((row) => (
            <div key={row.key} className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5">
              <p className="text-xs text-[#64748B]">{row.key}</p>
              <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">{row.value}</p>
            </div>
          ))}
        </div>
      </article>

      <AffiliateAdminGuideSteps steps={steps} />

      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-amber-900">Lưu ý vận hành cho admin</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-amber-900">
          <li>Chỉ duyệt hoa hồng cho đơn hợp lệ; kiểm tra trạng thái đơn và thanh toán trước khi duyệt.</li>
          <li>Đối soát theo ngưỡng thanh toán tối thiểu đang cấu hình trong hệ thống.</li>
          <li>Khi bật điểm thưởng hoặc rút tiền, cần theo dõi thêm các tab nghiệp vụ tương ứng.</li>
          <li>Không xử lý thanh toán tắt quy trình; luôn thao tác theo đúng trạng thái của bản ghi.</li>
          <li>Cập nhật nội dung hướng dẫn trong tab Cài đặt khi thay đổi chính sách vận hành.</li>
        </ul>
      </article>
    </section>
  );
}

