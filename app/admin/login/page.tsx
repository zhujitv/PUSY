import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminAuthConfigured, getAdminIdentity } from "../../../lib/admin-auth";
import { AdminLoginClient } from "./AdminLoginClient";

export const metadata: Metadata = { title: "管理后台登录｜PUSY.CN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdminIdentity()) redirect("/admin");
  return <AdminLoginClient configured={adminAuthConfigured()} />;
}
