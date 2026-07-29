import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireChatGPTUser } from "../chatgpt-auth";
import { PageShell } from "../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../lib/preview-member-auth";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = { title: "会员中心｜PUSY.CN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const isProduction = process.env.NODE_ENV === "production";
  const viewer = isProduction ? await requireChatGPTUser("/account") : await getPreviewMemberIdentity();
  if (!viewer) redirect("/account/login");
  return <PageShell><AccountClient viewer={viewer.displayName} email={viewer.email} /></PageShell>;
}
