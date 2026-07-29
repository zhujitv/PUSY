import { InfoPage } from "../components/InfoPage";
import { chinaRegion } from "../../lib/china-region";

export default function CookiePage() { return <InfoPage eyebrow="中国法律信息" title="Cookie 政策" intro="PUSY.CN 将必要 Cookie 与需要你同意的分析、个性化功能分开管理。">
  <h2>必要 Cookie</h2><p>必要 Cookie 或本地存储用于维持购物车、登录状态、支付安全、防止重复提交、保存隐私选择及保障网站运行。此类功能是提供你主动请求的服务所必需的，关闭后购物或账户功能可能无法正常使用。</p>
  <h2>分析与个性化</h2><p>我们仅在你选择“接受全部”后启用非必要的访问分析、效果衡量或个性化功能。当前版本未启用广告定向 Cookie；如未来增加新的处理目的，我们会更新本政策并重新征求必要的同意。</p>
  <h2>如何管理</h2><p>首次访问时可以选择“仅必要”或“接受全部”。你也可以清除浏览器中名为“pusy-cn-cookie-consent”的本地存储项以重新选择，或通过浏览器设置删除 Cookie。撤回同意不影响撤回前处理活动的合法性。</p>
  <h2>联系我们</h2><p>如对网站数据处理有疑问，请发送邮件至<a href={`mailto:${chinaRegion.privacyEmail}`}>{chinaRegion.privacyEmail}</a>。</p>
  <p className="legal-meta">最近更新：{chinaRegion.updatedAt}</p>
</InfoPage>; }
