import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminClient } from "./AdminClient";
import { getAdminIdentity } from "../../lib/admin-auth";
export const metadata: Metadata = { title: "PUSY.CN 商城管理后台", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminPage() { const viewer = await getAdminIdentity(); if (!viewer) redirect("/admin/login"); return <AdminClient viewer={viewer} canSignOut />; }
