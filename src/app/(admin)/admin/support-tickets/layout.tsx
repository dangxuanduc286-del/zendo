import { notFound } from "next/navigation";

export default function AdminSupportTicketsLayout({ children }: { children: React.ReactNode }): never {
  void children;
  notFound();
}
