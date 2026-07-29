import type { Metadata } from "next";
import { AdminClient } from "./AdminClient";
import { requireChatGPTUser } from "../chatgpt-auth";
export const metadata: Metadata = { title: "PUSY.CN 商城管理后台", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminPage() { const isProduction = process.env.NODE_ENV === "production"; const viewer = isProduction ? await requireChatGPTUser("/admin") : { displayName: "本地管理员", email: "local@PUSY.CN", fullName: "本地管理员" }; return <AdminClient viewer={viewer.displayName} canSignOut={isProduction} />; }
