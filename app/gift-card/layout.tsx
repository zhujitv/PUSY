import { publicPageMetadata } from "../../lib/site-metadata";

export const metadata = publicPageMetadata("/gift-card", "PÚSY 电子礼品卡｜PUSY.CN", "选购 PÚSY 中国电子礼品卡，通过邮件送达，余额可分多次使用。");

export default function GiftCardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
