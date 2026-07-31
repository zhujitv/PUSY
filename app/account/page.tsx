import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../lib/preview-member-auth";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = { title: "会员中心｜PUSY.CN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string; social?: string; provider?: string }> }) {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) redirect("/account/login");
  const { welcome = "", social = "", provider = "" } = await searchParams;
  return <PageShell><AccountClient viewer={viewer.displayName} email={viewer.email} showWelcome={welcome === "1"} socialStatus={social} socialProvider={provider} /></PageShell>;
}
