import { redirect } from "next/navigation";

/** Alias đăng nhập storefront: cùng luồng với `/tai-khoan` (NextAuth signIn). */
export default function DangNhapPage(): never {
  redirect("/tai-khoan");
}
