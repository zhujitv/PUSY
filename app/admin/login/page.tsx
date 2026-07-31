import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminAuthConfigured, getAdminIdentity } from "../../../lib/admin-auth";
import { AdminLoginClient } from "./AdminLoginClient";

export const metadata: Metadata = { title: "管理后台登录｜PUSY.CN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdminIdentity()) redirect("/admin");
  const error = (await searchParams).error;
  const initialError = error === "rate-limited"
    ? "登录尝试过于频繁，请稍后再试"
    : error === "origin-invalid"
      ? "登录请求来源校验失败，请刷新页面后重试"
      : error
        ? "账号或密码不正确"
        : "";
  return <AdminLoginClient configured={adminAuthConfigured()} initialError={initialError} />;
}
