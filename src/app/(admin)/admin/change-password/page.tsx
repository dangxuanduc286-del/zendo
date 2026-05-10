import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../../../lib/auth";

export default async function AdminChangePasswordLegacyPage(): Promise<never> {
  const session = await getServerSession(authOptions);
  const destination = session?.user?.id ? "/admin/account" : "/admin/login?callbackUrl=/admin/account";

  redirect(destination);
}
