import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { MemberAuthClient } from "./MemberAuthClient";

export const metadata: Metadata = { title: "会员登录与注册｜PUSY.CN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MemberLoginPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  if (await getPreviewMemberIdentity()) redirect("/account");
  const { ref = "" } = await searchParams;
  const referralCode = ref.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  return <PageShell><MemberAuthClient referralCode={referralCode} /></PageShell>;
}
