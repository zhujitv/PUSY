import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../lib/preview-member-auth";
import { AccountClient } from "./AccountClient";

export const metadata: Metadata = { title: "会员中心｜PUSY.CN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string; social?: string; provider?: string; tab?: string }> }) {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) redirect("/account/login");
  const { welcome = "", social = "", provider = "", tab = "overview" } = await searchParams;
  const initialTab = ["overview", "club", "growth", "profile", "addresses", "wishlist", "orders", "invoices", "finance", "returns"].includes(tab) ? tab : "overview";
  return <PageShell><AccountClient viewer={viewer.displayName} email={viewer.email} showWelcome={welcome === "1"} socialStatus={social} socialProvider={provider} initialTab={initialTab} /></PageShell>;
}
