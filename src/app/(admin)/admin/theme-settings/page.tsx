import { redirect } from "next/navigation";

export default function AdminThemeSettingsRedirect(): never {
  redirect("/admin/website-appearance#section-giao-dien");
}
