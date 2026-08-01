import { CommunityIcon } from "./CommunityIcon";

export function CommunityNavigation({ active, viewerPublicId, unreadCount = 0 }: { active: "home" | "publish" | "profile" | "notifications"; viewerPublicId?: string; unreadCount?: number }) {
  const profileHref = viewerPublicId ? `/community/members/${viewerPublicId}` : "/community/me";
  return <>
    <div className="community-announcement">PÚSY BEAUTY CIRCLE · 分享真实体验，让选择更有依据</div>
    <nav className="community-subnav" aria-label="社区导航">
      <a className="community-subnav-brand" href="/community">PÚSY <span>COMMUNITY</span></a>
      <div><a className={active === "home" ? "active" : ""} href="/community">社区</a><a href="/community#topics">话题</a><a className={active === "notifications" ? "active" : ""} href="/community/notifications">通知{unreadCount > 0 && <b>{unreadCount > 99 ? "99+" : unreadCount}</b>}</a></div>
      <aside><a className={active === "publish" ? "active primary" : "primary"} href="/community/publish"><CommunityIcon name="pen" size={16} />发布</a><a className={active === "profile" ? "active" : ""} href={profileHref}>我的主页</a></aside>
    </nav>
    <nav className="community-mobile-nav" aria-label="手机社区导航">
      <a className={active === "home" ? "active" : ""} href="/community"><CommunityIcon name="home" /><span>社区</span></a>
      <a href="/community#topics"><CommunityIcon name="spark" /><span>话题</span></a>
      <a className={active === "publish" ? "active publish" : "publish"} href="/community/publish"><CommunityIcon name="pen" /><span>发布</span></a>
      <a className={active === "notifications" ? "active notification" : "notification"} href="/community/notifications"><CommunityIcon name="bell" />{unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}<span>通知</span></a>
      <a className={active === "profile" ? "active" : ""} href={profileHref}><CommunityIcon name="user" /><span>我的</span></a>
    </nav>
  </>;
}
