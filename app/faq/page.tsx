import { InfoPage } from "../components/InfoPage";
const items = [["如何查看订单状态？", "订单发出后，你会收到包含物流信息的通知。也可以联系客户服务并提供订单号查询。"], ["产品是否进行动物实验？", "PÚSY 坚持不进行动物实验，并对产品进行严格质量与安全控制。"], ["可以修改已经提交的订单吗？", "订单进入打包流程前，请尽快联系客户服务。是否可以修改取决于订单当前状态。"], ["礼品卡可以多次使用吗？", "可以。只要仍有余额，礼品卡可分多次使用，直至余额用完。"], ["怎样选择适合自己的产品？", "可以浏览商品详情中的质地与使用说明，或联系客户服务获得产品选择建议。"]];
export default function FaqPage() { return <InfoPage eyebrow="帮助中心" title="常见问题">{items.map(([q,a]) => <details className="faq-item" key={q}><summary>{q}<span>＋</span></summary><p>{a}</p></details>)}</InfoPage>; }
