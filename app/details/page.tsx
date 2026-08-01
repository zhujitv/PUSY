import { InfoPage } from "../components/InfoPage";
import { chinaComplianceReady, chinaRegion } from "../../lib/china-region";
import { publicPageMetadata } from "../../lib/site-metadata";

export const metadata = publicPageMetadata("/details", "经营者信息｜PUSY.CN", "PUSY.CN 中国电子商务经营主体、客户服务与网站备案信息。");

export default function DetailsPage() {
  return <InfoPage eyebrow="中国经营信息" title="经营者信息" intro="本页用于公示 PUSY.CN 中国电子商务经营主体、联系方式与网站备案信息。">
    {!chinaComplianceReady && <div className="legal-warning"><b>上线前配置项</b><p>以下带“待补充”的信息必须由中国运营主体确认并通过服务器环境变量配置后，方可正式对外营业。</p></div>}
    <h2>经营主体</h2>
    <dl className="legal-details"><div><dt>经营者名称</dt><dd>{chinaRegion.operatorName}</dd></div><div><dt>统一社会信用代码</dt><dd>{chinaRegion.unifiedSocialCreditCode}</dd></div><div><dt>注册地址</dt><dd>{chinaRegion.registeredAddress}</dd></div><div><dt>网站</dt><dd>{chinaRegion.domain}</dd></div></dl>
    <h2>客户服务与消费争议</h2>
    <p>客服电话：{chinaRegion.customerServicePhone}</p><p>在线客服：<a href="/contact">填写客户服务表单</a>，无需打开邮件客户端。</p><p>如与我们协商后争议仍未解决，消费者可依法通过全国12315平台或有管辖权的市场监督管理部门寻求帮助。</p>
    <h2>网站备案</h2>
    <dl className="legal-details"><div><dt>ICP备案</dt><dd>{chinaRegion.icpNumber}</dd></div><div><dt>公安联网备案</dt><dd>{chinaRegion.publicSecurityNumber}</dd></div></dl>
    <p className="legal-meta">最近更新：{chinaRegion.updatedAt}</p>
  </InfoPage>;
}
