import { InfoPage } from "../components/InfoPage";
import { getPreviewMemberIdentity } from "../../lib/preview-member-auth";
import { ContactForm } from "./ContactForm";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ category?: string; orderId?: string }> }) {
  const params = await searchParams;
  const viewer = await getPreviewMemberIdentity().catch(() => null);
  return <InfoPage eyebrow="中国客户服务" title="在线联系客服" intro="咨询与退换货共用一个入口。选择售后问题后，系统会安全调用你的交易订单，无需复制订单号，也无需打开邮件客户端。">
    <div className="contact-service-intro"><article><b>一个客服入口</b><p>订单、商品、配送、支付、退换货、会员账号及个人信息问题均在这里提交。</p></article><article><b>售后自动查单</b><p>会员可直接选择订单；未登录客户验证下单邮箱后即可查看多笔交易订单。</p></article><article><b>提交后</b><p>售后申请会同时关联客服工单，处理进度与邮件回复保留在同一记录中。</p></article></div>
    <ContactForm defaultCategory={String(params.category ?? "").slice(0, 30)} defaultOrderId={String(params.orderId ?? "").slice(0, 64)} defaultName={viewer?.displayName ?? ""} defaultEmail={viewer?.email ?? ""} />
  </InfoPage>;
}
