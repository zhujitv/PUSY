import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pusy.cn"),
  title: "PÚSY 官方网站｜彩妆与护肤",
  description: "PÚSY 官方中文网站。探索彩妆、护肤、身体护理、头发护理与家居产品。",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://pusy.cn",
    siteName: "PÚSY 中国",
    title: "PÚSY 官方网站｜彩妆与护肤",
    description: "PÚSY 官方中文网站。探索彩妆、护肤、身体护理、头发护理与家居产品。",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
