import type { Metadata } from "next";
import { PageShell } from "../../components/SiteChrome";
import { PaymentClient } from "./PaymentClient";

export const metadata: Metadata = { title: "安全支付｜PUSY.CN", robots: { index: false, follow: false } };
export default function PaymentPage() { return <PageShell><PaymentClient /></PageShell>; }
