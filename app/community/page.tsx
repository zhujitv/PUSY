import Image from "next/image";
import type { Metadata } from "next";
import { PageShell } from "../components/SiteChrome";
import { getPreviewMemberIdentity } from "../../lib/preview-member-auth";
import { getCommunityProfileForMember, listCommunityPosts, type CommunityPost } from "../../lib/community/posts";
import { getCommunitySocialSummary, getCommunityStats, listCommunityTopics, listSuggestedCommunityMembers, type CommunityTopic } from "../../lib/community/social";
import { CommunityPostCard } from "./CommunityPostCard";
import { CommunityNavigation } from "./CommunityNavigation";
import { CommunityIcon } from "./CommunityIcon";
import { FollowButton } from "./FollowButton";

export const metadata: Metadata = {
  title: "PÚSY CLUB 社区｜真实美妆灵感",
  description: "浏览 PÚSY CLUB 会员分享的真实妆容、护理体验与日常灵感。",
  alternates: { canonical: "https://pusy.cn/community" },
};
export const dynamic = "force-dynamic";

const topicImages: Record<string, string> = {
  "daily-makeup": "/assets/31.webp",
  "lip-diary": "/assets/34.webp",
  "real-empties": "/assets/29.webp",
  "body-care": "/assets/12.webp",
  "hair-inspiration": "/assets/15.webp",
};

type SuggestedMember = Awaited<ReturnType<typeof listSuggestedCommunityMembers>>[number];

export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ topic?: string; feed?: string }> }) {
  const query = await searchParams;
  const selectedTopic = /^[a-z0-9-]{2,40}$/.test(query.topic ?? "") ? query.topic : undefined;
  const feed = query.feed === "following" ? "following" as const : "all" as const;
  let posts: CommunityPost[] = [];
  let topics: CommunityTopic[] = [];
  let suggestions: SuggestedMember[] = [];
  let viewer: Awaited<ReturnType<typeof getPreviewMemberIdentity>> = null;
  let viewerPublicId: string | undefined;
  let unreadCount = 0;
  let memberCount = 0;
  let unavailable = false;
  try {
    viewer = await getPreviewMemberIdentity();
    const [postRows, topicRows, stats, profile, social, memberRows] = await Promise.all([
      listCommunityPosts({ viewerMemberId: viewer?.memberId, topicSlug: selectedTopic, feed, limit: 24 }),
      listCommunityTopics(),
      getCommunityStats(),
      viewer ? getCommunityProfileForMember(viewer.memberId) : Promise.resolve(null),
      viewer ? getCommunitySocialSummary(viewer.memberId) : Promise.resolve(null),
      listSuggestedCommunityMembers(viewer?.memberId, 3),
    ]);
    posts = postRows;
    topics = topicRows;
    suggestions = memberRows;
    memberCount = stats.memberCount;
    viewerPublicId = profile?.public_id;
    unreadCount = social?.unreadCount ?? 0;
  } catch {
    unavailable = true;
  }

  const loginUrl = `/account/login?returnTo=${encodeURIComponent("/community/publish")}`;
  const publishHref = viewer ? "/community/publish" : loginUrl;
  const activeTopic = topics.find((topic) => topic.slug === selectedTopic);
  return <PageShell><CommunityNavigation active="home" viewerPublicId={viewerPublicId} unreadCount={unreadCount} /><main className="community-page community-prototype-home">
    <section className="community-prototype-hero">
      <div className="community-prototype-hero-copy">
        <div className="community-eyebrow"><span />PÚSY BEAUTY CIRCLE</div>
        <h1>让每一种美，<br />都有自己的表达。</h1>
        <p>真实分享、使用心得与灵感日常。来自 PÚSY 会员，也属于每一个正在探索自己的你。</p>
        <div className="community-hero-actions"><a className="community-button dark" href={publishHref}>分享我的此刻 <CommunityIcon name="chevron" size={17} /></a><a className="community-text-link" href="#feed">看看大家在聊什么</a></div>
        <div className="community-hero-proof"><div>{[31, 1, 8, 34].map((asset) => <Image key={asset} src={`/assets/${String(asset).padStart(2, "0")}.webp`} width={38} height={38} alt="PÚSY 社区灵感" />)}</div><p><strong>{memberCount.toLocaleString("zh-CN")}</strong> 位会员已加入分享</p></div>
      </div>
      <div className="community-hero-gallery" aria-label="PÚSY 社区精选内容">
        <figure className="tall"><Image src="/assets/31.webp" alt="自然光感妆容灵感" fill priority sizes="(max-width: 900px) 65vw, 34vw" /><figcaption><span>本周精选</span>自然光感，不必用力</figcaption></figure>
        <figure><Image src="/assets/15.webp" alt="顺滑发丝护理灵感" fill priority sizes="(max-width: 900px) 35vw, 22vw" /></figure>
        <figure><Image src="/assets/01.webp" alt="日常保湿护理灵感" fill sizes="(max-width: 900px) 35vw, 22vw" /></figure>
      </div>
    </section>

    <section className="community-topic-section" id="topics">
      <header><div><span>DISCOVER</span><h2>今天想聊什么？</h2></div>{selectedTopic && <a href="/community#feed">查看全部话题内容 →</a>}</header>
      <div className="community-topic-strip">{topics.map((topic) => <a className={selectedTopic === topic.slug ? "active" : ""} href={`/community?topic=${encodeURIComponent(topic.slug)}#feed`} key={topic.id}><Image src={topicImages[topic.slug] ?? "/assets/31.webp"} alt="" fill sizes="(max-width: 720px) 44vw, 20vw" /><span><strong>#{topic.name}</strong><small>{topic.post_count} 篇分享</small></span></a>)}</div>
    </section>

    <section className="community-feed-layout" id="feed">
      <div className="community-feed-main">
        <header className="community-feed-toolbar"><nav aria-label="社区内容范围"><a className={feed === "all" ? "active" : ""} href={selectedTopic ? `/community?topic=${selectedTopic}#feed` : "/community#feed"}>精选</a><a className={feed === "all" ? "" : "active"} href={viewer ? `/community?feed=following${selectedTopic ? `&topic=${selectedTopic}` : ""}#feed` : `/account/login?returnTo=${encodeURIComponent("/community?feed=following#feed")}`}>关注</a></nav><span>{activeTopic ? `正在浏览 #${activeTopic.name}` : feed === "following" ? "只看我关注的会员" : "每篇分享都经过社区审核"}</span></header>
        {unavailable ? <section className="community-empty"><span>COMMUNITY SERVICE</span><h2>社区正在准备中</h2><p>数据库迁移完成后，这里会展示会员的最新分享。</p></section>
          : posts.length ? <div className="community-feed community-prototype-feed" aria-label="社区公开内容">{posts.map((post) => <CommunityPostCard post={post} signedIn={Boolean(viewer)} isOwner={viewer?.memberId === post.member_id} key={post.id} />)}</div>
            : <section className="community-empty"><span>{feed === "following" ? "FOLLOWING FEED" : "BE THE FIRST"}</span><h2>{feed === "following" ? "关注动态还是空的" : activeTopic ? `#${activeTopic.name} 等你分享` : "第一篇分享，等你发布"}</h2><p>{feed === "following" ? "关注感兴趣的会员，他们审核通过的新分享会显示在这里。" : "上传你的图片和真实感受，审核通过后会展示在这里。"}</p><a href={publishHref}>开始分享 →</a></section>}
      </div>
      <aside className="community-sidebar">
        <section className="community-weekly-card"><span>WEEKLY PROMPT</span><h3>本周话题</h3><strong>#{topics[0]?.name ?? "真实分享"}</strong><p>{topics[0]?.description ?? "记录真实的使用方式和感受，让选择更有依据。"}</p><a href={viewer ? `/community/publish?topic=${encodeURIComponent(topics[0]?.slug ?? "daily-makeup")}` : loginUrl}>参与话题</a></section>
        <section className="community-creators"><header><h3>值得关注</h3><small>真实社区会员</small></header>{suggestions.length ? suggestions.map((member) => <div key={member.public_id}><a href={`/community/members/${member.public_id}`}><i>{member.display_name.slice(0, 1)}</i><span><strong>{member.display_name}</strong><small>{member.bio || `${member.post_count} 篇公开分享`}</small></span></a><FollowButton publicId={member.public_id} initialFollowing={member.viewer_is_following} signedIn={Boolean(viewer)} loginReturnTo="/community" compact /></div>) : <p>会员发布并通过审核后，会出现在这里。</p>}</section>
        <section className="community-rules-card"><CommunityIcon name="shield" /><div><h3>真实、尊重、有帮助</h3><p>不夸大功效，不攻击他人。商业合作需要清晰标注。</p><a href="/oferta">查看社区公约 →</a></div></section>
      </aside>
    </section>
  </main></PageShell>;
}
