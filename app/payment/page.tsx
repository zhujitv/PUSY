import { InfoPage } from "../components/InfoPage";
import { publicPageMetadata } from "../../lib/site-metadata";
export const metadata = publicPageMetadata("/payment", "支付方式｜PUSY.CN", "了解 PUSY.CN 人民币订单支持的微信支付、支付宝、支付结果与退款安排。");
export default function PaymentPage() { return <InfoPage eyebrow="中国客户服务" title="支付方式" intro="PUSY.CN 中国订单以人民币结算，支付渠道由后台独立配置并通过官方接口完成交易。">
  <h2>支持的支付渠道</h2><div className="payment-cards"><span>微信支付</span><span>支付宝</span></div><p>结账页只会显示当前已启用且配置完整的支付渠道。网站不会要求你向个人银行卡、个人收款码或页面以外的账户转账。</p>
  <h2>支付结果</h2><p>付款是否成功，以微信支付或支付宝服务器通知以及订单中心显示的状态为准。付款完成后请勿重复支付；页面未及时更新时，可在会员中心查询或点击同步支付状态。</p>
  <h2>支付失败与重试</h2><p>请检查网络、账户余额、支付限额及支付机构的风控提示。失败订单可以重新发起支付；只有支付成功并完成订单确认后，商品才会进入配货流程。</p>
  <h2>退款</h2><p>退款申请审核通过后，将通过原支付渠道退回。网站会同步退款状态，实际到账时间以微信支付、支付宝及开户银行的处理进度为准。我们不会要求你提供支付密码或短信验证码来办理退款。</p>
</InfoPage>; }
