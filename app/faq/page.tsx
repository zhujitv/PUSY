import { InfoPage } from "../components/InfoPage";
import { publicPageMetadata } from "../../lib/site-metadata";
export const metadata = publicPageMetadata("/faq", "常见问题｜PUSY.CN", "查看 PUSY.CN 关于订单、支付、配送、退换货、礼品卡和产品选择的常见问题。");
const items = [["如何查看订单状态？", "登录会员中心即可查看待付款、配货、发货、完成及售后状态；发货后也会通过后台已启用的短信或邮件渠道通知。"], ["支持哪些支付方式？", "中国支持后台启用且配置完整的微信支付和支付宝，订单均以人民币结算。"], ["网购商品可以七日无理由退货吗？", "符合条件的商品可自签收次日起七日内申请。化妆品一次性密封包装拆封或损坏后，可能因卫生安全及品质原因不适用无理由退货，质量问题不受此限制。"], ["可以修改已经提交的订单吗？", "订单进入配货前请尽快联系客服。是否可以修改取决于订单状态；收货地址等关键信息不得在发货后直接变更。"], ["如何申请发票？", "可按照结账页或客服指引提交开票信息，发票类型及开具时间以中国运营主体的实际资质和税务规则为准。"], ["礼品卡可以多次使用吗？", "只要卡内仍有余额且礼品卡有效，可以分多次抵扣；具体叠加规则以结账页显示为准。"], ["怎样选择适合自己的产品？", "请查看商品详情中的成分、规格和使用说明。敏感肌或有过敏史的消费者建议先进行局部测试，必要时咨询专业人士。"]];
export default function FaqPage() { return <InfoPage eyebrow="帮助中心" title="常见问题">{items.map(([q,a]) => <details className="faq-item" key={q}><summary>{q}<span>＋</span></summary><p>{a}</p></details>)}</InfoPage>; }
