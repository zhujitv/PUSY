import { InfoPage } from "../components/InfoPage";
import { formatCnyFromRub } from "../data/products";
import { FREE_STANDARD_SHIPPING_THRESHOLD, SF_SHIPPING_FEE, STANDARD_SHIPPING_FEE } from "../../lib/shipping";
import { publicPageMetadata } from "../../lib/site-metadata";
export const metadata = publicPageMetadata("/delivery", "配送说明｜PUSY.CN", "查看 PUSY.CN 中国大陆订单的配送方式、费用、包邮门槛、时效与签收说明。");
export default function DeliveryPage() { return <InfoPage eyebrow="中国客户服务" title="配送说明" intro="中国大陆订单完成支付后，由中国仓库按结账页面选择的配送方式发出。">
  <h2>配送方式</h2><div className="delivery-table"><div><b>标准快递</b><span>{formatCnyFromRub(STANDARD_SHIPPING_FEE)}</span><em>中通、圆通、申通或韵达等，由仓库择优安排</em></div><div><b>顺丰速运</b><span>{formatCnyFromRub(SF_SHIPPING_FEE)}</span><em>顾客主动选择的升级配送</em></div><div><b>电子礼品卡</b><span>免费</span><em>发送至礼品卡中填写的收件人邮箱</em></div><div><b>实体商品满额包邮</b><span>满 {formatCnyFromRub(FREE_STANDARD_SHIPPING_THRESHOLD)}</span><em>仅免标准快递费，礼品卡金额不计入门槛</em></div></div>
  <p>以上为 PUSY.CN 面向顾客的固定配送价格，可能包含商城补贴，不等同于物流公司的所有线路零售报价。偏远或临时不可达地区如需调整配送方案，我们会在发货前联系确认，不会在下单后擅自加收费用。</p>
  <h2>配送范围与时效</h2><p>当前面向中国大陆可送达地区提供服务。预计时效会因收货地址、天气、节假日、促销高峰和物流服务商安排而变化，以结账页和发货通知为准。港澳台及跨境地区暂不按本政策配送。</p>
  <h2>运输保价</h2><p>结账页不单独收取保价费。对于需要声明价值服务的高价值实体订单，由 PUSY.CN 根据承运商当时规则安排并承担相应费用；电子礼品卡没有实体运输和保价费用。物流损坏或遗失将依据订单、签收凭证及适用法律处理，不以承运商赔付结果限制消费者依法享有的权利。</p>
  <h2>发货与物流查询</h2><p>支付成功并完成订单确认后，我们通常在1至3个工作日内完成出库。发货后会通过已启用的短信或邮件渠道发送物流信息，也可在会员中心查询订单进度。</p>
  <h2>签收异常</h2><p>签收前请检查外包装。发现明显破损、渗漏或商品与订单不符时，请拍摄外包装、物流面单和商品照片，并尽快联系客服。因商品质量、错发或漏发产生的合理退换费用由经营者承担。</p>
</InfoPage>; }
