import { redirect } from "next/navigation";

export default function AdminSettingsPageRedirect(): never {
  redirect("/admin/website-appearance?section=general");
}

