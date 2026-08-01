import { PageShell } from "../components/SiteChrome";
import Image from "next/image";
import { RetailPartnershipForm } from "./RetailPartnershipForm";
import { publicPageMetadata } from "../../lib/site-metadata";

export const metadata = publicPageMetadata("/stores-china", "中国官方渠道｜PUSY.CN", "查看 PÚSY 中国官方商城及中国零售渠道合作信息。");

export default function StoresChinaPage() {
  return <PageShell><main className="stores-page"><header><p>中国大陆 · PUSY.CN</p><h1>中国官方渠道</h1></header><section><article><span>官方商城</span><h2>PUSY.CN</h2><p>中国订单以人民币结算，支持微信支付和支付宝，并适用本网站公布的中国配送、退换货与隐私政策。</p><a href="/catalog/products">进入商品目录 →</a></article><article className="store-visual"><Image src="/assets/10.webp" alt="PÚSY 中国彩妆产品" width={960} height={960} sizes="(max-width: 800px) 100vw, 50vw" /></article><article className="retail-partnership-card" id="retail-partnership"><span>渠道合作</span><h2>中国零售合作</h2><p>第三方平台或线下门店只有在本页正式公示后，才视为中国授权渠道。请直接填写以下资料，无需打开邮箱。</p><RetailPartnershipForm /></article></section></main></PageShell>;
}
