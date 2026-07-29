import { InfoPage } from "../components/InfoPage";
import { formatCnyFromRub } from "../data/products";
export default function DeliveryPage() { return <InfoPage eyebrow="中国客户服务" title="配送说明" intro="中国大陆订单完成支付后，由中国仓库按结账页面选择的配送方式发出。">
  <h2>配送方式</h2><div className="delivery-table"><div><b>标准快递</b><span>{formatCnyFromRub(390)}</span><em>以结账页为准</em></div><div><b>顺丰速运</b><span>{formatCnyFromRub(590)}</span><em>以结账页为准</em></div><div><b>门店自提</b><span>免费</span><em>收到通知后自提</em></div><div><b>满额包邮</b><span>满 {formatCnyFromRub(5000)}</span><em>标准快递</em></div></div>
  <h2>配送范围与时效</h2><p>当前面向中国大陆可送达地区提供服务。预计时效会因收货地址、天气、节假日、促销高峰和物流服务商安排而变化，以结账页和发货通知为准。港澳台及跨境地区暂不按本政策配送。</p>
  <h2>发货与物流查询</h2><p>支付成功并完成订单确认后，我们通常在1至3个工作日内完成出库。发货后会通过已启用的短信或邮件渠道发送物流信息，也可在会员中心查询订单进度。</p>
  <h2>签收异常</h2><p>签收前请检查外包装。发现明显破损、渗漏或商品与订单不符时，请拍摄外包装、物流面单和商品照片，并尽快联系客服。因商品质量、错发或漏发产生的合理退换费用由经营者承担。</p>
</InfoPage>; }
