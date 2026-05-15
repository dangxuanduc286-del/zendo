import OrderLookup from "../../../../../components/storefront/order-lookup";
import { adminCardBody, adminPageHeader, adminPageSubtitle, adminPageTitle } from "../../../../../lib/admin-ui";

export default function AdminOrderLookupPage(): JSX.Element {
  return (
    <main className="w-full min-w-0 max-w-none space-y-5">
      <header className={adminPageHeader}>
        <h1 className={adminPageTitle}>Tra cứu đơn</h1>
        <p className={adminPageSubtitle}>
          Nhập mã đơn hàng và số điện thoại đặt hàng — cùng biểu mẫu tra cứu công khai trên cửa hàng.
        </p>
      </header>
      <div className={adminCardBody}>
        <OrderLookup />
      </div>
    </main>
  );
}
