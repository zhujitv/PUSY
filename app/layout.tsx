import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "./components/StoreProvider";
import { CookieConsent } from "./components/CookieConsent";

export const metadata: Metadata = {
  metadataBase: new URL("https://pusy.cn"),
  title: "PÚSY 中国官方网站｜彩妆与护肤",
  description: "PÚSY 中国官方网站。人民币结算，支持微信支付与支付宝，探索彩妆、护肤、身体护理、头发护理与家居产品。",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://pusy.cn",
    siteName: "PÚSY 中国",
    title: "PÚSY 中国官方网站｜彩妆与护肤",
    description: "PÚSY 中国官方网站。人民币结算，支持微信支付与支付宝。",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml", sizes: "any" }],
    shortcut: "/favicon.svg",
    apple: [{ url: "/favicon.svg", type: "image/svg+xml", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><StoreProvider>{children}<CookieConsent /></StoreProvider></body></html>;
}
