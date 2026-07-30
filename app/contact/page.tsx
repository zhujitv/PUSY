import { InfoPage } from "../components/InfoPage";
import { ContactForm } from "./ContactForm";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ category?: string; orderId?: string }> }) {
  const params = await searchParams;
  return <InfoPage eyebrow="中国客户服务" title="在线联系客服" intro="无需打开邮件客户端。填写表单后，咨询会直接进入 PUSY.CN 客服工单系统，我们将按你选择的方式联系。">
    <div className="contact-service-intro"><article><b>客服受理范围</b><p>订单、商品、配送、支付、售后、会员账号及个人信息相关问题。</p></article><article><b>联系信息</b><p>手机号码为必填项；微信号和电子邮箱均可选填。</p></article><article><b>提交后</b><p>系统会生成工单编号，可供后续查询和沟通时使用。</p></article></div>
    <ContactForm defaultCategory={String(params.category ?? "").slice(0, 30)} defaultOrderId={String(params.orderId ?? "").slice(0, 64)} />
  </InfoPage>;
}
